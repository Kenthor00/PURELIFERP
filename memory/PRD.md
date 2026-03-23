# PURE LIFE OS - PRD v3.9.0
## Sistema Operativo Governativo RP

**Version:** v3.9.0 | **Updated:** 2026-03-23 | **Status:** Production Ready

---

## Prodotto
PURE LIFE OS - Sistema gestionale completo per FiveM che sostituisce Discord. Tema: Lime Green (#adff2f) + Nero. Ottimizzato per laptop in-game (1280x720).

## Architettura
- Backend: FastAPI + MariaDB (VPS 185.229.239.176:3307)
- Frontend: React 18 + TailwindCSS (build statica)
- FiveM: plos_bridge + lb-phone + auto-link

## v3.9.0 - Job Board Multi-Dipartimento (NUOVO)

### Admin - Gestione Dipartimenti
- Crea dipartimenti con: nome, codice (LSPD/EMS/MECH...), descrizione, icona FA, colore
- Attiva/disattiva dipartimenti
- Elimina dipartimenti (cascade su bandi e candidature)
- Dashboard con statistiche globali

### Staff Dipartimento - Gestione Bandi
- Ogni staff vede SOLO i bandi del proprio dipartimento (LSPD vede LSPD, EMS vede EMS...)
- Crea bandi con: titolo, descrizione, requisiti, stipendio, posti, luogo, priorita'
- Pausa/riapri/chiudi/elimina bandi
- Gestisci candidature: revisione, colloquio (con data), accettazione, rifiuto
- Notifiche lb-phone al cittadino quando la candidatura viene aggiornata

### Cittadino - Bandi di Lavoro
- Esplora bandi aperti **raggruppati per dipartimento** con colori e icone
- Candidati con motivazione, esperienza, disponibilita'
- Segui lo stato delle candidature (In Attesa, In Revisione, Colloquio, Accettato, Rifiutato)
- Note staff e data colloquio visibili

### Regole Accesso (RBAC)
- **Dipartimenti**: SOLO Admin/GOV possono crearli/modificarli/eliminarli
- **Bandi**: Staff di OGNI settore puo' creare bandi per il PROPRIO dipartimento
- **Candidature**: Staff gestisce SOLO le candidature del proprio dipartimento
- **Cittadini**: Possono solo visualizzare bandi e candidarsi
- **Ticket**: SOLO GOV/ADMIN gestiscono, cittadini creano
- **LSPD/EMS/DISPATCH**: Accesso a gestione bandi del proprio dipartimento, NO a ticket

## Sidebar per Ruolo
- CITIZEN: PANNELLO, MULTE, MANDATI, ASSISTENZA, NEWS, LAVORO, APPUNTAMENTI, DOCUMENTI, CHAT, MERCATO, SERVIZI
- LSPD/EMS/DISPATCH/NEWS: Sezioni specifiche + BANDI (gestione proprio dipartimento) + DOCUMENTI, CHAT, MERCATO, SERVIZI
- GOV: CITY PULSE, GIUSTIZIA, TICKET, BANDI, DOCUMENTI, CHAT, MERCATO, SERVIZI
- ADMIN: Tutti + ADMIN

## Database Schema (Job Board v2)
- **job_departments**: id, name, code (UNIQUE), description, icon, color, form_fields, active, created_by
- **job_postings**: id, dept_id (FK), dept_code, title, description, requirements, salary_range, max_slots, filled_slots, location, priority, status, created_by, creator_name
- **job_applications**: id, posting_id (FK), dept_id, dept_code, user_id, game_name, motivation, experience, availability, custom_fields, status, reviewer_id, reviewer_name, reviewer_notes, interview_date

## API Endpoints (Job Board v2)
- `POST /api/jobs/departments/create` - Admin crea dipartimento
- `GET /api/jobs/departments` - Lista dipartimenti con stats
- `PUT /api/jobs/departments/{id}` - Admin modifica dipartimento
- `DELETE /api/jobs/departments/{id}` - Admin elimina dipartimento
- `POST /api/jobs/postings/create?dept_code=XXX` - Staff crea bando
- `GET /api/jobs/postings/my-dept` - Staff vede bandi del proprio dipartimento
- `PUT /api/jobs/postings/{id}` - Staff modifica bando
- `DELETE /api/jobs/postings/{id}` - Staff elimina bando
- `GET /api/jobs/postings/{id}/applications` - Staff vede candidature
- `PUT /api/jobs/applications/{id}/review` - Staff gestisce candidatura
- `GET /api/jobs/dept-stats` - Statistiche dipartimento
- `GET /api/jobs/open` - Cittadino vede bandi aperti
- `POST /api/jobs/postings/{id}/apply` - Cittadino si candida
- `GET /api/jobs/my-applications` - Cittadino vede candidature

## Deploy v3.9.0
1. Backend: plos_backend.zip (richiede .env con DATABASE_URL, JWT_SECRET, ecc.)
2. Frontend: plos_frontend_build.zip (build statica, servire con nginx)
3. Bridge: plos_bridge.zip (FiveM resource con lb-phone e autolink)
4. Le tabelle job_departments, job_postings, job_applications vengono create automaticamente

## Credenziali Test
- admin@purelife.rp / Admin123! (ADMIN)
- lspd@purelife.rp / Admin123! (LSPD)
- ems@purelife.rp / Admin123! (EMS)
- cittadino@purelife.rp / Admin123! (CIVIL)

## Backlog
- [ ] Cambio password predefinite (P1)
- [ ] Upload immagini Marketplace (P2)
- [ ] Broadcast Operativo (P2)
- [ ] Dossier System (P2)

## Known Technical Debt
- DISABLE_METADATA_PLUGIN=true workaround per build frontend (bassa priorita')
