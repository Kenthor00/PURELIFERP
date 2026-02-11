--[[
    PLOS Bridge - Client Main
    Gestione principale lato client
]]

-- State
local isOpen = false
local currentMode = nil -- 'tablet' | 'phone'
local playerData = nil
local Framework = nil

-- Rate limiting
local rateLimitCalls = {}
local rateLimitWindow = Config.Security.rateLimit.windowSeconds * 1000

-- ============================================
-- FRAMEWORK DETECTION & INITIALIZATION
-- ============================================

local function DetectFramework()
    if Config.Framework.force ~= 'auto' then
        if Config.Framework.force == 'esx' then
            Framework = exports[Config.Framework.esxExport]:getSharedObject()
            PLOS.Utils.Debug('Framework forzato: ESX')
            return 'esx'
        elseif Config.Framework.force == 'qb' then
            Framework = exports[Config.Framework.qbExport]:GetCoreObject()
            PLOS.Utils.Debug('Framework forzato: QBCore')
            return 'qb'
        end
    end
    
    -- Auto-detect
    if GetResourceState(Config.Framework.esxExport) == 'started' then
        Framework = exports[Config.Framework.esxExport]:getSharedObject()
        PLOS.Utils.Debug('Framework rilevato: ESX')
        return 'esx'
    elseif GetResourceState(Config.Framework.qbExport) == 'started' then
        Framework = exports[Config.Framework.qbExport]:GetCoreObject()
        PLOS.Utils.Debug('Framework rilevato: QBCore')
        return 'qb'
    end
    
    PLOS.Utils.Error('Nessun framework rilevato!')
    return nil
end

local frameworkType = nil

CreateThread(function()
    -- Attendi caricamento risorse
    while not NetworkIsPlayerActive(PlayerId()) do
        Wait(100)
    end
    
    frameworkType = DetectFramework()
    
    if not frameworkType then
        PLOS.Utils.Error('Impossibile inizializzare PLOS Bridge - Framework non trovato')
        return
    end
    
    -- Registra item ox_inventory
    RegisterOxInventoryItem()
    
    -- Registra keybinds
    RegisterKeybinds()
    
    PLOS.Utils.Debug('PLOS Bridge inizializzato con framework:', frameworkType)
end)

-- ============================================
-- OX_INVENTORY ITEM REGISTRATION
-- ============================================

local function RegisterOxInventoryItem()
    if GetResourceState('ox_inventory') ~= 'started' then
        PLOS.Utils.Warn('ox_inventory non trovato, item tablet non registrato')
        return
    end
    
    exports.ox_inventory:displayMetadata({
        plos_registered = 'PLOS Bridge',
    })
    
    PLOS.Utils.Debug('Item tablet registrato con ox_inventory')
end

-- Handler per uso item
exports.ox_inventory:registerHook('usingItem', function(payload)
    if payload.name == Config.Tablet.itemName then
        -- Previeni uso multiplo
        if isOpen then
            ShowNotification('PURE LIFE OS è già aperto', PLOS.NotifyTypes.WARNING)
            return false
        end
        
        -- Apri tablet
        TriggerEvent(PLOS.Events.OPEN_TABLET)
        return true
    end
end, {
    itemName = Config.Tablet.itemName,
})

-- ============================================
-- KEYBINDS
-- ============================================

local function RegisterKeybinds()
    -- Keybind chiusura
    if Config.Keybinds.enableCloseKey then
        RegisterKeyMapping('+plos_close', 'Chiudi PURE LIFE OS', 'keyboard', Config.Keybinds.closeKey)
        RegisterCommand('+plos_close', function()
            if isOpen then
                ClosePLOS()
            end
        end, false)
        RegisterCommand('-plos_close', function() end, false)
    end
    
    -- Keybind apertura rapida
    if Config.Keybinds.enableQuickOpen then
        RegisterKeyMapping('+plos_quick', 'Apri PURE LIFE OS', 'keyboard', Config.Keybinds.quickOpenKey)
        RegisterCommand('+plos_quick', function()
            if not isOpen then
                -- Controlla se ha il tablet
                local hasTablet = exports.ox_inventory:Search('count', Config.Tablet.itemName) > 0
                if hasTablet then
                    TriggerEvent(PLOS.Events.OPEN_TABLET)
                else
                    ShowNotification('Non hai un tablet', PLOS.NotifyTypes.ERROR)
                end
            else
                ClosePLOS()
            end
        end, false)
        RegisterCommand('-plos_quick', function() end, false)
    end
end

-- ============================================
-- PLAYER DATA
-- ============================================

local function GetPlayerData()
    local data = {
        identifier = nil,
        name = nil,
        job = nil,
        jobLabel = nil,
        grade = nil,
        gradeLabel = nil,
        duty = true,
    }
    
    if frameworkType == 'esx' then
        local pd = Framework.GetPlayerData()
        if pd then
            data.identifier = pd.identifier
            data.name = pd.firstName and pd.lastName 
                and (pd.firstName .. ' ' .. pd.lastName) 
                or GetPlayerName(PlayerId())
            data.job = pd.job and pd.job.name or 'unemployed'
            data.jobLabel = pd.job and pd.job.label or 'Disoccupato'
            data.grade = pd.job and pd.job.grade or 0
            data.gradeLabel = pd.job and pd.job.grade_label or 'Nessuno'
            -- ESX non ha duty di default, check se esiste
            if pd.job and pd.job.onDuty ~= nil then
                data.duty = pd.job.onDuty
            end
        end
    elseif frameworkType == 'qb' then
        local pd = Framework.Functions.GetPlayerData()
        if pd then
            data.identifier = pd.citizenid
            data.name = pd.charinfo and (pd.charinfo.firstname .. ' ' .. pd.charinfo.lastname)
                or GetPlayerName(PlayerId())
            data.job = pd.job and pd.job.name or 'unemployed'
            data.jobLabel = pd.job and pd.job.label or 'Disoccupato'
            data.grade = pd.job and pd.job.grade and pd.job.grade.level or 0
            data.gradeLabel = pd.job and pd.job.grade and pd.job.grade.name or 'Nessuno'
            data.duty = pd.job and pd.job.onduty or false
        end
    end
    
    return data
end

-- ============================================
-- RATE LIMITING
-- ============================================

local function CheckRateLimit(action)
    local now = GetGameTimer()
    local key = action
    
    -- Pulisci vecchie entries
    if rateLimitCalls[key] then
        local validCalls = {}
        for _, timestamp in ipairs(rateLimitCalls[key]) do
            if now - timestamp < rateLimitWindow then
                table.insert(validCalls, timestamp)
            end
        end
        rateLimitCalls[key] = validCalls
    else
        rateLimitCalls[key] = {}
    end
    
    -- Controlla limite
    if #rateLimitCalls[key] >= Config.Security.rateLimit.maxCalls then
        PLOS.Utils.Warn('Rate limit raggiunto per:', action)
        if Config.Security.logSuspiciousActivity then
            TriggerServerEvent(PLOS.Events.LOG_ACTION, 'RATE_LIMIT_HIT', action)
        end
        return false
    end
    
    -- Aggiungi chiamata
    table.insert(rateLimitCalls[key], now)
    return true
end

-- ============================================
-- NOTIFICATIONS
-- ============================================

function ShowNotification(message, type)
    type = type or PLOS.NotifyTypes.INFO
    
    if Config.Notifications.provider == 'ox_lib' then
        lib.notify({
            title = 'PURE LIFE OS',
            description = message,
            type = type,
            position = Config.Notifications.position,
            duration = Config.Notifications.duration,
        })
    elseif Config.Notifications.provider == 'esx' and frameworkType == 'esx' then
        Framework.ShowNotification(message)
    elseif Config.Notifications.provider == 'qb' and frameworkType == 'qb' then
        Framework.Functions.Notify(message, type)
    else
        -- Native
        BeginTextCommandThefeedPost('STRING')
        AddTextComponentSubstringPlayerName(message)
        EndTextCommandThefeedPostTicker(false, false)
    end
end

-- ============================================
-- OPEN / CLOSE PLOS
-- ============================================

function OpenPLOS(mode)
    if isOpen then
        PLOS.Utils.Debug('PLOS già aperto, ignorato')
        return false
    end
    
    if not PLOS.Utils.ValidateMode(mode) then
        PLOS.Utils.Error('Modalità non valida:', mode)
        return false
    end
    
    isOpen = true
    currentMode = mode
    playerData = GetPlayerData()
    
    -- Costruisci URL
    local url
    if Config.UI.mode == 'external' then
        url = Config.UI.externalUrl .. '?mode=' .. mode
    else
        url = Config.UI.localUrl
    end
    
    -- Invia a NUI
    SendNUIMessage({
        action = 'OPEN_PLOS',
        mode = mode,
        url = url,
        playerData = playerData,
        config = {
            enableHandshake = Config.API.enableHandshake,
            apiBaseUrl = Config.API.baseUrl,
        }
    })
    
    SetNuiFocus(true, true)
    
    -- Applica effetti in base alla modalità
    if mode == 'tablet' then
        StartTabletMode()
    elseif mode == 'phone' then
        StartPhoneMode()
    end
    
    PLOS.Utils.Debug('PLOS aperto in modalità:', mode)
    return true
end

function ClosePLOS()
    if not isOpen then
        return false
    end
    
    -- Rimuovi effetti in base alla modalità
    if currentMode == 'tablet' then
        StopTabletMode()
    elseif currentMode == 'phone' then
        StopPhoneMode()
    end
    
    SendNUIMessage({
        action = 'CLOSE_PLOS'
    })
    
    SetNuiFocus(false, false)
    
    isOpen = false
    currentMode = nil
    playerData = nil
    
    PLOS.Utils.Debug('PLOS chiuso')
    return true
end

-- ============================================
-- MODE-SPECIFIC FUNCTIONS
-- ============================================

function StartTabletMode()
    -- Animazione e prop gestiti da client/anim.lua
    StartTabletAnimation()
    
    if Config.Tablet.disableControls then
        -- Disabilita controlli in thread separato
        CreateThread(function()
            while isOpen and currentMode == 'tablet' do
                DisableAllControlActions(0)
                -- Permetti solo mouse per NUI
                EnableControlAction(0, 1, true) -- LookLeftRight
                EnableControlAction(0, 2, true) -- LookUpDown
                EnableControlAction(0, 106, true) -- VehicleMouseControlOverride
                Wait(0)
            end
        end)
    end
end

function StopTabletMode()
    StopTabletAnimation()
end

function StartPhoneMode()
    -- Nessuna animazione per phone mode
    -- Solo focus NUI
    PLOS.Utils.Debug('Phone mode avviato')
end

function StopPhoneMode()
    PLOS.Utils.Debug('Phone mode terminato')
end

-- ============================================
-- EXPORTS
-- ============================================

exports('OpenPLOS', OpenPLOS)
exports('OpenPLOSTablet', function() return OpenPLOS('tablet') end)
exports('OpenPLOSPhone', function() return OpenPLOS('phone') end)
exports('ClosePLOS', ClosePLOS)
exports('IsOpen', function() return isOpen end)
exports('GetCurrentMode', function() return currentMode end)

-- ============================================
-- EVENTS
-- ============================================

-- Evento apertura tablet
RegisterNetEvent(PLOS.Events.OPEN_TABLET, function()
    OpenPLOS('tablet')
end)

-- Evento apertura phone
RegisterNetEvent(PLOS.Events.OPEN_PHONE, function()
    OpenPLOS('phone')
end)

-- Evento chiusura
RegisterNetEvent(PLOS.Events.CLOSE, function()
    ClosePLOS()
end)

-- Push notification dall'esterno
RegisterNetEvent(PLOS.Events.PUSH_NOTIFICATION, function(data)
    if isOpen then
        SendNUIMessage({
            action = 'PUSH_NOTIFICATION',
            payload = data
        })
    end
end)

-- Refresh player context
RegisterNetEvent(PLOS.Events.REFRESH_PLAYER, function()
    if isOpen then
        playerData = GetPlayerData()
        SendNUIMessage({
            action = 'PLAYER_CONTEXT_UPDATED',
            payload = playerData
        })
    end
end)

-- Handshake response dal server
RegisterNetEvent(PLOS.Events.HANDSHAKE_RESPONSE, function(success, data)
    SendNUIMessage({
        action = 'HANDSHAKE_RESULT',
        success = success,
        data = data
    })
end)

-- ============================================
-- RESOURCE CLEANUP
-- ============================================

AddEventHandler('onResourceStop', function(resourceName)
    if resourceName ~= GetCurrentResourceName() then return end
    
    if isOpen then
        ClosePLOS()
    end
end)
