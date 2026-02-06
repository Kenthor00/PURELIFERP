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
- [x] `is_sector_chief` per identificare i capi settore

### 2. Gerarchia e Permessi Multi-livello ✅
- [x] Enum `Sector`: LSPD, EMS, GOV, NEWS, DISPATCH, CIVIL, ADMIN
- [x] `SECTOR_GRADES` con gradi predefiniti per ogni settore
- [x] `PERMISSION_MATRIX` con permessi per livello gerarchico
- [x] Admin ha override totale
- [x] Capi settore possono gestire solo utenti del proprio reparto

### 3. Admin System Completo ✅
- [x] Dashboard Admin (`/admin`) con statistiche
- [x] Gestione Utenti (`/admin/users`) completa con CRUD
- [x] Audit Dashboard (`/admin/audit`) avanzata con filtri ed export CSV
- [x] Reset password, storico accessi, log azioni utente

### 4. Gestione Reparto per Capi Settore ✅
- [x] Pagina `/sector-management` per capi settore
- [x] Campo `is_sector_chief` nel modello User
- [x] Gestione utenti del proprio settore

### 5. Login & Identità RP ✅
- [x] `game_name` obbligatorio al primo login
- [x] `game_name` salvato in audit log per ogni azione
- [x] `game_name` mostrato in TopBar

### 6. Blocco Definitivo Demo ✅
- [x] Nessuna scritta "credenziali demo"
- [x] Nessun seed pubblico
- [x] Solo bootstrap admin con chiave sicura

---

## FASE 2 - City Hub ✅ COMPLETATA (2026-02-06)

### 1. Modulo Reclutamento ✅
- [x] API `/api/recruitment/*` complete
- [x] Frontend `/city/recruitment` con 3 tab:
  - Candidati: form per inviare candidatura
  - Le mie candidature: storico personale
  - Gestisci: dashboard per capi settore/admin
- [x] Workflow: PENDING → REVIEWING → ACCEPTED/REJECTED
- [x] Solo capi settore livello 7+ possono revisionare
- [x] Candidature visibili solo al settore di competenza
- [x] Audit logging completo

### 2. Sistema Appuntamenti ✅
- [x] API `/api/appointments/*` complete
- [x] Frontend `/city/appointments` con 4 tab:
  - Richiedi: form per richiedere appuntamento
  - Le mie richieste: storico personale
  - Gestisci: dashboard per operatori settore
  - Calendario: vista appuntamenti confermati
- [x] Workflow: PENDING → ACCEPTED → COMPLETED/CANCELLED
- [x] Urgenza: low, normal, high
- [x] Data preferita e schedulata
- [x] Audit logging completo

### 3. Bacheca Annunci ✅
- [x] API `/api/announcements/*` complete
- [x] Frontend `/city/announcements` con 4 tab:
  - Sfoglia: bacheca pubblica (NO AUTH REQUIRED)
  - Pubblica: form creazione annuncio
  - I miei annunci: gestione personale
  - Moderazione: per GOV livello 3+ e Admin
- [x] Categorie: lavoro, vendita, affitti, servizi, eventi
- [x] Workflow: PENDING → APPROVED/REJECTED
- [x] Scadenza automatica annunci
- [x] Contatore visualizzazioni
- [x] Audit logging completo

### 4. Slot Pubblicitari ✅
- [x] API `/api/advertising/*` complete
- [x] Frontend `/city/advertising` con 3 tab:
  - Richiedi Slot: form per richiedere pubblicità
  - I miei slot: dashboard con statistiche
  - Gestione: approvazione per GOV livello 4+ e Admin
- [x] Posizioni: homepage_banner, sidebar, footer, popup
- [x] Workflow: PENDING → APPROVED → ACTIVE → EXPIRED
- [x] Tracking: views, clicks, CTR
- [x] Audit logging completo

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
- [x] Modalità phone-webview
- [x] SSO FiveM con token monouso

### Stabilizzazione ✅
- [x] Endpoint /api/health
- [x] Banner errore UI quando DB down
- [x] Auto-migrations all'avvio
- [x] SQLite fallback per development

---

## PROSSIMI TASK (P1)

### Weazel News 2.0
- [ ] Portale per la creazione di articoli
- [ ] Workflow approvazione: DRAFT → SUBMITTED → REVIEW → PUBLISHED
- [ ] Permessi di pubblicazione per gradi NEWS
- [ ] Breaking News management

### Service Chat 2.0
- [ ] Chat interna per i dipartimenti
- [ ] Stato presenza utenti (online, in_service, off_duty, offline)
- [ ] Canali per settore
- [ ] Notifiche real-time

### TopBar Globale
- [ ] Navigazione sempre visibile e funzionante
- [ ] Menu contestuale basato su settore/permessi

---

## BACKLOG (P2)

### Miglioramenti UX Admin
- [ ] Link diretto a `/admin` nel menu laterale per admin
- [ ] Notifiche per login falliti multipli
- [ ] Dashboard con grafici temporali

### Affinamento Audit
- [ ] Grafici attività per settore
- [ ] Alert per attività sospette
- [ ] Report schedulati

---

## Credenziali Test

**Admin (Super Admin):**
```
Email: admin@purelife.rp
Password: Admin@2026!
Bootstrap Key: plos-bootstrap-admin-key-2026
```

---

## File Principali

### Backend
- `/app/backend/server.py` - Entry point FastAPI
- `/app/backend/models.py` - Modelli SQLAlchemy completi
- `/app/backend/database.py` - Configurazione DB
- `/app/backend/auth.py` - Autenticazione JWT
- `/app/backend/services/audit_service.py` - Servizio audit
- `/app/backend/routers/recruitment.py` - API Reclutamento
- `/app/backend/routers/appointments.py` - API Appuntamenti
- `/app/backend/routers/announcements.py` - API Annunci
- `/app/backend/routers/advertising.py` - API Pubblicità

### Frontend
- `/app/frontend/src/App.js` - Routing principale
- `/app/frontend/src/components/TopBar.js` - Navigazione
- `/app/frontend/src/context/AuthContext.js` - Stato autenticazione
- `/app/frontend/src/pages/cityhub/RecruitmentPage.js` - Reclutamento
- `/app/frontend/src/pages/cityhub/AppointmentsPage.js` - Appuntamenti
- `/app/frontend/src/pages/cityhub/AnnouncementsPage.js` - Annunci
- `/app/frontend/src/pages/cityhub/AdvertisingPage.js` - Pubblicità
- `/app/frontend/src/pages/public/CityHubPage.js` - Homepage City Hub

### Test
- `/app/backend/tests/test_cityhub_apis.py` - Test API City Hub
- `/app/test_reports/iteration_4.json` - Report test FASE 2

---

## Note Tecniche

### Database
- `DATABASE_URL` di Railway non accessibile da Emergent (usa .internal)
- Fallback automatico a SQLite per development
- Auto-migrations all'avvio

### City Hub Enum Classes
- Le enum del City Hub (`ApplicationStatus`, `AppointmentStatus`, `AnnouncementStatus`, `AdSlotStatus`, `AdSlotPosition`) ereditano da `enum.Enum` (Python), non da SQLAlchemy Enum
- I campi database usano `String(50)` per i valori enum

### Permessi Moderazione
- **Annunci**: GOV livello 3+ o Admin
- **Pubblicità**: GOV livello 4+ o Admin
- **Reclutamento**: Capi settore livello 7+ per il proprio settore, Admin per tutti

---

## Changelog

### 2026-02-06
- ✅ Completata FASE 2 - City Hub
- ✅ Implementati 4 moduli: Reclutamento, Appuntamenti, Annunci, Pubblicità
- ✅ 31/31 test backend passati (100%)
- ✅ Frontend completamente funzionante
