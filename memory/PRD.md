# PURE LIFE OS - PRD v3.9.1
## Sistema Operativo Governativo RP

**Version:** v3.9.1 | **Updated:** 2026-03-23 | **Status:** Production Ready

---

## Prodotto
PURE LIFE OS - Sistema gestionale completo per FiveM che sostituisce Discord. Tema: Lime Green (#adff2f) + Nero. Ottimizzato per laptop in-game.

## Architettura
- Backend: FastAPI + MariaDB (VPS 185.229.239.176:3307)
- Frontend: React 18 + TailwindCSS
- FiveM: plos_bridge + lb-phone + auto-link

## v3.9.1 - Job Board con Gerarchia Direttori

### Gerarchia Ruoli
1. **ADMIN/GOV**: Crea Job/Dipartimenti, assegna Direttori, gestisce tutto
2. **DIRETTORE** (grado >= 8 nel settore O assegnato manualmente dall'admin): Crea bandi e gestisce candidature per il SUO dipartimento
3. **CITTADINO**: Vede bandi aperti raggruppati per dipartimento, si candida, segue stato

### Come si diventa Direttore
- **Automatico**: Utente con grado >= 8 nel settore corrispondente al codice dipartimento
- **Automatico**: Utente con flag `is_sector_chief` nel settore corrispondente
- **Manuale**: Admin assegna utente come manager nella tabella `job_dept_managers`
- Il capo/direttore puo' anche modificare le info del proprio dipartimento

### Database Schema (Job Board v2.1)
- **job_departments**: id, name, code (UNIQUE), description, icon, color, form_fields, active, created_by
- **job_dept_managers**: id, dept_id (FK), dept_code, user_id, assigned_by, created_at (UNIQUE: dept_id+user_id)
- **job_postings**: id, dept_id (FK), dept_code, title, description, requirements, salary_range, max_slots, filled_slots, location, priority, status, created_by, creator_name
- **job_applications**: id, posting_id (FK), dept_id, dept_code, user_id, game_name, motivation, experience, availability, custom_fields, status, reviewer_id, reviewer_name, reviewer_notes, interview_date

### API Endpoints
- **Dipartimenti (Admin)**:
  - `POST /api/jobs/departments/create`
  - `GET /api/jobs/departments` (include managers_count)
  - `PUT /api/jobs/departments/{id}` (Admin + Direttore)
  - `DELETE /api/jobs/departments/{id}` (Solo Admin)
- **Direttori (Admin)**:
  - `POST /api/jobs/departments/{id}/managers?user_id=X`
  - `GET /api/jobs/departments/{id}/managers`
  - `DELETE /api/jobs/departments/{id}/managers/{user_id}`
  - `GET /api/jobs/users/search?q=xxx`
- **Bandi (Direttori)**:
  - `POST /api/jobs/postings/create?dept_code=XXX`
  - `GET /api/jobs/postings/my-dept` (filtra per dipartimenti gestiti)
  - `PUT /api/jobs/postings/{id}` / `DELETE /api/jobs/postings/{id}`
  - `GET /api/jobs/postings/{id}/applications`
  - `PUT /api/jobs/applications/{id}/review`
  - `GET /api/jobs/dept-stats`
- **Cittadini**:
  - `GET /api/jobs/open`
  - `POST /api/jobs/postings/{id}/apply`
  - `GET /api/jobs/my-applications`

## Credenziali Test
- admin@purelife.rp / Admin123! (ADMIN)
- lspd@purelife.rp / Admin123! (LSPD - assegnato come direttore LSPD)
- ems@purelife.rp / Admin123! (EMS - non assegnato come direttore)
- cittadino@purelife.rp / Admin123! (CIVIL)

## Backlog
- [ ] Cambio password predefinite (P1)
- [ ] Upload immagini Marketplace (P2)
- [ ] Broadcast Operativo (P2)
- [ ] Dossier System (P2)

## Known Technical Debt
- DISABLE_METADATA_PLUGIN=true workaround per build frontend
- Outbox worker enum error (non impatta funzionalita')
