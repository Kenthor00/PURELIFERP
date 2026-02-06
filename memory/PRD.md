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
- **Realtime**: Server-Sent Events (SSE) + Polling notifiche
- **Auth**: JWT custom + FiveM SSO + RBAC avanzato per settori

---

## FASE 1 - Sistema Operativo Governativo ✅ COMPLETATA

### Funzionalità Completate
- [x] Sistema Login Avanzato con JWT, settore, grado, livello_gerarchico
- [x] Campo `game_name` obbligatorio al primo accesso
- [x] `is_sector_chief` per identificare i capi settore
- [x] Gerarchia e Permessi Multi-livello con PERMISSION_MATRIX
- [x] Admin System Completo (Dashboard, Gestione Utenti, Audit Dashboard)
- [x] Gestione Reparto per Capi Settore (`/sector-management`)
- [x] Blocco Definitivo Demo (nessun seed pubblico)

---

## FASE 2 - City Hub Base ✅ COMPLETATA

### Funzionalità Completate
- [x] Modulo Reclutamento con workflow PENDING → REVIEWING → ACCEPTED/REJECTED
- [x] Sistema Appuntamenti con gestione richieste e calendario
- [x] Bacheca Annunci con moderazione e tracking views
- [x] Slot Pubblicitari con gestione manuale Admin/GOV

---

## FASE 3 - City Hub Avanzato ✅ COMPLETATA (2026-02-06)

### 1. Sistema Notifiche Real-Time ✅
- [x] Modello `Notification` con tipo, titolo, messaggio, entità riferita
- [x] API `/api/notifications/*` complete (count, list, read, read-all)
- [x] Notifiche automatiche per tutti gli eventi City Hub:
  - Nuova candidatura → capi settore
  - Cambio stato candidatura → candidato
  - Nuovo appuntamento → settore target
  - Accettazione/rifiuto appuntamento → richiedente
  - Nuovo annuncio → GOV/Admin (globale)
  - Moderazione annuncio → autore
  - Richiesta slot pubblicitario → GOV/Admin (globale)
  - Approvazione/rifiuto slot → proprietario
- [x] Regole di visibilità:
  - Capi settore → notifiche SOLO del proprio settore
  - GOV/Admin → notifiche globali
- [x] Polling ogni 15 secondi per aggiornamento automatico

### 2. Reclutamento 2.0 ✅
- [x] Nuovo stato `INTERVIEW` (Colloquio) nel workflow
- [x] Workflow: PENDING → REVIEWING → INTERVIEW → ACCEPTED/REJECTED
- [x] Campi colloquio: `interview_assigned_to`, `interview_assigned_name`, `interview_notes`, `interview_scheduled_at`
- [x] Filtri per stato nella tab Gestisci
- [x] Ordinamento per data (più recenti/meno recenti)
- [x] Modal profilo candidato con tutti i dettagli
- [x] Stats card con conteggio per ogni stato incluso Colloquio

### 3. Calendario Appuntamenti ✅
- [x] Vista lista (default)
- [x] Vista calendario mensile con griglia giorni
- [x] Navigazione mese precedente/successivo
- [x] Appuntamenti visualizzati sui giorni corretti con orario
- [x] Indicatore "oggi" evidenziato
- [x] Stati colorati:
  - 🟡 In attesa (pending)
  - 🟢 Accettato (accepted)
  - 🔴 Rifiutato (rejected)
  - 🔵 Completato (completed)

### 4. TopBar Avanzata ✅
- [x] Campanella notifiche con badge contatore
- [x] Dropdown lista notifiche con:
  - Titolo e messaggio
  - Icona per tipo (UserPlus, Calendar, Megaphone, Tv)
  - Tempo relativo ("Ora", "5m fa", "2h fa")
  - Indicatore non letto (pallino colorato)
  - Link diretto alla risorsa
- [x] "Segna tutte lette" button
- [x] Menu rapido hamburger con:
  - City Hub, Reclutamento, Appuntamenti, Annunci, Pubblicità
  - Link settoriali (LSPD, EMS, Dispatch, News)
  - Admin (solo per Admin)
- [x] Compatibilità Desktop/iframe/lb-phone
- [x] Info utente visibile (game_name, grade) su desktop

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

---

## BACKLOG (P2)

### Miglioramenti UX Admin
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
- `/app/backend/models.py` - Modelli SQLAlchemy (User, Notification, RecruitmentApplication, Appointment, Announcement, AdvertisingSlot)
- `/app/backend/routers/notifications.py` - API Notifiche
- `/app/backend/routers/recruitment.py` - API Reclutamento 2.0
- `/app/backend/routers/appointments.py` - API Appuntamenti con calendario
- `/app/backend/routers/announcements.py` - API Annunci
- `/app/backend/routers/advertising.py` - API Pubblicità

### Frontend
- `/app/frontend/src/components/TopBar.js` - TopBar con campanella e menu
- `/app/frontend/src/pages/cityhub/RecruitmentPage.js` - Reclutamento 2.0
- `/app/frontend/src/pages/cityhub/AppointmentsPage.js` - Appuntamenti con calendario
- `/app/frontend/src/pages/cityhub/AnnouncementsPage.js` - Annunci
- `/app/frontend/src/pages/cityhub/AdvertisingPage.js` - Pubblicità

### Test
- `/app/backend/tests/test_notifications_and_upgrades.py` - Test nuove funzionalità
- `/app/test_reports/iteration_5.json` - Report test FASE 3

---

## Note Tecniche

### Sistema Notifiche
- **NotificationType enum**: RECRUITMENT_NEW, RECRUITMENT_STATUS_CHANGE, RECRUITMENT_INTERVIEW, APPOINTMENT_NEW, APPOINTMENT_ACCEPTED, APPOINTMENT_REJECTED, APPOINTMENT_COMPLETED, ANNOUNCEMENT_PENDING, ANNOUNCEMENT_APPROVED, ANNOUNCEMENT_REJECTED, AD_SLOT_REQUESTED, AD_SLOT_ACTIVATED, AD_SLOT_EXPIRED, AD_SLOT_REJECTED, SYSTEM_ALERT
- **Targeting**: `user_id` per notifica diretta, `target_sector` per capi settore, `is_global=True` per GOV/Admin

### Workflow Reclutamento
- **Stati**: pending, reviewing, interview, accepted, rejected
- **Transizioni valide**:
  - pending → reviewing, interview, accepted, rejected
  - reviewing → interview, accepted, rejected
  - interview → accepted, rejected

### Permessi Moderazione
- **Annunci**: GOV livello 3+ o Admin
- **Pubblicità**: GOV livello 4+ o Admin
- **Reclutamento**: Capi settore livello 7+ per il proprio settore, Admin per tutti

---

## Changelog

### 2026-02-06 (Sessione 2)
- ✅ Completata FASE 3 - City Hub Avanzato
- ✅ Sistema Notifiche Real-Time implementato
- ✅ Reclutamento 2.0 con workflow Colloquio
- ✅ Calendario Appuntamenti mensile
- ✅ TopBar con campanella e menu rapido
- ✅ 43/43 test backend passati (100%)
- ✅ Fix colonne interview nel database

### 2026-02-06 (Sessione 1)
- ✅ Completata FASE 2 - City Hub Base
- ✅ 31/31 test backend passati (100%)
