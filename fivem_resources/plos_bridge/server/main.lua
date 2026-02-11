--[[
    PLOS Bridge - Server Main
    Gestione handshake, logging e comunicazione API
]]

-- Handshake codes storage
-- { [code] = { source, identifier, expiry } }
local handshakeCodes = {}

-- Rate limiting per player
local playerRateLimits = {}

-- ============================================
-- RATE LIMITING
-- ============================================

local function CheckServerRateLimit(source, action)
    local key = tostring(source) .. ':' .. action
    local now = os.time()
    local windowSeconds = Config.Security.rateLimit.windowSeconds
    local maxCalls = Config.Security.rateLimit.maxCalls
    
    if not playerRateLimits[key] then
        playerRateLimits[key] = { calls = {}, lastClean = now }
    end
    
    local limit = playerRateLimits[key]
    
    -- Pulisci vecchi record ogni 60 secondi
    if now - limit.lastClean > 60 then
        local validCalls = {}
        for _, timestamp in ipairs(limit.calls) do
            if now - timestamp < windowSeconds then
                table.insert(validCalls, timestamp)
            end
        end
        limit.calls = validCalls
        limit.lastClean = now
    end
    
    -- Check limite
    if #limit.calls >= maxCalls then
        return false
    end
    
    table.insert(limit.calls, now)
    return true
end

-- ============================================
-- HANDSHAKE SYSTEM
-- ============================================

-- Pulisci codici scaduti periodicamente
CreateThread(function()
    while true do
        Wait(30000) -- Ogni 30 secondi
        
        local now = os.time()
        local expired = {}
        
        for code, data in pairs(handshakeCodes) do
            if now > data.expiry then
                table.insert(expired, code)
            end
        end
        
        for _, code in ipairs(expired) do
            handshakeCodes[code] = nil
            PLOS.Utils.Debug('Codice handshake scaduto rimosso')
        end
    end
end)

-- Genera codice handshake
local function GenerateHandshakeCode(source)
    local identifier = PLOS.Server.GetIdentifier(source)
    if not identifier then
        return nil, 'Player not found'
    end
    
    -- Genera codice univoco
    local code = PLOS.Utils.GenerateCode(32)
    local expiry = os.time() + Config.API.handshakeCodeTTL
    
    -- Salva codice
    handshakeCodes[code] = {
        source = source,
        identifier = identifier,
        expiry = expiry,
        used = false,
    }
    
    PLOS.Utils.Debug('Generato codice handshake per player:', source)
    
    return code, nil
end

-- Valida codice handshake (chiamato dall'API backend)
local function ValidateHandshakeCode(code)
    local data = handshakeCodes[code]
    
    if not data then
        return nil, 'Invalid code'
    end
    
    if os.time() > data.expiry then
        handshakeCodes[code] = nil
        return nil, 'Code expired'
    end
    
    if data.used then
        return nil, 'Code already used'
    end
    
    -- Marca come usato
    data.used = true
    
    -- Raccogli dati player
    local playerData = PLOS.Server.GetFullPlayerData(data.source)
    
    -- Rimuovi codice dopo uso
    handshakeCodes[code] = nil
    
    return playerData, nil
end

-- ============================================
-- EVENT HANDLERS
-- ============================================

-- Richiesta handshake dal client
RegisterNetEvent(PLOS.Events.REQUEST_HANDSHAKE, function()
    local source = source
    
    if not CheckServerRateLimit(source, 'handshake') then
        TriggerClientEvent(PLOS.Events.HANDSHAKE_RESPONSE, source, false, {
            error = 'Rate limit exceeded'
        })
        return
    end
    
    local code, err = GenerateHandshakeCode(source)
    
    if not code then
        TriggerClientEvent(PLOS.Events.HANDSHAKE_RESPONSE, source, false, {
            error = err
        })
        return
    end
    
    -- Invia codice al client che lo passerà alla NUI
    TriggerClientEvent(PLOS.Events.HANDSHAKE_RESPONSE, source, true, {
        code = code,
        endpoint = Config.API.baseUrl .. Config.API.handshakeEndpoint,
        expiry = Config.API.handshakeCodeTTL,
    })
end)

-- Log azioni dal client
RegisterNetEvent(PLOS.Events.LOG_ACTION, function(action, details)
    local source = source
    local identifier = PLOS.Server.GetIdentifier(source)
    
    if Config.Security.logSuspiciousActivity then
        PLOS.Utils.Warn('Azione sospetta - Player:', source, 'ID:', identifier, 'Action:', action, 'Details:', details)
    end
end)

-- ============================================
-- HTTP CALLBACK PER VALIDAZIONE HANDSHAKE
-- (chiamato dal backend PLOS)
-- ============================================

-- Endpoint per validare codice handshake
-- Il backend PLOS chiamerà questo endpoint
RegisterHttpHandler('/plos/validate-handshake', function(req, res)
    if req.method ~= 'POST' then
        res.send(json.encode({ success = false, error = 'Method not allowed' }))
        return
    end
    
    local body = req.body
    if type(body) == 'string' then
        body = json.decode(body)
    end
    
    if not body or not body.code then
        res.send(json.encode({ success = false, error = 'Missing code' }))
        return
    end
    
    local playerData, err = ValidateHandshakeCode(body.code)
    
    if not playerData then
        res.send(json.encode({ success = false, error = err }))
        return
    end
    
    res.send(json.encode({
        success = true,
        data = playerData
    }))
end)

-- ============================================
-- ITEM USE CALLBACK (ox_inventory server-side)
-- ============================================

if GetResourceState('ox_inventory') == 'started' then
    exports.ox_inventory:registerHook('usingItem', function(payload)
        local source = payload.source
        
        if payload.name == Config.Tablet.itemName then
            -- Verifica che player possa usare tablet
            -- (es. non in vehicle, non morto, etc.)
            local ped = GetPlayerPed(source)
            
            if not ped or ped == 0 then
                return false
            end
            
            -- Log utilizzo
            if Config.Debug.enabled then
                PLOS.Utils.Debug('Player', source, 'usa tablet')
            end
            
            return true
        end
    end, {
        itemName = Config.Tablet.itemName,
    })
end

-- ============================================
-- SERVER EXPORTS
-- ============================================

-- Export per validazione handshake (per altri script)
exports('ValidateHandshakeCode', ValidateHandshakeCode)

-- Export per generare codice (per altri script)
exports('GenerateHandshakeCode', GenerateHandshakeCode)

-- ============================================
-- PUSH NOTIFICATION A PLAYER
-- ============================================

---@param source number
---@param data table { title, message, type }
function PLOS.Server.PushNotification(source, data)
    TriggerClientEvent(PLOS.Events.PUSH_NOTIFICATION, source, data)
end

exports('PushNotification', PLOS.Server.PushNotification)

-- Push a tutti i player con PLOS aperto
function PLOS.Server.BroadcastNotification(data)
    TriggerClientEvent(PLOS.Events.PUSH_NOTIFICATION, -1, data)
end

exports('BroadcastNotification', PLOS.Server.BroadcastNotification)

-- ============================================
-- RESOURCE START
-- ============================================

AddEventHandler('onResourceStart', function(resourceName)
    if resourceName ~= GetCurrentResourceName() then return end
    
    print('^2[PLOS Bridge]^0 Resource avviata')
    print('^2[PLOS Bridge]^0 Framework:', PLOS.Server.GetFrameworkType() or 'In attesa...')
    print('^2[PLOS Bridge]^0 UI Mode:', Config.UI.mode)
    print('^2[PLOS Bridge]^0 API URL:', Config.API.baseUrl)
end)
