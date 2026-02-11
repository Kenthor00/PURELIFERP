# PLOS Bridge - FiveM Resource

**PURE LIFE OS Bridge** per FiveM - Integrazione completa con ox_inventory (tablet) e lb-phone (custom app).

## 📋 Indice

- [Requisiti](#requisiti)
- [Installazione](#installazione)
- [Configurazione](#configurazione)
- [Setup ox_inventory](#setup-ox_inventory)
- [Setup lb-phone](#setup-lb-phone)
- [API NUI Callbacks](#api-nui-callbacks)
- [Eventi](#eventi)
- [Exports](#exports)
- [Troubleshooting](#troubleshooting)

---

## Requisiti

- **FiveM Server** (build 5848+)
- **Framework**: ESX o QBCore (auto-detect)
- **ox_lib** (obbligatorio)
- **ox_inventory** (obbligatorio per tablet)
- **lb-phone** (opzionale, per app telefono)

---

## Installazione

### 1. Copia la resource

```
resources/
└── [plos]/
    └── plos_bridge/
        ├── fxmanifest.lua
        ├── config.lua
        ├── client/
        │   ├── main.lua
        │   ├── anim.lua
        │   └── nui.lua
        ├── server/
        │   ├── framework.lua
        │   └── main.lua
        ├── shared/
        │   └── utils.lua
        └── html/
            ├── index.html
            ├── style.css
            └── script.js
```

### 2. Configura server.cfg

```cfg
# Ordine IMPORTANTE - rispetta questa sequenza
ensure oxmysql
ensure ox_lib
ensure es_extended  # o qb-core
ensure ox_inventory
ensure lb-phone     # se usi lb-phone
ensure plos_bridge  # DEVE essere dopo tutti gli altri
```

### 3. Configura gli URL

Modifica `config.lua`:

```lua
Config.UI = {
    mode = 'external',  -- 'external' per URL remoto
    externalUrl = 'https://tuo-dominio-plos.com',  -- Il tuo PURE LIFE OS
}

Config.API = {
    baseUrl = 'https://tuo-dominio-plos.com',
    handshakeEndpoint = '/api/nui/handshake',
    enableHandshake = true,
}
```

---

## Configurazione

### config.lua - Opzioni principali

| Opzione | Tipo | Default | Descrizione |
|---------|------|---------|-------------|
| `UI.mode` | string | 'external' | 'external' = URL remoto, 'local' = file locali |
| `UI.externalUrl` | string | - | URL del PURE LIFE OS |
| `API.baseUrl` | string | - | URL base API backend |
| `API.enableHandshake` | bool | true | Abilita autenticazione NUI |
| `Tablet.itemName` | string | 'tablet' | Nome item in ox_inventory |
| `Security.rateLimit.maxCalls` | int | 10 | Max chiamate per finestra |
| `Security.rateLimit.windowSeconds` | int | 10 | Finestra rate limit |

---

## Setup ox_inventory

### 1. Aggiungi l'item tablet

**File:** `ox_inventory/data/items.lua`

```lua
['tablet'] = {
    label = 'Tablet',
    description = 'Un tablet per accedere a PURE LIFE OS',
    weight = 500,
    stack = false,
    close = true,
    consume = 0,
    client = {
        usetime = 1000,
    }
},
```

### 2. Alternativa: items.json (se usi SQL)

```json
{
    "name": "tablet",
    "label": "Tablet",
    "description": "Un tablet per accedere a PURE LIFE OS",
    "weight": 500,
    "stack": false,
    "close": true,
    "consume": 0
}
```

### 3. Query SQL per aggiungere item

```sql
INSERT INTO `items` (`name`, `label`, `weight`, `description`) 
VALUES ('tablet', 'Tablet', 500, 'Un tablet per accedere a PURE LIFE OS');
```

### Come funziona

Quando un player usa il tablet tramite ox_inventory:
1. `ox_inventory` triggera l'hook `usingItem`
2. `plos_bridge` intercetta l'uso dell'item "tablet"
3. Si apre la NUI in modalità TABLET con prop e animazione

---

## Setup lb-phone

lb-phone supporta custom apps. Ci sono **2 modalità** di integrazione:

---

### MODALITÀ 1: WebView URL (Consigliata)

Se lb-phone supporta app che aprono un URL esterno.

**File:** `lb-phone/config/config.lua` (o dove configuri le custom apps)

```lua
Config.CustomApps = {
    {
        name = "purelifeos",
        label = "PURE LIFE OS",
        icon = "https://tuo-dominio-plos.com/icon.png", -- o path locale
        color = "#00ff9c",
        
        -- OPZIONE A: WebView diretta
        url = "https://tuo-dominio-plos.com?mode=phone",
    },
}
```

**Come funziona:**
1. Player apre lb-phone
2. Clicca sull'app "PURE LIFE OS"
3. lb-phone apre la webview con l'URL
4. Il parametro `?mode=phone` dice a PLOS di usare il layout mobile
5. PLOS rileva `mode=phone` nella query string e adatta l'interfaccia

---

### MODALITÀ 2: Export/Event (Avanzata)

Se lb-phone supporta app che chiamano export o eventi.

#### Configurazione lb-phone

```lua
Config.CustomApps = {
    {
        name = "purelifeos",
        label = "PURE LIFE OS",
        icon = "fa-solid fa-building-columns",
        color = "#00ff9c",
        
        -- OPZIONE B: Chiama export
        export = {
            resource = "plos_bridge",
            name = "OpenPLOSPhone",
        },
        
        -- ALTERNATIVA: Trigger event
        -- event = "plos:openPhone",
    },
}
```

#### Export disponibili

```lua
-- Apre PLOS in modalità phone (senza prop/animazione)
exports.plos_bridge:OpenPLOSPhone()

-- Apre PLOS in modalità tablet (con prop/animazione)
exports.plos_bridge:OpenPLOSTablet()

-- Apre PLOS con modalità specifica
exports.plos_bridge:OpenPLOS('phone') -- o 'tablet'

-- Chiude PLOS
exports.plos_bridge:ClosePLOS()

-- Verifica se aperto
local isOpen = exports.plos_bridge:IsOpen()

-- Ottieni modalità corrente
local mode = exports.plos_bridge:GetCurrentMode() -- 'phone', 'tablet', o nil
```

#### Eventi disponibili

```lua
-- Apre in modalità phone
TriggerEvent('plos:openPhone')

-- Apre in modalità tablet
TriggerEvent('plos:openTablet')

-- Chiude
TriggerEvent('plos:close')
```

---

## API NUI Callbacks

La webapp PURE LIFE OS può comunicare con FiveM tramite questi callbacks:

### PLOS_GET_PLAYER

Ottiene dati del player corrente.

```javascript
// Dalla webapp, invia:
window.parent.postMessage({ type: 'PLOS_REQUEST_PLAYER' }, '*');

// Ricevi risposta:
window.addEventListener('message', (event) => {
    if (event.data.type === 'PLOS_PLAYER_DATA') {
        const player = event.data.data;
        // {
        //   identifier: "license:xxx",
        //   name: "Mario Rossi",
        //   job: "police",
        //   jobLabel: "Polizia",
        //   grade: 3,
        //   gradeLabel: "Sergente",
        //   duty: true
        // }
    }
});
```

### PLOS_SET_WAYPOINT

Imposta waypoint sulla mappa.

```javascript
window.parent.postMessage({ 
    type: 'PLOS_SET_WAYPOINT', 
    x: 123.45, 
    y: -456.78 
}, '*');
```

### PLOS_NOTIFY

Mostra notifica in-game.

```javascript
window.parent.postMessage({ 
    type: 'PLOS_NOTIFY',
    title: 'PURE LIFE OS',
    message: 'Operazione completata!',
    notifyType: 'success' // success, error, info, warning
}, '*');
```

### PLOS_HANDSHAKE

Richiede autenticazione NUI.

```javascript
// Richiedi handshake
window.parent.postMessage({ type: 'PLOS_HANDSHAKE' }, '*');

// Ricevi codice handshake
window.addEventListener('message', (event) => {
    if (event.data.type === 'PLOS_HANDSHAKE_CODE') {
        const { code, endpoint, expiry } = event.data;
        
        // Invia codice al backend PLOS per ottenere JWT
        fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: code })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                // data.token = JWT per API calls
                localStorage.setItem('plos_token', data.token);
            }
        });
    }
});
```

### PLOS_CLOSE

Chiude PLOS.

```javascript
window.parent.postMessage({ type: 'PLOS_CLOSE' }, '*');
```

### PLOS_GET_POSITION

Ottiene posizione corrente.

```javascript
window.parent.postMessage({ 
    type: 'PLOS_GET_POSITION',
    requestId: 'pos_123'
}, '*');

// Risposta
// { type: 'PLOS_POSITION_RESULT', requestId: 'pos_123', data: { x, y, z, heading } }
```

### PLOS_GET_STREET

Ottiene nome strada corrente.

```javascript
window.parent.postMessage({ 
    type: 'PLOS_GET_STREET',
    requestId: 'street_123'
}, '*');

// Risposta
// { type: 'PLOS_STREET_RESULT', requestId: 'street_123', data: { street, crossing, zone } }
```

---

## Eventi

### Da Server a Client

```lua
-- Push notification a player specifico
TriggerClientEvent('plos:pushNotification', playerId, {
    title = 'Nuovo Messaggio',
    message = 'Hai ricevuto un messaggio',
    type = 'info'
})

-- Refresh player context
TriggerClientEvent('plos:refreshPlayerContext', playerId)
```

### Server Exports

```lua
-- Push notification
exports.plos_bridge:PushNotification(playerId, {
    title = 'Avviso',
    message = 'Testo avviso',
    type = 'warning'
})

-- Broadcast a tutti
exports.plos_bridge:BroadcastNotification({
    title = 'Annuncio',
    message = 'Messaggio globale'
})

-- Framework helpers
local identifier = exports.plos_bridge:GetIdentifier(playerId)
local playerName = exports.plos_bridge:GetPlayerName(playerId)
local job = exports.plos_bridge:GetJob(playerId)
local fullData = exports.plos_bridge:GetFullPlayerData(playerId)
local hasTablet = exports.plos_bridge:HasItem(playerId, 'tablet')
```

---

## Differenze Tablet vs Phone

| Aspetto | Tablet Mode | Phone Mode |
|---------|-------------|------------|
| Prop | ✅ prop_cs_tablet | ❌ Nessuno |
| Animazione | ✅ Sì | ❌ No |
| Layout UI | Desktop/Tablet | Mobile |
| Disabilita controlli | ✅ Configurabile | ❌ No |
| Attivazione | Item ox_inventory | lb-phone app / export |

---

## Implementazione nella Webapp PLOS

### Rilevare modalità

```javascript
// In PURE LIFE OS webapp
const urlParams = new URLSearchParams(window.location.search);
const mode = urlParams.get('mode') || 'tablet';

if (mode === 'phone') {
    // Attiva layout mobile
    document.body.classList.add('mobile-layout');
} else {
    // Attiva layout desktop/tablet
    document.body.classList.add('tablet-layout');
}
```

### Setup listener per messaggi FiveM

```javascript
// NUI Bridge helper per PURE LIFE OS
class PLOSNUIBridge {
    constructor() {
        this.callbacks = new Map();
        this.setupListener();
    }
    
    setupListener() {
        window.addEventListener('message', (event) => {
            const data = event.data;
            if (!data || !data.type) return;
            
            // Gestisci risposta con requestId
            if (data.requestId && this.callbacks.has(data.requestId)) {
                const callback = this.callbacks.get(data.requestId);
                this.callbacks.delete(data.requestId);
                callback(data);
                return;
            }
            
            // Gestisci eventi generici
            this.handleEvent(data);
        });
    }
    
    handleEvent(data) {
        switch(data.type) {
            case 'PLOS_PLAYER_DATA':
                // Player data ricevuto
                break;
            case 'PLOS_PUSH_NOTIFICATION':
                // Mostra notifica in-app
                break;
            case 'PLOS_PLAYER_CONTEXT_UPDATED':
                // Aggiorna contesto player
                break;
        }
    }
    
    send(type, payload = {}) {
        window.parent.postMessage({ type, ...payload }, '*');
    }
    
    sendWithCallback(type, payload = {}) {
        return new Promise((resolve) => {
            const requestId = 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            this.callbacks.set(requestId, resolve);
            this.send(type, { ...payload, requestId });
            
            // Timeout 10 secondi
            setTimeout(() => {
                if (this.callbacks.has(requestId)) {
                    this.callbacks.delete(requestId);
                    resolve({ success: false, error: 'Timeout' });
                }
            }, 10000);
        });
    }
    
    // Metodi helper
    getPlayer() {
        this.send('PLOS_REQUEST_PLAYER');
    }
    
    setWaypoint(x, y) {
        this.send('PLOS_SET_WAYPOINT', { x, y });
    }
    
    notify(title, message, type = 'info') {
        this.send('PLOS_NOTIFY', { title, message, notifyType: type });
    }
    
    close() {
        this.send('PLOS_CLOSE');
    }
    
    async getPosition() {
        return this.sendWithCallback('PLOS_GET_POSITION');
    }
    
    async getStreet() {
        return this.sendWithCallback('PLOS_GET_STREET');
    }
    
    requestHandshake() {
        this.send('PLOS_HANDSHAKE');
    }
}

// Uso
const nuiBridge = new PLOSNUIBridge();
nuiBridge.getPlayer();
nuiBridge.setWaypoint(123.45, -456.78);
```

---

## Troubleshooting

### La NUI non si apre

1. Verifica che `ox_lib` e `ox_inventory` siano avviati prima di `plos_bridge`
2. Controlla console F8 per errori Lua
3. Verifica che l'URL in `Config.UI.externalUrl` sia raggiungibile

### Errore "Framework not found"

1. Verifica che ESX o QBCore siano avviati
2. Controlla `Config.Framework.esxExport` o `Config.Framework.qbExport`
3. Prova a forzare il framework in config:
   ```lua
   Config.Framework.force = 'esx' -- o 'qb'
   ```

### Item tablet non funziona

1. Verifica che l'item esista in ox_inventory
2. Controlla che `Config.Tablet.itemName` corrisponda al nome item
3. Verifica nei log server se l'hook viene chiamato

### lb-phone app non funziona

1. Verifica configurazione custom app in lb-phone
2. Se usi export, verifica che `plos_bridge` sia avviato prima del click
3. Controlla console per errori

### Handshake fallisce

1. Verifica `Config.API.baseUrl` e `Config.API.handshakeEndpoint`
2. Controlla che il backend PLOS sia raggiungibile dal server FiveM
3. Verifica i log server per errori HTTP

### Rate limit reached

Se vedi "Rate limit exceeded":
1. Aumenta `Config.Security.rateLimit.maxCalls`
2. Aumenta `Config.Security.rateLimit.windowSeconds`
3. Ottimizza le chiamate dalla webapp (debounce, cache)

---

## Supporto

Per problemi o domande:
- Apri una issue su GitHub
- Contatta il team PURE LIFE OS

---

**Versione:** 1.0.0  
**Licenza:** MIT  
**Autore:** PURE LIFE OS Team
