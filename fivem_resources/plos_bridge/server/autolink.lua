--[[
    PLOS Bridge - Auto-Link FiveM Account
    Collega automaticamente l'account PLOS all'identifier FiveM
    quando il player fa login dal tablet in-game.
    
    FLUSSO:
    1. Player apre tablet -> bridge invia identifier al NUI
    2. Player fa login su PLOS -> frontend manda PLOS_LINK_ACCOUNT al NUI
    3. NUI chiama questo callback -> server-side chiama backend PLOS
    4. Backend salva identifier -> notifiche lb-phone sapranno chi notificare
    
    INSTALLAZIONE:
    1. Copia in plos_bridge/server/autolink.lua
    2. Aggiungi "server_script 'server/autolink.lua'" in fxmanifest.lua
]]

-- ============================================
-- CONFIGURAZIONE
-- ============================================

local AutoLink = {
    -- URL del backend PLOS
    apiUrl = Config.API.baseUrl,
    
    -- Chiave segreta (deve combaciare col backend)
    bridgeSecret = "plos-bridge-secret-2026",
    
    -- Cache: evita di re-linkare se già fatto nella sessione
    linkedPlayers = {},
    
    -- Debug
    debug = Config.Debug.enabled,
}

-- ============================================
-- GET PLAYER PRIMARY IDENTIFIER
-- ============================================

local function GetPlayerPrimaryIdentifier(source)
    local identifiers = GetPlayerIdentifiers(source)
    local primary = nil
    
    -- Priorità: license > steam > fivem > discord
    local priority = { "license", "steam", "fivem", "discord" }
    
    for _, prefix in ipairs(priority) do
        for _, id in ipairs(identifiers) do
            if string.sub(id, 1, #prefix + 1) == prefix .. ":" then
                primary = id
                break
            end
        end
        if primary then break end
    end
    
    -- Fallback: primo identifier disponibile
    if not primary and #identifiers > 0 then
        primary = identifiers[1]
    end
    
    return primary
end

-- Raccogliere tutti gli identifiers del player
local function GetAllIdentifiers(source)
    local identifiers = GetPlayerIdentifiers(source)
    local result = {}
    
    for _, id in ipairs(identifiers) do
        local colonPos = string.find(id, ":")
        if colonPos then
            local prefix = string.sub(id, 1, colonPos - 1)
            result[prefix] = id
        end
    end
    
    return result
end

-- ============================================
-- NUI CALLBACK: PLOS_LINK_ACCOUNT
-- Chiamato dal frontend (via NUI) dopo login
-- ============================================

RegisterNUICallback('PLOS_LINK_ACCOUNT', function(data, cb)
    local source = source
    
    -- Il source nel NUI callback è il player che ha inviato il messaggio
    if not source or source <= 0 then
        cb({ success = false, error = "Player source non valido" })
        return
    end
    
    local userId = data.user_id
    local authToken = data.auth_token
    
    if not userId then
        cb({ success = false, error = "user_id mancante" })
        return
    end
    
    -- Controlla se già linkato nella sessione
    if AutoLink.linkedPlayers[source] then
        cb({ success = true, message = "Già collegato in questa sessione" })
        return
    end
    
    -- Ottieni identifier primario
    local identifier = GetPlayerPrimaryIdentifier(source)
    
    if not identifier then
        cb({ success = false, error = "Nessun identifier trovato per il player" })
        return
    end
    
    if AutoLink.debug then
        print('^2[PLOS AutoLink]^0 Collegamento in corso: Player ' .. source .. ' -> User ' .. userId .. ' -> ' .. identifier)
    end
    
    -- Chiama il backend PLOS per salvare l'identifier
    local url = AutoLink.apiUrl .. '/api/auth/link-fivem'
    local body = json.encode({
        user_id = userId,
        fivem_identifier = identifier,
        bridge_secret = AutoLink.bridgeSecret,
    })
    
    PerformHttpRequest(url, function(statusCode, responseText, headers)
        if statusCode == 200 then
            local response = json.decode(responseText)
            
            -- Salva in cache
            AutoLink.linkedPlayers[source] = {
                user_id = userId,
                identifier = identifier,
                linked_at = os.time()
            }
            
            if AutoLink.debug then
                print('^2[PLOS AutoLink]^0 Collegamento riuscito: ' .. identifier .. ' -> User ' .. userId)
            end
            
            cb({ success = true, message = response.message or "Collegato" })
            
            -- Notifica il player in-game
            if GetResourceState('lb-phone') == 'started' then
                pcall(function()
                    exports['lb-phone']:SendNotification(source, {
                        app = "purelifeos",
                        title = "Account Collegato",
                        content = "Il tuo account PURE LIFE OS è stato collegato al tuo personaggio.",
                        icon = "fa-solid fa-link",
                        color = "#00ff9c",
                    })
                end)
            end
        else
            if AutoLink.debug then
                print('^1[PLOS AutoLink]^0 Errore collegamento HTTP ' .. tostring(statusCode) .. ': ' .. tostring(responseText))
            end
            cb({ success = false, error = "Errore server: " .. tostring(statusCode) })
        end
    end, 'POST', body, { ['Content-Type'] = 'application/json' })
end)

-- ============================================
-- NUI CALLBACK: PLOS_GET_LINK_STATUS
-- Controlla se il player è già collegato
-- ============================================

RegisterNUICallback('PLOS_GET_LINK_STATUS', function(data, cb)
    local source = source
    
    if not source or source <= 0 then
        cb({ linked = false })
        return
    end
    
    local identifier = GetPlayerPrimaryIdentifier(source)
    local cached = AutoLink.linkedPlayers[source]
    
    cb({
        linked = cached ~= nil,
        identifier = identifier,
        identifiers = GetAllIdentifiers(source),
        cached_data = cached
    })
end)

-- ============================================
-- PLAYER CONTEXT: Aggiunge identifier ai dati player
-- Sovrascrive/estende PLOS_GET_PLAYER per includere identifier
-- ============================================

RegisterNUICallback('PLOS_GET_PLAYER_EXTENDED', function(data, cb)
    local source = source
    
    if not source or source <= 0 then
        cb({ success = false, error = "Player non valido" })
        return
    end
    
    local identifier = GetPlayerPrimaryIdentifier(source)
    local allIds = GetAllIdentifiers(source)
    local cached = AutoLink.linkedPlayers[source]
    
    cb({
        success = true,
        data = {
            source = source,
            name = GetPlayerName(source),
            identifier = identifier,
            identifiers = allIds,
            linked = cached ~= nil,
            linked_user_id = cached and cached.user_id or nil,
        }
    })
end)

-- ============================================
-- CLEANUP: Rimuovi dalla cache quando il player esce
-- ============================================

AddEventHandler('playerDropped', function(reason)
    local source = source
    AutoLink.linkedPlayers[source] = nil
end)

-- ============================================
-- AUTO-LINK ON TABLET OPEN
-- Quando il tablet si apre, invia l'identifier al NUI
-- così il frontend può usarlo per il collegamento automatico
-- ============================================

-- Questo viene gestito dal client.lua originale che invia
-- playerData all'apertura. Aggiungiamo l'identifier.
RegisterNetEvent('plos:server:getPlayerForNUI', function()
    local source = source
    local identifier = GetPlayerPrimaryIdentifier(source)
    local allIds = GetAllIdentifiers(source)
    
    TriggerClientEvent('plos:client:playerDataForNUI', source, {
        identifier = identifier,
        identifiers = allIds,
        linked = AutoLink.linkedPlayers[source] ~= nil,
    })
end)

print('^2[PLOS AutoLink]^0 Sistema auto-link caricato')
