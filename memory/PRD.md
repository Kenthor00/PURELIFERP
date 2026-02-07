# PURE LIFE OS - PRD (Product Requirements Document)
## Sistema Operativo Governativo RP

---

## 📋 Descrizione del Prodotto

PURE LIFE OS è un sistema operativo web completo per gestire un server RP (roleplay) GTA. Fornisce dashboard per le forze dell'ordine (LSPD), servizi medici (EMS), dispatch, governo, news e cittadini civili.

---

## 🎯 Obiettivi Principali

1. **Gestione centralizzata** di tutti i dipartimenti governativi RP
2. **City Hub pubblico** per cittadini con reclutamento, appuntamenti, annunci, news
3. **Comunicazione real-time** tra settori (chat interna)
4. **Audit trail completo** per ogni azione
5. **Integrazione FiveM** con SSO e deep links per lb-phone

---

## ✅ Fasi Completate

### FASE 1 - Sistema Base ✅
- Sistema di autenticazione JWT con ruoli
- Dashboard Admin con gestione utenti
- Sistema di Audit Log completo
- Pannello gestione per capi settore
- Bootstrap admin per primo avvio

### FASE 2 - City Hub Base ✅
- Modulo Reclutamento con candidature online
- Modulo Appuntamenti con prenotazioni
- Modulo Annunci pubblici
- Modulo Slot Pubblicitari
- **Test passati:** 31/31 (100%)

### FASE 3 - City Hub Avanzato ✅
- Sistema notifiche real-time (SSE)
- Reclutamento potenziato (stato Colloquio, filtri)
- Calendario visuale per appuntamenti
- TopBar con campanella notifiche
- **Test passati:** 43/43 (100%)

### FASE 4 - News, Chat, Push ✅ (Completata 06/02/2026)
#### Weazel News 2.0
- Dashboard redazionale `/news/editor`
- Workflow articoli: Bozza → Revisione → Approvato → Pubblicato
- RBAC: Reporter(1), Editor(2), Caporedattore(3), Direttore(4)
- Breaking News con notifiche globali
- Pagina pubblica `/city/news` con filtro categorie
- Supporto video embed (YouTube/Twitch)

#### Service Chat 2.0
- Chat interna per settori `/chat`
- 6 canali: LSPD, EMS, GOV, DISPATCH, WEAZEL, STAFF
- Sistema presenza utenti (Online, In Servizio, Fuori Servizio)
- Quick Actions per navigazione rapida
- **Sistema Mention @NomeInGame** con autocomplete e notifiche
- Moderazione con permessi gerarchici

#### Push Notifications
- Integrazione Web Push con VAPID keys
- Subscribe/Unsubscribe per dispositivo
- Preferenze notifiche per tipo (recruitment, appointments, breaking, chat)
- Integrazione con Breaking News

**Test passati:** 24/24 backend + 100% frontend

### FASE 5 - Bug Fix Completo e Stabilizzazione ✅ (Completata 07/02/2026)

#### Security Fix v4.2
- **Token Validation via /api/auth/me** - Unica fonte di verità per autenticazione
- **Vista Guest Sicura** - Senza token valido, nessuna info utente visibile
- **Auto-Logout** - Token scaduto/invalido → purge localStorage + redirect /login
- **Pulsante ESCI** - Visibile in rosso nella header, logout completo
- **Eliminazione Definitiva Account** - Soft-delete con anonimizzazione

#### Registrazione Cittadini v4.3
- **Endpoint `POST /api/auth/register/citizen`** - Crea utente CIVIL level 1
- **Pagina `/register`** - Form con Nome in Game, Email, Password
- **Auto-login** - Dopo registrazione, utente autenticato automaticamente
- **Pulsante REGISTRATI** su City Hub e Login

#### Database Migration Fix
- Corretti disallineamenti schema DB/modelli SQLAlchemy
- Aggiunte colonne mancanti: `updated_at`, `verdict_date`, ecc.
- Tutte le API ora funzionanti senza errori

#### Frontend Routing Fix
- Create pagine mancanti per LSPD: `WarrantsListPage.js`, `FinesListPage.js`
- Create pagine mancanti per EMS: `ReportsListPage.js`
- Create pagine mancanti per Justice: `NewCasePage.js`, `NewHearingPage.js`
- Corretto mapping `user.role` in AuthContext per compatibilità legacy

**Test passati:** 96% backend, 95% frontend (Iteration 10)

---

## 🏗️ Architettura Tecnica

### Backend
- **Framework:** FastAPI (Python 3.11)
- **Database:** MySQL Railway (prod)
- **ORM:** SQLAlchemy Async
- **Auth:** JWT con access/refresh token
- **Real-time:** Server-Sent Events (SSE)
- **Push:** pywebpush con VAPID

### Frontend
- **Framework:** React 18
- **Routing:** React Router v6
- **Styling:** TailwindCSS custom "tactical" theme
- **UI Components:** Shadcn/UI
- **State:** Context API (Auth, SSE, Sound, Health)

### Struttura Directory
```
/app/
├── backend/
│   ├── routers/
│   │   ├── auth.py           # Autenticazione JWT + registrazione
│   │   ├── users.py          # Gestione utenti + soft-delete
│   │   ├── lspd.py           # Casi, Mandati, Multe, Evidence
│   │   ├── ems.py            # Pazienti, Referti, Templates
│   │   ├── dispatch.py       # Chiamate, Statistiche
│   │   ├── justice.py        # Pratiche Legali, Udienze
│   │   ├── news_v2.py        # Weazel News 2.0
│   │   ├── chat.py           # Service Chat 2.0
│   │   └── push.py           # Push Notifications
│   ├── models.py             # Modelli SQLAlchemy
│   ├── schemas.py            # Schemi Pydantic
│   └── server.py             # Entry point FastAPI
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── admin/        # Admin Dashboard, User Management
│   │   │   ├── lspd/         # Dashboard, Cases, Warrants, Fines
│   │   │   ├── ems/          # Dashboard, Patients, Reports
│   │   │   ├── justice/      # Dashboard, NewCase, NewHearing
│   │   │   ├── public/       # CityHub, News
│   │   │   ├── LoginPage.js
│   │   │   ├── RegisterPage.js
│   │   │   └── DispatchPage.js
│   │   ├── context/
│   │   │   └── AuthContext.js # Auth + role mapping
│   │   └── components/
│   │       ├── Layout.js
│   │       └── TopBar.js
│   └── package.json
└── memory/
    └── PRD.md
```

---

## 🔐 Credenziali Test

| Ruolo | Email | Password | Note |
|-------|-------|----------|------|
| Admin | admin@purelife.rp | Admin@2026! | Override totale |
| Direttore NEWS | director.news@purelife.rp | News@2026! | Hierarchy level 4 |
| Reporter NEWS | reporter.news@purelife.rp | News@2026! | Hierarchy level 1 |
| Capo LSPD | chief.lspd@purelife.rp | ChiefPass@123! | Capo settore |

---

## 📡 API Endpoints Principali

### Auth
- `POST /api/auth/login` - Login
- `POST /api/auth/register/citizen` - Registrazione cittadini
- `GET /api/auth/me` - Info utente corrente
- `POST /api/auth/refresh` - Refresh token

### LSPD
- `GET /api/lspd/stats` - Statistiche dashboard
- `GET/POST /api/lspd/cases` - Gestione casi
- `GET/POST /api/lspd/warrants` - Gestione mandati
- `GET/POST /api/lspd/fines` - Gestione multe

### EMS
- `GET /api/ems/stats` - Statistiche dashboard
- `GET/POST /api/ems/patients` - Gestione pazienti
- `GET/POST /api/ems/reports` - Gestione referti

### Dispatch
- `GET /api/dispatch/stats` - Statistiche chiamate
- `GET /api/dispatch/calls/active` - Chiamate attive
- `POST /api/dispatch/calls` - Nuova chiamata

### Justice
- `GET /api/justice/stats` - Statistiche
- `GET/POST /api/justice/cases` - Pratiche legali
- `GET/POST /api/justice/hearings` - Udienze

### News v2
- `GET /api/v2/news/published` - Articoli pubblicati
- `GET /api/v2/news/breaking` - Breaking news

### Chat
- `GET /api/chat/channels` - Lista canali
- `POST /api/chat/channels/{name}/messages` - Invia messaggio

---

## 🔮 Backlog / Future Tasks

### P1 - Prossimi Sviluppi
1. **Modifica profilo utente** - Cambio password, aggiornamento nome in game
2. **Ripristino utenti eliminati** - Un-delete per soft-delete

### P2 - Miglioramenti
1. **Menzioni di gruppo nella Service Chat** - @tutti, @settore
2. **Dashboard Analytics** - Statistiche per admin
3. **Gestione veicoli** - Registro veicoli cittadini

### P3 - Integrazione Avanzata
1. **Integrazione FiveM avanzata** - Sync in-game con dashboard
2. **Sistema eventi** - Calendario eventi RP

---

## 📅 Changelog

| Data | Versione | Modifiche |
|------|----------|-----------|
| 2026-02-07 | 5.0 | FASE 5: Bug fix completo, pagine frontend complete, migrazione DB, security fix, registrazione pubblica |
| 2026-02-07 | 4.3 | Registrazione cittadini, fix DB columns |
| 2026-02-07 | 4.2 | Security fix: token validation, logout, soft-delete |
| 2026-02-07 | 4.1 | Bug Fix: Lista utenti, Stato presenza, Logo |
| 2026-02-06 | 4.0 | FASE 4: News 2.0, Chat 2.0, Push Notifications |
| 2026-02-05 | 3.0 | FASE 3: Notifiche SSE, Calendario, TopBar |
| 2026-02-04 | 2.0 | FASE 2: City Hub base |
| 2026-02-03 | 1.0 | FASE 1: Sistema base |

---

## ✅ Stato Attuale (07/02/2026)

**Applicazione COMPLETAMENTE FUNZIONANTE**

- ✅ Login/Logout sicuro con validazione token
- ✅ Admin Dashboard con statistiche
- ✅ LSPD: Dashboard, Casi, Mandati, Multe
- ✅ EMS: Dashboard, Pazienti, Referti
- ✅ Dispatch: Centro Comando con chiamate
- ✅ Justice: Pratiche legali, Udienze
- ✅ News: Breaking news, Articoli pubblici
- ✅ Chat: Canali settoriali
- ✅ City Hub: Pagina pubblica
- ✅ Registrazione: Cittadini possono registrarsi

**Test Report:** Iteration 10 - 96% backend, 95% frontend

---

*Ultimo aggiornamento: 2026-02-07*
