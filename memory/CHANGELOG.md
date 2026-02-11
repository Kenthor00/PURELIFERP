# PURE LIFE OS - Changelog

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
