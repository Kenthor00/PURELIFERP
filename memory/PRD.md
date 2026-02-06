# PURE LIFE OS (PLOS) - Product Requirements Document

## Panoramica
Sistema Operativo Governativo Digitale per server FiveM PURE LIFE RP.
Un ecosistema unico per browser desktop, tablet di reparto e WebView lb-phone.

## Architettura
- **Backend**: FastAPI (Python) con SQLAlchemy ORM
- **Frontend**: React + TailwindCSS
- **Database**: 
  - Produzione: MySQL su Railway (via DATABASE_URL)
  - Development: SQLite locale (fallback automatico)
- **Realtime**: Server-Sent Events (SSE)
- **Auth**: JWT custom + FiveM SSO + RBAC avanzato per settori

## Deployment
- **Platform**: Emergent
- **Database**: Railway MySQL (esterno) o SQLite (locale)
- **Env Var**: `DATABASE_URL` per MySQL esterno

---

## FASE 1 - Sistema Operativo Governativo ✅ COMPLETATA (2026-02-06)

### 1. Sistema di Login Avanzato ✅
- [x] Autenticazione JWT con settore, grado, livello_gerarchico
- [x] Campo `game_name` obbligatorio al primo accesso
- [x] Pagina `/set-game-name` per impostare il nome in game
- [x] Rate limiting su login (5 tentativi in 15 minuti)
- [x] Account locking dopo troppi tentativi
- [x] **NUOVO**: `is_sector_chief` per identificare i capi settore

### 2. Gerarchia e Permessi Multi-livello ✅
- [x] Enum `Sector`: LSPD, EMS, GOV, NEWS, DISPATCH, CIVIL, ADMIN
- [x] `SECTOR_GRADES` con gradi predefiniti per ogni settore
- [x] `PERMISSION_MATRIX` con permessi per livello gerarchico
- [x] Admin ha override totale
- [x] Capi settore possono gestire solo utenti del proprio reparto

### 3. Admin System Completo ✅ (PRIORITÀ 1)
- [x] **Redirect automatico** admin a `/admin` dopo login
- [x] **Dashboard Admin** (`/admin`) con statistiche
- [x] **Gestione Utenti** (`/admin/users`) completa:
  - [x] Lista tutti gli utenti con filtri per settore
  - [x] Form creazione utente con TUTTI i campi:
    - sector, grade, hierarchy_level, is_sector_chief
    - game_name, badge_number, department
  - [x] Modifica utente
  - [x] Disattiva/Riattiva utente
  - [x] Reset password
  - [x] Storico accessi utente
  - [x] Log azioni utente
- [x] **Audit Dashboard** (`/admin/audit`) avanzata:
  - [x] Filtri: settore, azione, intervallo date, ID utente
  - [x] Vista "attività ultime 24h"
  - [x] Vista "attività utente"
  - [x] Statistiche real-time
  - [x] Distribuzione azioni
  - [x] Export CSV

### 4. Gestione Reparto per Capi Settore ✅ (PRIORITÀ 2)
- [x] Pagina `/sector-management` per capi settore
- [x] Campo `is_sector_chief` nel modello User
- [x] Pannello con:
  - [x] Lista utenti del proprio settore
  - [x] Creazione login per i propri agenti
  - [x] Modifica gradi (solo livelli inferiori)
  - [x] Disattivazione account del proprio settore
  - [x] Audit del proprio settore
- [x] **NON può vedere altri settori**

### 5. Login & Identità RP ✅ (PRIORITÀ 3)
- [x] `game_name` obbligatorio al primo login
- [x] `game_name` salvato in audit log per ogni azione
- [x] `game_name` mostrato in TopBar vicino all'email

### 6. Blocco Definitivo Demo ✅ (PRIORITÀ 4)
- [x] Nessuna scritta "credenziali demo" nella pagina login
- [x] Nessun seed pubblico
- [x] Solo bootstrap admin iniziale con chiave sicura

### 7. Sicurezza ✅
- [x] Rate limiting per login
- [x] Password policy (8+ caratteri, maiuscola, minuscola, numero, speciale)
- [x] Bootstrap sicuro per primo admin (`ADMIN_BOOTSTRAP_KEY`)
- [x] Account locking dopo troppi tentativi falliti

---

## COMPLETATO (Prima della trasformazione)

### MVP Base ✅
- [x] Autenticazione JWT con RBAC
- [x] Modulo LSPD (casi, mandati, multe)
- [x] Modulo EMS (pazienti, referti)
- [x] Dispatch Center
- [x] Timeline globale
- [x] SSE per realtime

### Espansione ✅
- [x] City Hub pubblico (eventi, annunci)
- [x] Weazel News (articoli, breaking news)
- [x] Service Chat (canali, messaggi)
- [x] Governo & Giustizia (udienze, pratiche)
- [x] Deep linking per lb-phone

### lb-phone Integration ✅
- [x] Rimozione X-Frame-Options per embedding
- [x] CSP frame-ancestors *
- [x] Modalità phone-webview (reduced motion)
- [x] SSO FiveM con token monouso

### Stabilizzazione ✅
- [x] Endpoint /api/health con JSON strutturato
- [x] App si avvia anche senza DB (stato degradato)
- [x] Banner errore UI quando DB down
- [x] Auto-migrations all'avvio
- [x] SQLite fallback per development

---

## PROSSIMI TASK (P1)

### Miglioramenti UX Admin
- [ ] Link diretto a `/admin` nel menu laterale per admin
- [ ] Notifiche per login falliti multipli
- [ ] Dashboard con grafici temporali

### Affinamento Audit
- [ ] Grafici attività per settore
- [ ] Alert per attività sospette
- [ ] Report schedulati

---

## BACKLOG (P2 - Fase 2)

### City Hub 2.0
- [ ] Nuovo sistema permessi per annunci
- [ ] Moderazione eventi da parte GOV

### Weazel News 2.0
- [ ] Permessi di pubblicazione per gradi NEWS
- [ ] Workflow approvazione articoli

### Service Chat 2.0
- [ ] Stato presenza utenti
- [ ] Notifiche push
- [ ] Canali per settore

---

## Credenziali Test

**Admin (Super Admin):**
```
Email: admin@purelife.rp
Password: Admin@2026!
Bootstrap Key: plos-bootstrap-admin-key-2026
```

**Capo Settore LSPD (per test):**
```
Email: chief.lspd@purelife.rp
Password: ChiefPass@123!
```

---

## File Principali

### Backend
- `/app/backend/server.py` - Entry point FastAPI
- `/app/backend/models.py` - Modelli SQLAlchemy con `is_sector_chief`
- `/app/backend/database.py` - Configurazione DB con SQLite fallback
- `/app/backend/auth.py` - Autenticazione JWT con UserRole legacy compatibility
- `/app/backend/services/` - Business logic (audit, permission, security)
- `/app/backend/routers/auth.py` - Login con is_sector_chief
- `/app/backend/routers/users.py` - CRUD completo + reset-password, access-history, activity-log
- `/app/backend/routers/audit.py` - Audit con filtri avanzati

### Frontend
- `/app/frontend/src/App.js` - Routing con redirect admin
- `/app/frontend/src/components/TopBar.js` - Navigazione con game_name
- `/app/frontend/src/context/AuthContext.js` - Login con sector/is_sector_chief
- `/app/frontend/src/pages/LoginPage.js` - Senza credenziali demo
- `/app/frontend/src/pages/admin/AdminDashboard.js` - Dashboard admin
- `/app/frontend/src/pages/admin/UserManagement.js` - Gestione utenti completa
- `/app/frontend/src/pages/admin/AuditDashboard.js` - Audit con filtri
- `/app/frontend/src/pages/SectorManagement.js` - Pannello capi settore
- `/app/frontend/src/pages/SetGameNamePage.js` - Setup game name

### Test
- `/app/backend/tests/test_admin_system.py` - Test API admin system
- `/app/test_reports/iteration_3.json` - Report test FASE 1

---

## Note Tecniche

### Database
- `DATABASE_URL` di Railway non accessibile da Emergent (usa .internal)
- Fallback automatico a SQLite per development
- Auto-migrations all'avvio

### Compatibilità Legacy
- `UserRole` enum mantenuto per compatibilità con router esistenti
- Mapping automatico `UserRole` → `Sector` in `auth.py`

### Testing
- Backend: 100% (19/19 test passati)
- Frontend: 100% (tutti i test UI passati)
