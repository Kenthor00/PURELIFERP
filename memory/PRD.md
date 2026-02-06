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

## FASE 1 - Sistema Operativo Governativo ✅ (2026-02-06)

### Sistema di Login Avanzato ✅
- [x] Autenticazione JWT con settore, grado, livello_gerarchico
- [x] Campo `game_name` obbligatorio al primo accesso
- [x] Pagina `/set-game-name` per impostare il nome in game
- [x] Rate limiting su login (5 tentativi in 15 minuti)
- [x] Account locking dopo troppi tentativi

### Gerarchia e Permessi Multi-livello ✅
- [x] Enum `Sector`: LSPD, EMS, GOV, NEWS, DISPATCH, CIVIL, ADMIN
- [x] `SECTOR_GRADES` con gradi predefiniti per ogni settore
- [x] `PERMISSION_MATRIX` con permessi per livello gerarchico
- [x] Admin ha override totale
- [x] Capi settore possono gestire solo utenti del proprio reparto

### Gestione Utenti ✅
- [x] Router `/api/users` per CRUD utenti
- [x] Endpoint per visualizzare utenti del proprio settore
- [x] Endpoint per creare utenti (solo capi settore/admin)
- [x] Endpoint per disattivare/riattivare utenti
- [x] Endpoint per cambiare grado
- [x] Endpoint per sbloccare account

### Sistema Audit Log ✅
- [x] Modello `AuditLog` con tutti i campi richiesti
- [x] `AuditAction` enum con tutte le azioni tracciabili
- [x] Logging automatico di: login, logout, password change, game_name set
- [x] Logging di tutte le operazioni CRUD
- [x] Router `/api/audit` per visualizzare log
- [x] Export CSV dei log

### TopBar Globale ✅
- [x] Componente `TopBar.js` con navigazione fissa
- [x] Pulsanti: Indietro, Home, Refresh
- [x] Compatibile con lb-phone (iframe)
- [x] Mostra pagina corrente e utente loggato

### Sicurezza ✅
- [x] Rate limiting per login
- [x] Password policy (minimo 8 caratteri, maiuscola, minuscola, numero, speciale)
- [x] Bootstrap sicuro per primo admin (`ADMIN_BOOTSTRAP_KEY`)
- [x] Account locking dopo troppi tentativi falliti

### Dashboard Admin ✅
- [x] Pagina `/admin` con statistiche
- [x] Pagina `/admin/users` per gestione utenti
- [x] Pagina `/admin/audit` per visualizzare audit log

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

### Dashboard Audit per Capi Settore
- [ ] Filtri avanzati per settore/azione/data
- [ ] Grafici attività
- [ ] Alert per attività sospette

### Gestione Utenti Avanzata
- [ ] Form completo per creazione utenti
- [ ] Modifica batch utenti
- [ ] Import/Export utenti CSV

### Affinamento UI/UX
- [ ] Redirect corretto per ADMIN a /admin invece di /lspd
- [ ] Rimozione credenziali demo dalla pagina login
- [ ] Aggiunta link alla dashboard Admin nel menu laterale

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

**Admin Bootstrap:**
```
Email: admin@purelife.rp
Password: Admin@2026!
Bootstrap Key: plos-bootstrap-admin-key-2026
```

---

## File Principali

### Backend
- `/app/backend/server.py` - Entry point FastAPI
- `/app/backend/models.py` - Modelli SQLAlchemy
- `/app/backend/database.py` - Configurazione DB con SQLite fallback
- `/app/backend/auth.py` - Autenticazione JWT con UserRole legacy
- `/app/backend/services/` - Business logic (audit, permission, security)
- `/app/backend/routers/` - API endpoints

### Frontend
- `/app/frontend/src/App.js` - Routing principale
- `/app/frontend/src/components/TopBar.js` - Navigazione globale
- `/app/frontend/src/pages/admin/` - Dashboard amministrazione
- `/app/frontend/src/pages/SetGameNamePage.js` - Setup game name

---

## Note Tecniche

### Database
- `DATABASE_URL` di Railway non accessibile da Emergent (usa .internal)
- Fallback automatico a SQLite per development
- Auto-migrations all'avvio

### Compatibilità Legacy
- `UserRole` enum mantenuto per compatibilità con router esistenti
- Mapping automatico `UserRole` → `Sector` in `auth.py`
