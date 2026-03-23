--[[
    PLOS Bridge - lb-phone Notification Poller
    Interroga il backend PLOS per notifiche in coda e le invia
    tramite lb-phone SendNotification.
    
    INSTALLAZIONE:
    1. Copia questo file in plos_bridge/server/lbphone.lua
    2. Aggiungi "server_script 'server/lbphone.lua'" in fxmanifest.lua
    3. Configura BRIDGE_SECRET uguale a quello nel backend .env
]]

-- ============================================
-- CONFIGURAZIONE
-- ============================================

local LBPhone = {
    -- URL del backend PLOS (uguale a Config.API.baseUrl)
    apiUrl = "https://api.pureliferp.it",
    
    -- Chiave segreta per autenticazione (deve combaciare col backend)
    bridgeSecret = "plos-bridge-secret-2026",
    
    -- Intervallo di polling in millisecondi (5 secondi)
    pollInterval = 5000,
    
    -- Abilita/disabilita il sistema
    enabled = true,
    
    -- Debug mode
    debug = false,
}

-- ============================================
-- IDENTIFIER MAPPING
-- Mappa identifier -> server source
-- ============================================

local playerIdentifiers = {}

-- Aggiorna la mappa quando un player entra
AddEventHandler('playerConnecting', function(name, setKickReason, deferrals)
    local src = source
    Wait(0) -- Attendi che i dati del player siano disponibili
    
    local identifiers = GetPlayerIdentifiers(src)
    for _, id in ipairs(identifiers) do
        playerIdentifiers[id] = src
    end
    
    -- Salva anche per user_id se disponibile
    playerIdentifiers["user:" .. tostring(src)] = src
end)

-- Rimuovi quando un player esce
AddEventHandler('playerDropped', function(reason)
    local src = source
    local identifiers = GetPlayerIdentifiers(src)
    for _, id in ipairs(identifiers) do
        playerIdentifiers[id] = nil
    end
end)

-- Funzione per trovare il source di un player da identifier
local function FindPlayerSource(identifier)
    -- Cerca direttamente nella mappa
    if playerIdentifiers[identifier] then
        return playerIdentifiers[identifier]
    end
    
    -- Se e' un user:ID, cerca nel db locale o skip
    if string.sub(identifier, 1, 5) == "user:" then
        return nil -- Non possiamo risolvere user_id -> source senza DB
    end
    
    -- Cerca tra tutti i player online
    local players = GetPlayers()
    for _, playerId in ipairs(players) do
        local ids = GetPlayerIdentifiers(tonumber(playerId))
        for _, id in ipairs(ids) do
            if id == identifier then
                playerIdentifiers[identifier] = tonumber(playerId)
                return tonumber(playerId)
            end
        end
    end
    
    return nil
end

-- ============================================
-- lb-phone NOTIFICATION SENDER
-- ============================================

local function SendLBPhoneNotification(source, data)
    -- Verifica che lb-phone sia disponibile
    if GetResourceState('lb-phone') ~= 'started' then
        if LBPhone.debug then
            print('^1[PLOS lb-phone]^0 lb-phone non avviato, skip notifica')
        end
        return false
    end
    
    -- Formato notifica lb-phone
    local notification = {
        app = data.app or "purelifeos",
        title = data.title or "PURE LIFE OS",
        content = data.message or "",
        icon = data.icon or "fa-solid fa-building-columns",
        color = data.color or "#00ff9c",
        sound = data.sound ~= false,
    }
    
    -- Invia tramite export lb-phone
    local success, err = pcall(function()
        exports['lb-phone']:SendNotification(source, notification)
    end)
    
    if not success then
        print('^1[PLOS lb-phone]^0 Errore invio notifica:', err)
        return false
    end
    
    if LBPhone.debug then
        print('^2[PLOS lb-phone]^0 Notifica inviata a player ' .. source .. ': ' .. data.title)
    end
    
    return true
end

-- ============================================
-- POLLING LOOP
-- ============================================

CreateThread(function()
    if not LBPhone.enabled then
        print('^3[PLOS lb-phone]^0 Sistema notifiche lb-phone DISABILITATO')
        return
    end
    
    print('^2[PLOS lb-phone]^0 Sistema notifiche lb-phone AVVIATO')
    print('^2[PLOS lb-phone]^0 Polling ogni ' .. (LBPhone.pollInterval / 1000) .. ' secondi')
    
    -- Attendi avvio completo del server
    Wait(10000)
    
    while true do
        Wait(LBPhone.pollInterval)
        
        -- Fetch notifiche pendenti dal backend
        local url = LBPhone.apiUrl .. '/api/lbphone/notifications/pending?secret=' .. LBPhone.bridgeSecret .. '&limit=20'
        
        PerformHttpRequest(url, function(statusCode, responseText, headers)
            if statusCode ~= 200 then
                if LBPhone.debug then
                    print('^1[PLOS lb-phone]^0 Errore polling: HTTP ' .. tostring(statusCode))
                end
                return
            end
            
            local data = json.decode(responseText)
            if not data or not data.notifications or data.count == 0 then
                return
            end
            
            if LBPhone.debug then
                print('^2[PLOS lb-phone]^0 Ricevute ' .. data.count .. ' notifiche pendenti')
            end
            
            local sentIds = {}
            
            for _, notif in ipairs(data.notifications) do
                local targetSource = FindPlayerSource(notif.target_identifier)
                
                if targetSource then
                    local sent = SendLBPhoneNotification(targetSource, notif)
                    if sent then
                        table.insert(sentIds, notif.id)
                    end
                else
                    -- Player non online, segna comunque come "inviata" per evitare accumulo
                    -- In alternativa, si puo' implementare un retry con TTL
                    table.insert(sentIds, notif.id)
                    
                    if LBPhone.debug then
                        print('^3[PLOS lb-phone]^0 Player non online per notifica ' .. notif.id)
                    end
                end
            end
            
            -- Segna le notifiche come inviate
            if #sentIds > 0 then
                local markUrl = LBPhone.apiUrl .. '/api/lbphone/notifications/mark-sent?secret=' .. LBPhone.bridgeSecret
                local body = json.encode({ ids = sentIds })
                
                PerformHttpRequest(markUrl, function(sc, rt, h)
                    if LBPhone.debug and sc == 200 then
                        print('^2[PLOS lb-phone]^0 Marcate ' .. #sentIds .. ' notifiche come inviate')
                    end
                end, 'POST', body, { ['Content-Type'] = 'application/json' })
            end
            
        end, 'GET', '', { ['Content-Type'] = 'application/json' })
    end
end)

-- ============================================
-- EXPORT: Invio diretto notifica a player
-- ============================================

-- Export per altri script FiveM che vogliono inviare notifiche PLOS
exports('SendPLOSNotification', function(source, title, message, icon, color)
    return SendLBPhoneNotification(source, {
        title = title,
        message = message,
        icon = icon or "fa-solid fa-building-columns",
        color = color or "#00ff9c",
    })
end)

print('^2[PLOS lb-phone]^0 Modulo lb-phone caricato')
