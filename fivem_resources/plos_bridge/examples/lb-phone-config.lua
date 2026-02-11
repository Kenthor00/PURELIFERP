--[[
    ================================================
    ESEMPIO CONFIGURAZIONE LB-PHONE CUSTOM APP
    ================================================
    
    Copia UNA delle configurazioni seguenti nel file
    di configurazione delle custom apps di lb-phone.
    
    Il percorso varia in base alla versione di lb-phone:
    - lb-phone/config/config.lua
    - lb-phone/config/apps.lua
    - O dove configurì le custom apps
    
    ================================================
]]

-- =============================================
-- OPZIONE 1: WEBVIEW URL (CONSIGLIATA)
-- =============================================
-- Usa questa se lb-phone supporta app che aprono URL
-- Il parametro ?mode=phone dice a PLOS di usare il layout mobile

{
    -- Identificativo univoco app
    identifier = "purelifeos",
    
    -- Nome visualizzato
    name = "PURE LIFE OS",
    
    -- Descrizione (se supportata)
    description = "Sistema Operativo Governativo",
    
    -- Icona (FontAwesome o URL immagine)
    icon = "fa-solid fa-building-columns",
    -- ALTERNATIVA con URL immagine:
    -- icon = "https://tuo-dominio-plos.com/assets/icon-app.png",
    
    -- Colore tema
    color = "#00ff9c",
    
    -- URL da aprire in webview
    -- IMPORTANTE: il parametro mode=phone attiva il layout mobile
    url = "https://tuo-dominio-plos.com?mode=phone",
    
    -- Opzioni webview (se supportate da lb-phone)
    webview = {
        -- Permetti JavaScript
        javascript = true,
        -- Permetti localStorage
        localStorage = true,
    },
},


-- =============================================
-- OPZIONE 2: EXPORT PLOS_BRIDGE
-- =============================================
-- Usa questa se lb-phone supporta app che chiamano export
-- L'export apre la NUI di plos_bridge in modalità phone

{
    identifier = "purelifeos",
    name = "PURE LIFE OS",
    description = "Sistema Operativo Governativo",
    icon = "fa-solid fa-building-columns",
    color = "#00ff9c",
    
    -- Chiama export di plos_bridge
    export = {
        resource = "plos_bridge",
        name = "OpenPLOSPhone",
    },
},


-- =============================================
-- OPZIONE 3: TRIGGER EVENT
-- =============================================
-- Usa questa se lb-phone supporta app che triggerano eventi

{
    identifier = "purelifeos",
    name = "PURE LIFE OS",
    description = "Sistema Operativo Governativo",
    icon = "fa-solid fa-building-columns",
    color = "#00ff9c",
    
    -- Triggera evento client
    event = "plos:openPhone",
},


-- =============================================
-- CONFIGURAZIONE COMPLETA ESEMPIO
-- =============================================
-- Esempio di come potrebbe apparire nel file config di lb-phone

--[[
Config.CustomApps = {
    -- App PURE LIFE OS
    {
        identifier = "purelifeos",
        name = "PURE LIFE OS",
        description = "Sistema Operativo Governativo - Accedi ai servizi cittadini",
        icon = "fa-solid fa-building-columns",
        color = "#00ff9c",
        
        -- SCEGLI UNA delle opzioni:
        
        -- Opzione 1: URL
        url = "https://tuo-dominio-plos.com?mode=phone",
        
        -- Opzione 2: Export
        -- export = { resource = "plos_bridge", name = "OpenPLOSPhone" },
        
        -- Opzione 3: Event
        -- event = "plos:openPhone",
    },
    
    -- Altre custom apps...
}
]]


-- =============================================
-- NOTE IMPORTANTI
-- =============================================
--[[

1. SOSTITUISCI "https://tuo-dominio-plos.com" con l'URL reale
   del tuo PURE LIFE OS

2. Il parametro "?mode=phone" è CRUCIALE per il layout mobile.
   La webapp PLOS rileva questo parametro e attiva:
   - Layout compatto per schermi piccoli
   - Navigazione touch-friendly
   - Interfaccia ottimizzata per telefono

3. Se usi l'opzione Export o Event:
   - Assicurati che plos_bridge sia avviato PRIMA di lb-phone
   - Verifica l'ordine in server.cfg

4. Per testare:
   - Apri lb-phone
   - Cerca l'app "PURE LIFE OS"
   - Cliccala per aprire

5. Se l'app non appare:
   - Riavvia il server
   - Verifica la sintassi della configurazione
   - Controlla i log per errori

]]
