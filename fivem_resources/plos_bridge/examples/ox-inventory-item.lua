--[[
    ================================================
    SETUP OX_INVENTORY - ITEM TABLET
    ================================================
    
    Aggiungi l'item tablet a ox_inventory per
    permettere ai player di usare PURE LIFE OS
    tramite un item inventario.
    
    ================================================
]]


-- =============================================
-- OPZIONE 1: items.lua (Lua-based config)
-- =============================================
-- Aggiungi al file: ox_inventory/data/items.lua

['tablet'] = {
    label = 'Tablet',
    description = 'Un tablet per accedere a PURE LIFE OS - Sistema Operativo Governativo',
    weight = 500,          -- Peso in grammi
    stack = false,         -- Non stackabile (ogni tablet è unico)
    close = true,          -- Chiude inventario quando usato
    consume = 0,           -- Non viene consumato (0 = infinito)
    
    -- Configurazione client-side
    client = {
        usetime = 1000,    -- Tempo di utilizzo in ms (animazione progress bar)
        
        -- Opzionale: animazione personalizzata durante usetime
        anim = {
            dict = 'amb@world_human_seat_wall_tablet@female@base',
            clip = 'base',
        },
        
        -- Opzionale: prop durante usetime
        prop = {
            model = 'prop_cs_tablet',
            bone = 60309,
            pos = vec3(0.03, 0.002, -0.0),
            rot = vec3(10.0, 160.0, 0.0),
        },
        
        -- Opzionale: notifica al completamento
        notification = 'Tablet attivato',
    },
    
    -- Opzionale: immagine custom
    -- image = 'tablet.png',  -- Metti in ox_inventory/web/images/
},


-- =============================================
-- OPZIONE 2: items.json (SQL/JSON config)
-- =============================================
-- Se usi configurazione JSON, aggiungi questo oggetto

--[[
{
    "name": "tablet",
    "label": "Tablet",
    "description": "Un tablet per accedere a PURE LIFE OS - Sistema Operativo Governativo",
    "weight": 500,
    "stack": false,
    "close": true,
    "consume": 0,
    "client": {
        "usetime": 1000
    }
}
]]


-- =============================================
-- OPZIONE 3: Query SQL Diretta
-- =============================================
-- Se usi database per gli items, esegui questa query

--[[
INSERT INTO `items` (`name`, `label`, `weight`, `description`) 
VALUES (
    'tablet', 
    'Tablet', 
    500, 
    'Un tablet per accedere a PURE LIFE OS - Sistema Operativo Governativo'
);
]]


-- =============================================
-- DARE IL TABLET AI PLAYER
-- =============================================
-- Metodi per aggiungere il tablet all'inventario di un player

-- Da server-side script:
-- exports.ox_inventory:AddItem(source, 'tablet', 1)

-- Da console server:
-- giveitem [player_id] tablet 1

-- Tramite shop ox_inventory (se configurato):
-- Aggiungi 'tablet' alla lista items di uno shop


-- =============================================
-- VERIFICA FUNZIONAMENTO
-- =============================================
--[[

1. Riavvia ox_inventory:
   refresh
   ensure ox_inventory

2. Datti il tablet:
   /giveitem [tuo_id] tablet 1

3. Apri inventario (default: F2 o TAB)

4. Clicca sul tablet per usarlo

5. Dovrebbe aprirsi PURE LIFE OS in modalità tablet

Se non funziona:
- Verifica che plos_bridge sia avviato
- Controlla console F8 per errori
- Verifica che l'item sia stato aggiunto correttamente

]]


-- =============================================
-- CONFIGURAZIONE AVANZATA
-- =============================================

-- Per tablet con metadati personalizzati (es. registrato a un player):
--[[
['tablet'] = {
    label = 'Tablet Personale',
    description = 'Tablet registrato a nome tuo',
    weight = 500,
    stack = false,
    close = true,
    consume = 0,
    
    -- Richiedi metadati specifici
    client = {
        usetime = 1000,
        
        -- Funzione custom per verificare se può essere usato
        -- export = 'plos_bridge',
        -- canUse = function(data)
        --     -- Verifica custom, es: tablet bloccato
        --     return true
        -- end,
    },
    
    -- Genera metadati alla creazione
    server = {
        -- export = 'plos_bridge',
        -- onCreate = function(slot)
        --     return {
        --         registered = true,
        --         serial = PLOS.Utils.GenerateCode(8)
        --     }
        -- end,
    },
},
]]


-- =============================================
-- VARIANTI TABLET (OPZIONALE)
-- =============================================
-- Se vuoi tablet diversi per ruoli diversi

--[[
-- Tablet civile base
['tablet_citizen'] = {
    label = 'Tablet Cittadino',
    description = 'Accesso ai servizi civili di PURE LIFE OS',
    weight = 500,
    stack = false,
    close = true,
    consume = 0,
    client = { usetime = 1000 },
},

-- Tablet polizia (con funzioni extra)
['tablet_police'] = {
    label = 'MDT Polizia',
    description = 'Mobile Data Terminal - LSPD',
    weight = 600,
    stack = false,
    close = true,
    consume = 0,
    client = { usetime = 800 },
},

-- Tablet medico
['tablet_ems'] = {
    label = 'Tablet Medico',
    description = 'Accesso al sistema ospedaliero',
    weight = 500,
    stack = false,
    close = true,
    consume = 0,
    client = { usetime = 1000 },
},
]]

-- NOTA: Se crei varianti, aggiorna Config.Tablet.itemName in plos_bridge
-- oppure gestisci più items nell'hook usingItem
