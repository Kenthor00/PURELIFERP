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

---

## 🏗️ Architettura Tecnica

### Backend
- **Framework:** FastAPI (Python 3.11)
- **Database:** SQLite (dev) / MySQL Railway (prod)
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
│   │   ├── auth.py           # Autenticazione JWT
│   │   ├── users.py          # Gestione utenti
│   │   ├── audit.py          # Audit log
│   │   ├── recruitment.py    # Candidature
│   │   ├── appointments.py   # Appuntamenti
│   │   ├── announcements.py  # Annunci
│   │   ├── advertising.py    # Slot pubblicitari
│   │   ├── notifications.py  # Notifiche SSE
│   │   ├── news_v2.py        # Weazel News 2.0
│   │   ├── chat.py           # Service Chat 2.0
│   │   └── push.py           # Push Notifications
│   ├── services/
│   │   └── audit_service.py  # Servizio audit centralizzato
│   ├── models.py             # Modelli SQLAlchemy
│   ├── database.py           # Configurazione DB
│   └── server.py             # Entry point FastAPI
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── public/       # CityHub, News
│   │   │   ├── cityhub/      # Recruitment, Appointments, etc.
│   │   │   ├── news/         # NewsEditorPage
│   │   │   ├── admin/        # Admin Dashboard
│   │   │   └── ...
│   │   ├── components/
│   │   │   ├── ui/           # Shadcn components
│   │   │   └── TopBar.js     # Navigation bar
│   │   └── context/          # Auth, SSE, Sound, Health
│   └── package.json
└── memory/
    └── PRD.md                # Questo file
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
- `POST /api/auth/bootstrap` - Bootstrap admin
- `POST /api/auth/refresh` - Refresh token

### News v2
- `GET /api/v2/news/published` - Articoli pubblicati
- `GET /api/v2/news/breaking` - Solo breaking news
- `POST /api/v2/news/newsroom/create` - Crea articolo
- `POST /api/v2/news/newsroom/{id}/submit-review` - Invia revisione
- `POST /api/v2/news/newsroom/{id}/approve` - Approva
- `POST /api/v2/news/newsroom/{id}/publish` - Pubblica
- `POST /api/v2/news/newsroom/{id}/toggle-breaking` - Toggle breaking

### Chat
- `GET /api/chat/channels` - Lista canali accessibili
- `POST /api/chat/channels/{name}/messages` - Invia messaggio
- `GET /api/chat/channels/{name}/messages` - Leggi messaggi
- `GET /api/chat/presence` - Lista utenti online
- `PUT /api/chat/presence` - Aggiorna stato

### Push
- `GET /api/push/vapid-public-key` - Chiave pubblica
- `POST /api/push/subscribe` - Attiva push
- `DELETE /api/push/unsubscribe` - Disattiva push

---

## 🔮 Backlog / Future Tasks

Non ci sono altre fasi definite. I prossimi sviluppi dipenderanno dal feedback utente. Possibili miglioramenti:

1. **Integrazione FiveM avanzata** - Sync in-game con dashboard
2. **Sistema multe/sanzioni** - Gestione completa multe LSPD
3. **Gestione veicoli** - Registro veicoli cittadini
4. **Sistema eventi** - Calendario eventi RP
5. **Analytics** - Dashboard statistiche per admin

---

## 📅 Changelog

| Data | Versione | Modifiche |
|------|----------|-----------|
| 2026-02-07 | 4.1 | Bug Fix: Lista utenti vuota, Stato presenza OFFLINE. Nuovo: Logo PURE LIFE, Pulsante "Torna Indietro" Login |
| 2026-02-06 | 4.0 | FASE 4 completata: News 2.0, Chat 2.0, Push Notifications |
| 2026-02-05 | 3.0 | FASE 3 completata: Notifiche SSE, Calendario, TopBar |
| 2026-02-04 | 2.0 | FASE 2 completata: City Hub base |
| 2026-02-03 | 1.0 | FASE 1 completata: Sistema base |

---

## 🔒 Security Fix v4.2 (2026-02-07)

### Bug CRITICO Risolto:
**Sessione Admin "sempre attiva"** - L'utente appariva loggato anche senza token valido.

### Fix Implementati:
1. **Token Validation via /api/auth/me** - Unica fonte di verità per autenticazione
2. **Vista Guest Sicura** - Senza token valido, nessuna info utente visibile
3. **Auto-Logout** - Token scaduto/invalido → purge localStorage + redirect /login
4. **Pulsante ESCI** - Visibile in rosso nella header, logout completo
5. **Eliminazione Definitiva Account** - Soft-delete con anonimizzazione

### Eliminazione Definitiva - Regole:
- Solo ADMIN level 10
- Conferma doppia: scrivere "DELETE"
- Audit obbligatorio (`USER_DELETE_HARD`)
- Protezione auto-eliminazione
- Protezione ultimo admin
- Anonimizzazione: `email → deleted_uuid@purelife.rp`, `game_name → DELETED`

### File modificati:
- `/app/frontend/src/context/AuthContext.js` - validateAndFetchUser(), forceLogout()
- `/app/frontend/src/components/Layout.js` - Pulsante ESCI
- `/app/backend/routers/users.py` - hard_delete_user endpoint
- `/app/backend/models.py` - is_deleted, deleted_at, deleted_by columns
- `/app/frontend/src/pages/admin/UserManagement.js` - Modal eliminazione

---

## 🐛 Bug Fix v4.1 (2026-02-07)

### Risolti:
1. **Lista utenti vuota su /admin/users** - Il campo `grade` poteva essere `None`, causando un errore Pydantic. Fix: `grade or ""` in `_user_to_response()`
2. **Stato presenza sempre OFFLINE** - Lo stato presenza non veniva salvato nel context. Fix: Aggiunto state `presence` in `AuthContext` e collegato a `Layout.js`
3. **Logo PURE LIFE** - Implementato su Login, TopBar, Sidebar e Favicon
4. **Pulsante "Torna Indietro" Login** - Aggiunto sopra il form, naviga a `/city`

### File modificati:
- `/app/backend/routers/users.py` - Fix grade None
- `/app/frontend/src/context/AuthContext.js` - Gestione stato presenza
- `/app/frontend/src/components/Layout.js` - Visualizzazione presenza utente
- `/app/frontend/src/components/TopBar.js` - Logo e indicatore presenza
- `/app/frontend/src/pages/LoginPage.js` - Pulsante indietro e logo
- `/app/frontend/public/logo.png` - Logo scaricato
- `/app/frontend/public/index.html` - Favicon

---

*Ultimo aggiornamento: 2026-02-07*
