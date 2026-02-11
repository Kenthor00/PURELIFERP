--[[
    PLOS Bridge - Client NUI Callbacks
    Gestione comunicazione NUI -> Client -> Server
]]

-- ============================================
-- NUI CALLBACK: PLOS_GET_PLAYER
-- Restituisce dati del player
-- ============================================

RegisterNUICallback('PLOS_GET_PLAYER', function(data, cb)
    if not CheckRateLimit('PLOS_GET_PLAYER') then
        cb({ success = false, error = 'Rate limit exceeded' })
        return
    end
    
    if Config.Debug.logNuiCallbacks then
        PLOS.Utils.Debug('NUI Callback: PLOS_GET_PLAYER')
    end
    
    local playerData = GetPlayerData()
    
    if playerData then
        cb({
            success = true,
            data = playerData
        })
    else
        cb({
            success = false,
            error = 'Player data not available'
        })
    end
end)

-- ============================================
-- NUI CALLBACK: PLOS_SET_WAYPOINT
-- Imposta waypoint sulla mappa
-- ============================================

RegisterNUICallback('PLOS_SET_WAYPOINT', function(data, cb)
    if not CheckRateLimit('PLOS_SET_WAYPOINT') then
        cb({ success = false, error = 'Rate limit exceeded' })
        return
    end
    
    if Config.Debug.logNuiCallbacks then
        PLOS.Utils.Debug('NUI Callback: PLOS_SET_WAYPOINT', data.x, data.y)
    end
    
    -- Validazione coordinate
    local x = tonumber(data.x)
    local y = tonumber(data.y)
    
    if not PLOS.Utils.ValidateCoords(x, y) then
        PLOS.Utils.Warn('Coordinate waypoint non valide:', data.x, data.y)
        cb({ success = false, error = 'Invalid coordinates' })
        return
    end
    
    -- Rimuovi waypoint esistente
    SetWaypointOff()
    
    -- Imposta nuovo waypoint
    SetNewWaypoint(x, y)
    
    -- Notifica
    ShowNotification('Waypoint impostato', PLOS.NotifyTypes.SUCCESS)
    
    cb({ success = true })
end)

-- ============================================
-- NUI CALLBACK: PLOS_NOTIFY
-- Mostra notifica in-game
-- ============================================

RegisterNUICallback('PLOS_NOTIFY', function(data, cb)
    if not CheckRateLimit('PLOS_NOTIFY') then
        cb({ success = false, error = 'Rate limit exceeded' })
        return
    end
    
    if Config.Debug.logNuiCallbacks then
        PLOS.Utils.Debug('NUI Callback: PLOS_NOTIFY', data.title, data.message)
    end
    
    -- Validazione
    local title = PLOS.Utils.SanitizeString(data.title or '')
    local message = PLOS.Utils.SanitizeString(data.message or '')
    local type = data.type or PLOS.NotifyTypes.INFO
    
    if not PLOS.Utils.IsValidString(message) then
        cb({ success = false, error = 'Invalid message' })
        return
    end
    
    -- Mappa tipo notifica
    local validTypes = {
        success = PLOS.NotifyTypes.SUCCESS,
        error = PLOS.NotifyTypes.ERROR,
        info = PLOS.NotifyTypes.INFO,
        warning = PLOS.NotifyTypes.WARNING,
    }
    
    local notifyType = validTypes[type] or PLOS.NotifyTypes.INFO
    
    -- Mostra notifica
    if Config.Notifications.provider == 'ox_lib' then
        lib.notify({
            title = title,
            description = message,
            type = notifyType,
            position = Config.Notifications.position,
            duration = data.duration or Config.Notifications.duration,
        })
    else
        ShowNotification(title .. ': ' .. message, notifyType)
    end
    
    cb({ success = true })
end)

-- ============================================
-- NUI CALLBACK: PLOS_HANDSHAKE
-- Richiesta handshake per autenticazione
-- ============================================

RegisterNUICallback('PLOS_HANDSHAKE', function(data, cb)
    if not CheckRateLimit('PLOS_HANDSHAKE') then
        cb({ success = false, error = 'Rate limit exceeded' })
        return
    end
    
    if Config.Debug.logNuiCallbacks then
        PLOS.Utils.Debug('NUI Callback: PLOS_HANDSHAKE')
    end
    
    if not Config.API.enableHandshake then
        cb({ success = false, error = 'Handshake disabled' })
        return
    end
    
    -- Richiedi codice handshake al server
    TriggerServerEvent(PLOS.Events.REQUEST_HANDSHAKE)
    
    -- Il risultato arriverà tramite evento HANDSHAKE_RESPONSE
    -- che invierà HANDSHAKE_RESULT alla NUI
    cb({ success = true, pending = true })
end)

-- ============================================
-- NUI CALLBACK: PLOS_CLOSE
-- Chiusura PLOS dalla NUI
-- ============================================

RegisterNUICallback('PLOS_CLOSE', function(data, cb)
    if Config.Debug.logNuiCallbacks then
        PLOS.Utils.Debug('NUI Callback: PLOS_CLOSE')
    end
    
    ClosePLOS()
    
    cb({ success = true })
end)

-- ============================================
-- NUI CALLBACK: PLOS_READY
-- Conferma che la NUI è pronta
-- ============================================

RegisterNUICallback('PLOS_READY', function(data, cb)
    if Config.Debug.logNuiCallbacks then
        PLOS.Utils.Debug('NUI Callback: PLOS_READY')
    end
    
    -- Se handshake abilitato, avvialo automaticamente
    if Config.API.enableHandshake then
        TriggerServerEvent(PLOS.Events.REQUEST_HANDSHAKE)
    end
    
    cb({ success = true })
end)

-- ============================================
-- NUI CALLBACK: PLOS_OPEN_MAP
-- Apre la mappa di gioco
-- ============================================

RegisterNUICallback('PLOS_OPEN_MAP', function(data, cb)
    if not CheckRateLimit('PLOS_OPEN_MAP') then
        cb({ success = false, error = 'Rate limit exceeded' })
        return
    end
    
    -- Apri pausa menu sulla mappa
    ActivateFrontendMenu(GetHashKey('FE_MENU_VERSION_MP_PAUSE'), false, 0)
    
    -- Vai alla tab mappa
    SetFrontendActive(false)
    Citizen.Wait(100)
    SetPauseMenuActive(true)
    
    cb({ success = true })
end)

-- ============================================
-- NUI CALLBACK: PLOS_GET_POSITION
-- Restituisce posizione attuale del player
-- ============================================

RegisterNUICallback('PLOS_GET_POSITION', function(data, cb)
    if not CheckRateLimit('PLOS_GET_POSITION') then
        cb({ success = false, error = 'Rate limit exceeded' })
        return
    end
    
    local ped = PlayerPedId()
    local coords = GetEntityCoords(ped)
    local heading = GetEntityHeading(ped)
    
    cb({
        success = true,
        data = {
            x = coords.x,
            y = coords.y,
            z = coords.z,
            heading = heading,
        }
    })
end)

-- ============================================
-- NUI CALLBACK: PLOS_GET_STREET
-- Restituisce nome strada attuale
-- ============================================

RegisterNUICallback('PLOS_GET_STREET', function(data, cb)
    if not CheckRateLimit('PLOS_GET_STREET') then
        cb({ success = false, error = 'Rate limit exceeded' })
        return
    end
    
    local ped = PlayerPedId()
    local coords = GetEntityCoords(ped)
    
    local street, crossing = GetStreetNameAtCoord(coords.x, coords.y, coords.z)
    local streetName = GetStreetNameFromHashKey(street)
    local crossingName = GetStreetNameFromHashKey(crossing)
    
    local zoneName = GetNameOfZone(coords.x, coords.y, coords.z)
    local zoneLabel = GetLabelText(zoneName)
    
    cb({
        success = true,
        data = {
            street = streetName,
            crossing = crossingName ~= '' and crossingName or nil,
            zone = zoneLabel ~= 'NULL' and zoneLabel or zoneName,
        }
    })
end)

-- ============================================
-- NUI CALLBACK: PLOS_COPY_TO_CLIPBOARD
-- Copia testo negli appunti (limitato)
-- ============================================

RegisterNUICallback('PLOS_COPY_TO_CLIPBOARD', function(data, cb)
    if not CheckRateLimit('PLOS_COPY_TO_CLIPBOARD') then
        cb({ success = false, error = 'Rate limit exceeded' })
        return
    end
    
    -- La copia effettiva è gestita lato JS
    -- Questo callback serve solo per logging/validazione
    local text = PLOS.Utils.SanitizeString(data.text or '')
    
    if Config.Debug.logNuiCallbacks then
        PLOS.Utils.Debug('NUI Callback: PLOS_COPY_TO_CLIPBOARD', #text, 'chars')
    end
    
    cb({ success = true })
end)

-- ============================================
-- GENERIC FALLBACK CALLBACK
-- Per callbacks non riconosciuti
-- ============================================

RegisterNUICallback('default', function(data, cb)
    PLOS.Utils.Warn('NUI Callback non riconosciuto:', json.encode(data))
    cb({ success = false, error = 'Unknown callback' })
end)
