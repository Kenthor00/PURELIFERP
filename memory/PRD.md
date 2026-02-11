# PURE LIFE OS - PRD (Product Requirements Document)
## Sistema Operativo Governativo RP v3.4.0

**Current Version:** v3.4.0  
**Release Date:** 2026-02-11  
**Status:** Production Ready

---

## 📋 Descrizione del Prodotto

PURE LIFE OS è un **Sistema Operativo Civico Roleplay ULTRA PREMIUM** per server GTA FiveM. Non un sito web, ma un vero OS digitale della città con interfaccia premium, performance estreme e funzionalità MAI VISTE PRIMA.

---

## 🎯 Vision v3.0 ULTRA PREMIUM

> "Il sistema digitale ufficiale della città RP - Ultra veloce, Real-time, Immersivo, Futuristico, MAI VISTO PRIMA"

---

## ✅ FASI COMPLETATE

### FASE 1-4 - Sistema Base + City Hub + News + Chat ✅
### FASE 5 - Bug Fix e Stabilizzazione ✅

### BUGFIX SPRINT ✅ (08/02/2026)
- **Fix DB Evidence:** Aggiunta colonna `collected_by` alla tabella `evidence`
- **Fix DB Chat:** Aggiunta colonna `updated_at` e resa `sender_id` nullable in `chat_messages`
- **Debug Panel:** Nuovo strumento diagnostica per admin (icona Bug in basso a destra)
- **Verificato:** Tutti i flussi CRUD LSPD (casi, multe, mandati) funzionanti
- **Verificato:** Chat funzionante con canali, messaggi, presenza

### BUG FIX + UI WOW PASS ✅ (08/02/2026)

#### Bug Fix Route Nuova Multa/Mandato
- **Nuove route dedicate:** `/lspd/fines/new` e `/lspd/warrants/new`
- **Nuove pagine:** `NewFinePage.js` e `NewWarrantPage.js` con form completi
- **Command Palette aggiornata:** Azioni LSPD navigate alle nuove route
- **Funziona da:** HOME LSPD, Command Palette (Ctrl+K), direct URL

#### UI WOW PASS - GLOBALE ✅ (08/02/2026)
Applicato design premium consistente su TUTTE le pagine:

**Componenti Riutilizzabili Creati** (`/app/frontend/src/components/os/OsComponents.jsx`):
- `OsStatCard` - Card statistiche con gradient, hover, trend
- `OsPanel` - Pannello contenitore con gradient
- `OsSectionHeader` - Header sezione con icona e azione
- `OsQuickAction` - Card azione rapida con glow effect
- `OsEmptyState` - Stato vuoto elegante con CTA
- `OsListRow` - Riga lista con hover premium
- `OsBadge` - Badge status colorati
- `OsPageHeader` - Header pagina principale
- `OsSkeleton` - Skeleton loader

**Background Control Room** (aggiunto a `os-system.css`):
- Gradienti radiali soft (blu top-left, verde bottom-right)
- Griglia tecnica 50px quasi invisibile
- Noise texture 2% opacity

**Pagine Aggiornate**:
- ✅ Admin Dashboard - Stats, azioni rapide, utenti per settore
- ✅ LSPD Dashboard - Stats premium, casi recenti, quick actions
- ✅ EMS Dashboard - Stats, pazienti, quick actions
- ✅ Dispatch Page - Stats, chiamate attive, modal premium
- ✅ Chat - Stili premium per canali, messaggi, input
- ✅ NewFinePage e NewWarrantPage - Form premium
- ✅ **Justice Dashboard** - Stats, udienze, pratiche legali, quick actions (08/02/2026)
- ✅ **City Pulse** - Stats, heatmap, feed attività, badge allerta (08/02/2026)
- ✅ **Fines List** - Ricerca, filtro, lista premium con badge (08/02/2026)
- ✅ **Warrants List** - Ricerca, filtro, lista premium con badge (08/02/2026)
- ✅ **Public Portal (CityHubPage)** - Hero panel, sezioni premium, branding (08/02/2026)
- ✅ **ServiceChatPage** - Sidebar premium, canali, messaggi, menzioni, azioni rapide (08/02/2026)
- ✅ **UserManagement** - Header, stats per settore, tabella utenti, badge, modali (08/02/2026)

**Endpoint Backend Aggiunti**:
- `GET /api/admin/stats` - Statistiche utenti per dashboard
- `GET /api/admin/audit` - Audit log recente

### FASE P0 - Performance Extreme ✅ (08/02/2026)
- Cache In-Memory LRU backend
- +8 Indici Database
- WebSocket Real-Time Engine
- Skeleton Loaders Premium
- Virtual List Component
- IndexedDB Cache Hook
- Animazioni Premium CSS

### FASE P1 - UI OS-Style + Funzionalità Uniche ✅ (08/02/2026)

#### 🖥️ UI Sistema Operativo - RIFATTORIZZAZIONE COMPLETA ✅ (08/02/2026)
- **OSLayout.jsx**: Nuovo layout principale stile sistema operativo
- **SystemBar.jsx**: Barra di sistema in alto con:
  - PURE LIFE OS v3.0 branding
  - Orologio con data/ora in tempo reale
  - Stato server (ONLINE/OFFLINE)
  - Livello Allerta Città (Normale/Elevato/Critico)
- **Sidebar Navigation**: Navigazione moduli con icone e colori dipartimento
  - City Pulse (Centro Controllo)
  - LSPD, EMS, Dispatch, Giustizia, Weazel, Chat, Admin
  - COMANDI (⌘K), IMPOSTAZIONI, ESCI
- **os-system.css**: Design system completo con:
  - Palette scura (#0a0f12 base, accenti verde neon #00ff9c)
  - Effetto vetro (backdrop blur)
  - Animazioni fluide (fade-in, slide-in, scale-in)
  - Componenti OS (glass-card, stat-card, module-card)
- **SSE fix**: Endpoint ora accetta token da query param per EventSource

#### 🎯 Command Palette (Ctrl+K) - MAI VISTA PRIMA
- Apertura con **Ctrl+K** da qualsiasi pagina
- Design OS-style con sfondo blur
- Ricerca azioni, pagine, comandi
- Navigazione con frecce + invio
- Azioni raggruppate per categoria
- Storico comandi recenti
- Filtro per ruolo utente

#### 🗺️ City Pulse - Centro di Controllo - MAI VISTO PRIMA
- **Dashboard live** con metriche da tutti i moduli
- **Heatmap interattiva** delle zone della città
- **Feed attività** in tempo reale
- **Livello allerta** automatico (Normale/Elevato/Critico)
- Auto-refresh ogni 30 secondi
- Statistiche aggregate LSPD/EMS/Dispatch/Justice

#### 🗑️ Sistema Delete Universale ✅ COMPLETATO (08/02/2026)
- API `/api/admin/delete/{type}/{id}` per eliminare qualsiasi risorsa
- **Admin**: può eliminare tutto (anche permanentemente)
- **Capi Settore** (level >= 8): possono eliminare risorse del proprio settore
- **Modal di conferma** con motivo opzionale
- **Eliminazione permanente** richiede conferma digitando "ELIMINA"
- **Pulsante cestino** visibile su ogni elemento delle liste
- ✅ Integrato in: LSPD (casi, mandati, multe), EMS (referti), Justice (udienze, pratiche), Dispatch (chiamate)

#### Risorse Eliminabili
- LSPD: Casi, Mandati, Multe, Prove
- EMS: Pazienti, Referti
- Dispatch: Chiamate
- Justice: Pratiche Legali, Udienze
- Chat: Messaggi, Canali
- City Hub: Annunci, Appuntamenti, Candidature
- News: Articoli
- Sistema: Notifiche, Eventi Timeline

#### 📜 Premium Custom Scrollbar - FiveM CEF Compatible ✅ (08/02/2026)
- **Componente `PremiumScrollbar`** in `/app/frontend/src/pages/public/CityHubPage.js`
- Design futuristico con:
  - Track con gradient verde al neon (glow effect)
  - Thumb luminoso con bordo brillante
  - Pattern decorativo sul track
  - Indicatore percentuale al hover/drag
- **Funzionalità JavaScript pure** (no dipendenza da scrollbar native):
  - Click sul track per saltare alla posizione
  - Drag del thumb per scrollare
  - Auto-hide quando non c'è contenuto scrollabile
- **Compatibilità**:
  - ✅ Desktop (1920x800)
  - ✅ Tablet FiveM (800x600)
  - ✅ lb-phone FiveM (340x600)
- Risolve il problema dello scorrimento nei browser CEF di FiveM che non supportano lo scroll nativo

---

## 🏗️ Architettura Tecnica v3.0 ULTRA PREMIUM

### Backend
```
FastAPI (Python 3.11)
├── Cache Layer (LRU In-Memory, TTL 15-30s)
├── WebSocket Engine (Real-Time)
├── Admin Delete Router (Eliminazione universale)
├── MySQL Railway (Async + 8 Indici ottimizzati)
├── SSE Manager (Legacy)
└── JWT Auth + Refresh Tokens
```

### Frontend
```
React 18 + TailwindCSS
├── Command Palette (Ctrl+K)
├── City Pulse Dashboard (Heatmap)
├── Delete Modal + useDelete Hook
├── Skeleton Loaders (Premium)
├── Virtual Scrolling
├── IndexedDB Cache
├── WebSocket Hook
└── Shadcn/UI Components
```

---

## 📁 File Nuovi P1

```
/app/
├── backend/
│   ├── server.py              # 🔧 SSE fix per token da query param
│   └── routers/
│       └── admin_delete.py    # 🆕 Sistema Delete Universale
├── frontend/
│   └── src/
│       ├── styles/
│       │   └── os-system.css      # 🆕 Design System OS-Style
│       ├── components/
│       │   ├── OSLayout.jsx       # 🆕 Layout Sistema Operativo
│       │   ├── SystemBar.jsx      # 🆕 Barra Sistema (top)
│       │   ├── os/
│       │   │   └── OSComponents.jsx # 🆕 Componenti OS riutilizzabili
│       │   ├── CommandPalette.jsx # 🆕 Command Palette (Ctrl+K)
│       │   └── DeleteModal.jsx    # 🆕 Modal Eliminazione
│       └── pages/
│           └── CityPulsePage.jsx  # 🆕 City Pulse Dashboard
```

---

## 🔐 Credenziali Test

| Ruolo | Email | Password |
|-------|-------|----------|
| Admin | admin@purelife.rp | Admin@2026! |

---

## 📡 Nuove API P1

### Admin Delete
- `GET /api/admin/delete/permissions` - Permessi eliminazione per utente
- `DELETE /api/admin/delete/{type}/{id}` - Elimina risorsa
- `POST /api/admin/delete/bulk` - Eliminazione multipla

### System
- `GET /api/system/cache/stats` - Statistiche cache
- `GET /api/system/performance` - Metriche performance
- `POST /api/system/cache/clear` - Svuota cache (admin)

---

## 🔮 BACKLOG

### P2 - Integrazione FiveM
- [ ] API Layer con service account
- [ ] Endpoints `/api/fivem/*` dedicati
- [ ] Event ingestion (arresti/multe/EMS)
- [ ] Sync bidirezionale

### P2 - Dossier System
- [ ] Profilo completo per cittadino/staff
- [ ] Storico arresti, multe, soccorsi
- [ ] Note autorità
- [ ] Permission-based access

### P3 - Broadcast Operativo
- [ ] Alert urgenti GOV/DISPATCH
- [ ] Push + banner in-app
- [ ] Storico broadcast

---

## ✅ Test Report P1

**Backend:** 21/21 test passati (100%)
- Health endpoint ✅
- Admin login ✅
- Delete permissions ✅
- Cache stats ✅
- Performance endpoint ✅
- LSPD stats/cases/warrants/fines ✅
- EMS stats/reports ✅
- Dispatch stats/calls ✅
- Justice stats/cases/hearings ✅
- City Hub events/news/ads ✅

**Frontend UI OS-Style:** 95% success rate
- Login funziona correttamente ✅
- OSLayout con SystemBar e Sidebar ✅
- Navigazione tra moduli (LSPD, EMS, Admin, Justice, etc.) ✅
- Command Palette (tramite bottone COMANDI) ✅
- Logout funziona ✅
- Design scuro con accenti verde neon ✅
- SSE endpoint fix (token da query param) ✅

**Frontend:** Verificato con screenshot
- Command Palette (Ctrl+K) ✅
- City Pulse Dashboard ✅
- Delete buttons su liste ✅
- Skeleton loaders ✅

---

## 📅 Changelog

| Data | Versione | Modifiche |
|------|----------|-----------|
| 2026-02-08 | 3.0.8 | **FIVEM CEF AUTO-FALLBACK**: Aggiunto rilevamento automatico browser FiveM CEF con fallback a pulsanti di scroll se scrollbar non funziona. Hook `useFiveMDetection()` rileva UA, API FiveM, risoluzione schermo |
| 2026-02-08 | 3.0.7 | **BUG FIX SPRINT**: 7 bug risolti - Chat cambio canale, EMS PatientDetailPage, EMS Report modal premium, Giustizia Verdetti/Archivio toast info, LSPD Elimina Tutto attività, City Pulse mappa dati reali API /dispatch/zones/activity |
| 2026-02-08 | 3.0.6 | **SCROLLBAR CUSTOM PREMIUM**: Implementata scrollbar personalizzata per il Portale Pubblico (CityHubPage) compatibile con FiveM CEF browser. Design futuristico con glow al neon, drag del thumb, indicatore percentuale, click sul track. Testata su desktop, tablet (800x600) e lb-phone (340x600) |
| 2026-02-08 | 3.0.5 | **FIX SSE OFFLINE**: Corretto indicatore SSE che mostrava "OFFLINE". Migliorata gestione errori QUIC e riconnessione automatica |
| 2026-02-08 | 3.0.4 | **UI WOW PASS COMPLETO**: ServiceChatPage e UserManagement ridisegnate. Tutte le pagine principali ora usano OsComponents. 100% test passed |
| 2026-02-08 | 3.0.3 | **UI WOW PASS GLOBALE**: Justice, City Pulse, Fines, Warrants ridisegnate con OsComponents. Portale pubblico trasformato in istituzionale premium. 100% test passed |
| 2026-02-08 | 3.0.2 | **AUDIT COMPLETO**: Fix bug Delete Universale (AuditAction, log_audit params), SSE reconnect, Delete esteso a EMS/Justice/Dispatch, Compatibilità FiveM |
| 2026-02-08 | 3.0.1 | **P1 ULTRA PREMIUM**: Command Palette, City Pulse, Sistema Delete Universale |
| 2026-02-08 | 3.0.0 | **P0 Performance Extreme**: Cache LRU, WebSocket, Skeleton, Indici DB |
| 2026-02-07 | 2.5.0 | Bug fix completo, pagine frontend, security fix |

---

## ✅ Stato Attuale (10/02/2026)

**PURE LIFE OS 3.1.0 - MAJOR UPDATE: Sistema RP Completo**

### Iteration 18 - Sistema RP Completo (10/02/2026)

#### A) Prove legate ai Casi ✅
- Tab "PROVE" nel dettaglio caso con conteggio
- Modale per aggiunta prove con tipo (foto, video, documento, altro)
- Grid view prove con delete
- Endpoint: `GET/POST /lspd/evidence/{case_id}`, `DELETE /lspd/evidence/{id}`

#### B) Ciclo di Vita Mandati ✅
- Stati: OPEN, EXECUTED, EXPIRED, CANCELLED
- Endpoint: `PATCH /lspd/warrants/{id}/status` con validazione transizioni server-side
- UI: Modal cambio stato con pulsanti "ESEGUITO", "SCADUTO", "REVOCA"
- Badge dinamici colorati per ogni stato

#### C) ID Cittadino Opzionale ✅
- Campo `citizen_identifier` reso opzionale nelle multe
- Rimosso errore validazione per ID mancante

#### D) Modifica e Cancellazione Multe ✅
- Endpoint: `PUT /lspd/fines/{id}` con `modification_reason` obbligatorio
- Endpoint: `DELETE /lspd/fines/{id}` con `deletion_reason` obbligatorio
- Permessi ownership: solo creatore o `hierarchy_level >= 7` (Comandante+)
- UI: Icone Edit/Trash, modal con motivazione obbligatoria

#### E) Selezione Pratiche in Nuova Udienza ✅
- Lista pratiche con ricerca
- Click per selezionare con checkbox
- Auto-fill titolo udienza
- Pulsante "Rimuovi selezione"

#### F) Campo "Avvocato" in Nuova Pratica ✅
- Sostituito "attore" con "avvocato"
- Campo `lawyer_name` nel modello DB

#### G) Lista Pratiche Fix ✅
- Visualizzazione corretta di tutte le pratiche
- Badge stato con colori

#### H) Pratiche in Attesa Click Fix ✅
- Click funzionante su card pratiche
- Navigazione a dettaglio

#### I) Editor Weazel News Fix ✅
- Textarea con stili inline per evitare conflitti CSS
- Input text funzionante correttamente

#### J) Mappa Custom FiveM con POI ✅
- Immagine mappa satellitare Los Santos ad alta risoluzione
- Sistema POI completo con CRUD
- 9 categorie POI (governo, polizia, ospedale, commerciale, residenziale, industriale, intrattenimento, servizi, altro)
- Marker colorati con icone
- Modalità modifica per utenti autorizzati (Admin, GOV lv3+, LSPD/EMS/Dispatch lv7+)
- Filtro per categoria, toggle etichette
- Tooltip hover con info POI

### Nuovi File Creati
- `/app/backend/routers/poi.py` - Router completo POI
- `/app/backend/routers/nui_integration.py` - Router FiveM NUI Integration
- `/app/frontend/src/context/NUIContext.js` - NUI Bridge postMessage
- `/app/frontend/src/hooks/useNUIAuth.js` - Hook autenticazione NUI
- `/app/backend/tests/test_iteration18.py` - 22 test backend

### Iteration 19 - FiveM NUI Integration (10/02/2026)

#### Auth Handshake System ✅
- `POST /api/nui/handshake` - Riceve code da FiveM, valida, ritorna JWT short-lived (12 min)
- `POST /api/nui/handshake/dev` - Dev mode per testing senza FiveM
- `POST /api/nui/refresh` - Refresh token per sessioni NUI
- Rate limiting per IP (10 req/60s, block 300s)
- Code one-time con TTL 60s (validato da server FiveM)

#### WebSocket Engine Potenziato ✅
- Nuovi event types per NUI: `APPOINTMENT_*`, `NEWS_*`, `MARKETPLACE_*`, `DOCUMENT_*`, `WAYPOINT_SET`
- Canali standard: `nui:notifications`, `nui:appointments`, `nui:news`, `nui:marketplace`, `nui:documents`
- Helper functions per broadcast news, notifiche documento, waypoint

#### NUI Bridge (Frontend) ✅
- `NUIContext.js` - Comunicazione postMessage bidirezionale
- Eventi INBOUND: `PLOS_HANDSHAKE`, `PLOS_PLAYER`, `PLOS_OK`, `PLOS_ERR`
- Eventi OUTBOUND: `PLOS_GET_PLAYER`, `PLOS_SET_WAYPOINT`, `PLOS_NOTIFY`
- Auto-detect ambiente FiveM NUI
- Hooks: `useNUI`, `useNUIEvent`, `useWaypoint`, `useNUINotify`

#### Token Short-Lived ✅
- JWT access token: 12 minuti (configurabile via `NUI_TOKEN_EXPIRE_MINUTES`)
- Auto-refresh ogni 10 minuti in background
- Refresh token: 7 giorni

#### Rate Limiting ✅
- 10 richieste per 60 secondi per IP
- Blocco automatico 5 minuti dopo violazione
- Stats endpoint: `GET /api/nui/rate-limit/stats`

### Modifiche DB
- `warrants.status` - Enum OPEN/EXECUTED/EXPIRED/CANCELLED
- `warrants.cancelled_at`, `cancelled_by`, `cancellation_reason` - Tracking revoca
- `fines.updated_at`, `last_modified_by`, `modification_reason` - Tracking modifiche
- `legal_cases.lawyer_name` - Nome avvocato
- `map_pois` - Nuova tabella POI

### Test Results (10/02/2026)
- Backend: 22/22 test passati (100%)
- Frontend: Tutte le funzionalità verificate (100%)
- Bug fixati da testing agent: 2 (Evidence extra_data, EvidenceResponse schema)

---

## ✅ Stato Attuale (11/02/2026)

### Iteration 20 - FASE 2 COMPLETATA (11/02/2026)

#### 1. Sistema Reminder Agenda ✅
- **Background Scheduler**: Task asincrono che verifica reminder ogni 60 secondi
- **Intervalli reminder**: 24h, 1h, 15 minuti prima dell'appuntamento
- **Notifiche WebSocket**: Invio su canali `nui:appointments`, `nui:notifications`
- **Discord Webhook**: Integrazione webhook per reminder (URL configurabile per appuntamento)
- **Evento NUI**: `PLOS_NOTIFY` per notifiche in-game

#### 2. Audit Log Completo ✅
- **Endpoint**: `GET /api/admin/audit?limit=N` - Ritorna log con struttura completa
- **Azioni Tracciate**:
  - `appointment_create`, `appointment_update` - Modulo Agenda
  - `case_create`, `warrant_create`, `fine_create` - Modulo LSPD
  - `warrant_execute` - Cambio stato mandato
  - `login_success` - Autenticazione
- **Struttura log**: id, action, description, user_email, game_name, sector, entity_type, entity_id, timestamp
- **Fix admin.py**: Corretto uso colonna `timestamp` invece di `created_at`

#### 3. Mappa CityPulse con Waypoint ✅
- **Click POI → Waypoint**: Click su marker POI imposta destinazione
- **Evento NUI**: `PLOS_SET_WAYPOINT` inviato a FiveM con coordinate GTA V
- **Browser fallback**: Toast notification con info POI quando non in ambiente NUI
- **Tooltip aggiornato**: Mostra indicazione "Click per impostare waypoint"
- **Conversione coordinate**: Percentuale mappa → coordinate GTA V (approssimazione)

### Modifiche File (11/02/2026)
- `/app/backend/server.py` - Aggiunto reminder_scheduler task nel lifespan
- `/app/backend/routers/admin.py` - Fix audit endpoint (timestamp column)
- `/app/backend/routers/lspd.py` - Aggiunto audit log per case/warrant/fine
- `/app/frontend/src/pages/CityPulsePage.jsx` - handleSetWaypoint(), useWaypoint hook

### Test Results Iteration 20 (11/02/2026)
- **Backend**: 22/22 test passati (100%)
- **Frontend**: 100% funzionalità verificate
- **Audit Log**: Correttamente popolato con azioni critiche
- **Reminder Scheduler**: Avviato nel server lifespan

---

## ✅ Iteration 21 - P1 Admin RBAC (11/02/2026)

### Sistema RBAC Completo
- **Tabelle**: `jobs`, `job_grades`, `permissions`, `job_grade_permissions`, `user_permission_overrides`, `staff_roles`, `user_staff_roles`
- **Middleware**: `RBACService` con `require_permission()`, `require_staff()`
- **15 endpoint** su `/api/admin/rbac/*`

### Gerarchie Italiane (Come richiesto)
| Job | Gradi | Categorie |
|-----|-------|-----------|
| LSPD | 13 | COMANDO, ALTO COMANDO, SUPERVISIONE, UFFICIALI, RECLUTE |
| EMS | 6 | DIREZIONE, MEDICI, PERSONALE |
| Giustizia | 5 | PROCURA, MAGISTRATURA, AVVOCATURA |
| Weazel | 5 | DIREZIONE, REDAZIONE, REPORTER |
| Meccanico | 5 | PROPRIETÀ, GESTIONE, TECNICI, APPRENDISTI |
| Taxi | 5 | DIREZIONE, GESTIONE, AUTISTI |
| Sicurezza | 4 | DIREZIONE, GESTIONE, OPERATIVO |

### Ruoli Staff (Separati)
- **Moderatore** (Lv1): Moderazione chat/utenti base
- **Amministratore** (Lv2): Bypass permessi job
- **Super Admin** (Lv3): Controllo totale

### Permessi (23 permessi base)
- LSPD: 13 permessi (view/create/edit/delete per casi, mandati, multe, prove)
- EMS: 5 permessi (pazienti, referti)
- Admin: 5 permessi (utenti, ruoli, permessi, audit)

### Frontend `/admin/rbac`
- UI 100% italiana
- 5 Tabs: Lavori/Gradi, Utenti, Matrice Permessi, Ruoli Staff, Registro Attività
- Assegnazione job/grado con motivazione
- Assegnazione ruoli staff
- Override permessi con scadenza
- Audit log con filtri

### File Creati/Modificati
- `/app/backend/rbac.py` - Middleware RBAC
- `/app/backend/routers/admin_rbac.py` - Router completo
- `/app/frontend/src/pages/AdminRBACPage.js` - UI Admin
- `/app/migrations/v3.3.0_admin_rbac.sql` - Migrazioni complete

---

## 🔜 Prossimi Task (Roadmap Post-P1 Admin)

### ✅ P1 - Pannello Admin (COMPLETATO)
- [x] Sistema RBAC job+grado+override
- [x] Gerarchie italiane realistiche
- [x] UI gestione completa
- [x] Audit log con filtri ed export

### P1 - Documenti Verificabili con QR
- [ ] Sistema gestione documenti (ID, patenti, licenze)
- [ ] Generazione QR code univoco per verifica
- [ ] Pagina pubblica verifica documento via QR
- [ ] Audit log per emissione/revoca documenti

### P1 - Marketplace
- [ ] Modulo annunci (veicoli, immobili, lavoro, servizi)
- [ ] CRUD annunci con immagini
- [ ] Filtri e ricerca
- [ ] Contatto venditore

### P1 - Pannello Admin RBAC ✅ (11/02/2026)
- ✅ Interfaccia gestione ruoli/permessi - Pagina `/admin/rbac` con 6 tab
- ✅ Gestione Job italiani (LSPD, EMS, Governo, etc.)
- ✅ Gestione Gradi per ogni job
- ✅ Matrice permessi per categoria
- ✅ Ruoli Staff con livelli
- ✅ Override permessi per utente
- ✅ Audit log delle azioni RBAC

### P1.1 - Sincronizzazione Automatica Job/Gradi ✅ (11/02/2026)
- ✅ **Tab Sync FiveM** nella pagina Admin RBAC
- ✅ **Endpoint API**: `POST /api/admin/rbac/sync`, `GET /sync/config`, `GET /sync/last-report`
- ✅ **Sorgenti supportate**: Auto-detect, ESX Framework, QBCore Framework
- ✅ **Modalità sync**: Merge (consigliato), Strict (con warning)
- ✅ **Dry Run**: Anteprima modifiche senza applicarle
- ✅ **URL Database esterno**: Supporto connessione a DB FiveM remoto
- ✅ **Report dettagliato**: Job aggiunti/aggiornati/rimossi, gradi, errori
- ✅ **UI italiana completa**: Tutti i label e messaggi in italiano

### PC Realism Mode
- [ ] Finestre draggable e ridimensionabili
- [ ] Snap layout (come Windows 11)
- [ ] Shortcut da tastiera
- [ ] Icone desktop

### Dossier System
- [ ] File personale per ogni cittadino
- [ ] Storico arresti, multe, soccorsi
- [ ] Note autorità

### Broadcast Operativo
- [ ] Alert urgenti per GOV/Dispatch
- [ ] Notifiche push
- [ ] Audio alert

---

*PURE LIFE OS - Il Sistema Operativo della Città - ULTRA PREMIUM*

---

## 📅 Changelog

| Data | Versione | Modifiche |
|------|----------|-----------|
| 2026-02-11 | 3.3.2 | **FIVEM DB AUTO-CONNECTION**: Configurazione connessione automatica via .env (FIVEM_DB_*). Badge UI, test connessione, mascheramento password nei log. Documentazione RUNBOOK aggiornata |
| 2026-02-11 | 3.3.1 | **P1.1 SYNC FIVEM**: Tab Sync nella pagina Admin RBAC per sincronizzare job/gradi da server ESX/QBCore. Supporto dry_run, modalità merge/strict, URL database esterno. 16/16 test backend + frontend 100% |
| 2026-02-11 | 3.3.0 | **P1 ADMIN RBAC**: Pannello completo gestione ruoli e permessi. 6 tab: Lavori, Utenti, Permessi, Staff, Sync, Audit. Gerarchie job italiane. Middleware RBAC |
| 2026-02-11 | 3.2.0 | **FASE 2 COMPLETATA**: Sistema Reminder Agenda con scheduler background (ogni 60s), notifiche WebSocket e Discord webhook. Audit Log integrato in appointments e LSPD (cases, warrants, fines). CityPulse POI click → waypoint con evento NUI PLOS_SET_WAYPOINT |
| 2026-02-10 | 3.1.0 | **SISTEMA RP COMPLETO**: Prove casi, ciclo vita mandati, permessi multe, fix giustizia, mappa POI custom |
| 2026-02-10 | 3.0.9 | **FIVEM NUI INTEGRATION**: Handshake auth, JWT short-lived, WebSocket engine NUI, NUIContext bridge |
| 2026-02-08 | 3.0.8 | FiveM CEF Auto-Fallback |
