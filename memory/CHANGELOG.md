# PURE LIFE OS - Changelog

## [v3.3.0] - 2026-02-11

### 🎯 P1 Admin - Sistema RBAC Completo

| Componente | Descrizione |
|------------|-------------|
| **Tabelle DB** | `jobs`, `job_grades`, `permissions`, `job_grade_permissions`, `user_permission_overrides`, `staff_roles`, `user_staff_roles` |
| **Middleware** | `rbac.py` - RBACService con require_permission(), require_staff() |
| **Router** | `/api/admin/rbac/*` - 15 endpoint per gestione completa |
| **Frontend** | `AdminRBACPage.js` - UI 100% italiano con 5 tabs |

#### Gerarchie Implementate (100% Italiane)
- **LSPD**: 13 gradi (da Recluta a Capo della Polizia) in 5 categorie
- **EMS**: 6 gradi (da Soccorritore a Direttore Sanitario)
- **Giustizia**: 5 gradi (da Avvocato a Procuratore Generale)
- **Weazel News**: 5 gradi (da Reporter a Direttore Editoriale)
- **Meccanico/Taxi/etc**: Gerarchie realistiche complete

#### Funzionalità
- Assegnazione job/grado a utenti
- Ruoli staff separati (Moderatore, Admin, Super Admin)
- Override permessi con scadenza
- Audit log completo con filtri ed export

---

## [v3.2.0] - 2026-02-11

### 🎯 Sprint Bug Fix A-F (CHIUSO)

| ID | Feature | Modifiche | Files |
|----|---------|-----------|-------|
| **A** | **Prove Casi** | CRUD prove collegato a case_id, tab "Prove (N)" con conteggio, grid view + delete | `lspd.py`, `CaseDetailPage.js` |
| **B** | **Stati Mandati** | Ciclo vita OPEN→EXECUTED/EXPIRED/CANCELLED, validazione transizioni server-side, badge colorati | `lspd.py`, `WarrantsListPage.js` |
| **C** | **Modifica Multe** | PUT/DELETE con reason obbligatoria, ownership (creatore o hierarchy_level≥7) | `lspd.py`, `FinesListPage.js` |
| **D** | **Giustizia** | Campo `lawyer_name` in pratiche, selezione pratiche in udienze, lista pratiche cliccabile | `justice.py`, `schemas.py`, `JusticePage.js` |
| **E** | **Weazel Editor** | Textarea con stili inline, focus/scroll funzionante | `NewsEditorPage.js` |
| **F** | **ID Cittadino** | Campo `citizen_identifier` reso opzionale nelle multe | `schemas.py`, `NewFinePage.js` |

### 🔧 Fix Tecnici
- `Evidence.created_at` → `Evidence.collected_at` (allineamento modello)
- `LegalCaseBase.lawyer_name` aggiunto allo schema Pydantic
- `AuditLog` endpoint corretto (`timestamp` invece di `created_at`)

### 🚀 Fase 2 - Sistema Reminder & Audit
- Background scheduler reminder ogni 60s (24h, 1h, 15min)
- Audit log integrato in appointments, LSPD (cases, warrants, fines)
- CityPulse POI click → evento NUI `PLOS_SET_WAYPOINT`

---

## [v3.1.0] - 2026-02-10

### FiveM NUI Integration
- Handshake auth `/api/nui/handshake`
- JWT short-lived (12 min) + auto-refresh
- WebSocket engine con canali NUI
- NUIContext bridge postMessage

### Sistema RP Completo
- Prove casi, ciclo vita mandati, permessi multe
- Mappa POI custom CityPulse

---

## Upgrade Notes v3.2.0

### Prerequisiti
```bash
# 1. Backup database
mysqldump -u root -p purelife_os > backup_v3.1.0.sql

# 2. Esegui migrazioni (vedi /app/migrations/v3.2.0.sql)
mysql -u root -p purelife_os < /app/migrations/v3.2.0.sql

# 3. Restart services
sudo supervisorctl restart backend frontend
```

### Breaking Changes
- Nessuno

### Deprecations
- Nessuno

---

## Version History

| Version | Date | Description |
|---------|------|-------------|
| v3.2.0 | 2026-02-11 | Sprint A-F + Fase 2 Reminder/Audit |
| v3.1.0 | 2026-02-10 | FiveM NUI + Sistema RP |
| v3.0.x | 2026-02-08 | Performance + UI OS-Style |
