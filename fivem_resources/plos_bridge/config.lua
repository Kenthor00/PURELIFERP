--[[
    PLOS Bridge - Configurazione
    Modifica questi valori in base al tuo setup
]]

Config = {}

-- ============================================
-- UI CONFIGURATION
-- ============================================
Config.UI = {
    -- Modalità UI: 'external' (URL remoto) o 'local' (file locali)
    mode = 'external',
    
    -- URL del PURE LIFE OS (modalità external)
    -- Cambia con il tuo dominio
    externalUrl = 'https://purelife-os.example.com',
    
    -- URL locale (modalità local) - usa file html/
    localUrl = 'html/index.html',
    
    -- Timeout apertura UI (ms)
    openTimeout = 5000,
    
    -- Abilita animazioni di transizione
    enableTransitions = true,
}

-- ============================================
-- API CONFIGURATION
-- ============================================
Config.API = {
    -- URL base API backend
    baseUrl = 'https://purelife-os.example.com',
    
    -- Endpoint handshake per autenticazione NUI
    handshakeEndpoint = '/api/nui/handshake',
    
    -- Abilita handshake automatico all'apertura
    enableHandshake = true,
    
    -- Timeout richieste API (ms)
    requestTimeout = 10000,
    
    -- Durata codice handshake (secondi)
    handshakeCodeTTL = 60,
}

-- ============================================
-- TABLET CONFIGURATION
-- ============================================
Config.Tablet = {
    -- Nome item in ox_inventory
    itemName = 'tablet',
    
    -- Modello prop tablet
    propModel = 'prop_cs_tablet',
    
    -- Bone per attach
    bone = 60309, -- SKEL_R_Hand
    
    -- Offset posizione prop
    offset = {
        x = 0.03,
        y = 0.002,
        z = -0.0,
        rx = 10.0,
        ry = 160.0,
        rz = 0.0,
    },
    
    -- Animazione
    animation = {
        dict = 'amb@world_human_seat_wall_tablet@female@base',
        name = 'base',
        flag = 49,
    },
    
    -- Permetti movimento durante uso tablet
    allowMovement = false,
    
    -- Disabilita controlli durante uso
    disableControls = true,
}

-- ============================================
-- PHONE APP CONFIGURATION
-- ============================================
Config.Phone = {
    -- Nome app in lb-phone
    appName = 'purelifeos',
    
    -- Titolo app
    appTitle = 'PURE LIFE OS',
    
    -- Icona app (FontAwesome o URL)
    appIcon = 'fa-solid fa-building-columns',
    
    -- Colore tema app
    appColor = '#00ff9c',
    
    -- Apre in webview (true) o tramite export (false)
    useWebview = true,
}

-- ============================================
-- SECURITY / RATE LIMITING
-- ============================================
Config.Security = {
    -- Rate limit: max chiamate per finestra temporale
    rateLimit = {
        maxCalls = 10,
        windowSeconds = 10,
    },
    
    -- Validazione input
    validation = {
        maxStringLength = 500,
        maxCoordValue = 10000,
    },
    
    -- Log azioni sospette
    logSuspiciousActivity = true,
}

-- ============================================
-- NOTIFICATIONS
-- ============================================
Config.Notifications = {
    -- Provider: 'ox_lib', 'esx', 'qb', 'native'
    provider = 'ox_lib',
    
    -- Posizione notifiche ox_lib
    position = 'top-right',
    
    -- Durata default (ms)
    duration = 5000,
}

-- ============================================
-- DEBUG
-- ============================================
Config.Debug = {
    -- Abilita log debug
    enabled = false,
    
    -- Log dettagliato NUI callbacks
    logNuiCallbacks = false,
    
    -- Log eventi framework
    logFrameworkEvents = false,
}

-- ============================================
-- KEYBINDS (opzionali)
-- ============================================
Config.Keybinds = {
    -- Abilita keybind per chiudere
    enableCloseKey = true,
    closeKey = 'ESCAPE',
    
    -- Keybind rapido tablet (opzionale)
    enableQuickOpen = false,
    quickOpenKey = 'F5',
}

-- ============================================
-- FRAMEWORK AUTO-DETECT
-- Non modificare se non sai cosa fai
-- ============================================
Config.Framework = {
    -- Forza framework specifico: 'esx', 'qb', 'auto'
    force = 'auto',
    
    -- Nome export ESX
    esxExport = 'es_extended',
    
    -- Nome export QBCore
    qbExport = 'qb-core',
}
