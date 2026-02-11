# PURE LIFE OS - Test Runbook v3.2.0

## 🧪 Come Lanciare i Test

### Backend Tests (pytest)
```bash
cd /app/backend

# Tutti i test
python -m pytest tests/ -v

# Test specifici per iterazione
python -m pytest tests/test_iteration20_phase2.py -v

# Con coverage
python -m pytest tests/ -v --cov=. --cov-report=html
```

### Frontend Tests
```bash
cd /app/frontend

# Jest tests (se configurati)
yarn test

# Lint check
yarn lint
```

### Health Check Rapido
```bash
# Backend health
curl -s https://YOUR_URL/api/health | jq

# Frontend
curl -s https://YOUR_URL/ | head -20
```

---

## 🔑 Credenziali Test

| Ruolo | Email | Password |
|-------|-------|----------|
| Admin | admin@purelife.rp | Admin@2026! |
| Police | police@purelife.rp | Police@2026! |
| EMS | ems@purelife.rp | Ems@2026! |

---

## 📬 API Collection (curl examples)

### Setup
```bash
# Imposta variabili
export API_URL="https://fivem-roleplay-7.preview.emergentagent.com"

# Login e salva token
export TOKEN=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@purelife.rp","password":"Admin@2026!"}' \
  | jq -r '.access_token')

echo "Token: ${TOKEN:0:30}..."
```

---

### A) Evidence CRUD

```bash
# 1. Lista prove per caso
curl -s "$API_URL/api/lspd/evidence/18" \
  -H "Authorization: Bearer $TOKEN" | jq

# 2. Crea prova
curl -s -X POST "$API_URL/api/lspd/evidence" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "case_id": 18,
    "evidence_type": "photo",
    "title": "Foto scena crimine",
    "description": "Fotografia area nord"
  }' | jq

# 3. Elimina prova
curl -s -X DELETE "$API_URL/api/lspd/evidence/5" \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

### B) Warrant Status Lifecycle

```bash
# 1. Crea mandato (status: OPEN)
WARRANT=$(curl -s -X POST "$API_URL/api/lspd/warrants" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "warrant_type": "arrest",
    "suspect_name": "Mario Rossi",
    "reason": "Rapina a mano armata",
    "description": "Sospettato di rapina presso Fleeca Bank"
  }')
WARRANT_ID=$(echo $WARRANT | jq -r '.id')
echo "Warrant ID: $WARRANT_ID"

# 2. Cambia status a EXECUTED
curl -s -X PATCH "$API_URL/api/lspd/warrants/$WARRANT_ID/status?new_status=EXECUTED&reason=Arrestato_sul_posto" \
  -H "Authorization: Bearer $TOKEN" | jq '.status'

# 3. Verifica transizione invalida (deve fallire)
curl -s -X PATCH "$API_URL/api/lspd/warrants/$WARRANT_ID/status?new_status=OPEN&reason=test" \
  -H "Authorization: Bearer $TOKEN" | jq

# Stati validi:
# OPEN → EXECUTED, EXPIRED, CANCELLED
# EXECUTED → (terminale)
# EXPIRED → (terminale)
# CANCELLED → (terminale)
```

---

### C) Fine Edit/Delete con Reason

```bash
# 1. Crea multa (citizen_identifier opzionale)
FINE=$(curl -s -X POST "$API_URL/api/lspd/fines" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "citizen_name": "Luigi Bianchi",
    "amount": 500,
    "reason": "Eccesso di velocità",
    "location": "Vinewood Blvd"
  }')
FINE_ID=$(echo $FINE | jq -r '.id')
echo "Fine ID: $FINE_ID"

# 2. Modifica multa (richiede modification_reason)
curl -s -X PUT "$API_URL/api/lspd/fines/$FINE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 750,
    "modification_reason": "Aggiornato importo per recidiva"
  }' | jq

# 3. Elimina multa (richiede deletion_reason)
curl -s -X DELETE "$API_URL/api/lspd/fines/$FINE_ID?deletion_reason=Multa_annullata_per_errore" \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

### D) Justice - Case + Hearing

```bash
# 1. Crea pratica legale con lawyer_name
CASE=$(curl -s -X POST "$API_URL/api/justice/cases" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Causa civile Rossi vs Bianchi",
    "case_type": "civil",
    "plaintiff_name": "Mario Rossi",
    "defendant_name": "Luigi Bianchi",
    "lawyer_name": "Avv. Giovanni Verdi",
    "description": "Disputa proprietà immobiliare"
  }')
CASE_ID=$(echo $CASE | jq -r '.id')
echo "Legal Case ID: $CASE_ID"

# 2. Crea udienza collegata alla pratica
curl -s -X POST "$API_URL/api/justice/hearings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"legal_case_id\": $CASE_ID,
    \"title\": \"Prima udienza Rossi vs Bianchi\",
    \"scheduled_date\": \"2026-03-01T10:00:00Z\",
    \"courtroom\": \"Aula 1\"
  }" | jq

# 3. Lista pratiche con filtro
curl -s "$API_URL/api/justice/cases?status=draft&limit=10" \
  -H "Authorization: Bearer $TOKEN" | jq

# 4. Lista pratiche in attesa
curl -s "$API_URL/api/justice/cases?status=pending" \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

### E) News/Weazel Create

```bash
# 1. Crea articolo (nota: trailing slash!)
curl -s -X POST "$API_URL/api/news/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Breaking: Nuova apertura Downtown",
    "category": "cronaca",
    "content": "Oggi è stata inaugurata la nuova sede del municipio di Los Santos. Il sindaco ha tagliato il nastro alle ore 10:00.",
    "is_breaking": false
  }' | jq

# 2. Lista articoli
curl -s "$API_URL/api/news/?limit=5" \
  -H "Authorization: Bearer $TOKEN" | jq

# 3. Pubblica articolo
curl -s -X POST "$API_URL/api/news/8/publish" \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

### F) Appointments (Agenda)

```bash
# 1. Crea appuntamento con reminder
curl -s -X POST "$API_URL/api/appointments" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Riunione settimanale LSPD",
    "scheduled_at": "2026-02-20T14:00:00Z",
    "duration_minutes": 60,
    "location": "Sala riunioni HQ",
    "reminder_settings": {
      "t_24h": true,
      "t_1h": true,
      "t_15m": false
    }
  }' | jq

# 2. Vista settimana
curl -s "$API_URL/api/appointments/week" \
  -H "Authorization: Bearer $TOKEN" | jq

# 3. Vista mese
curl -s "$API_URL/api/appointments/calendar/2026/2" \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

### G) Audit Log

```bash
# Lista ultimi audit log
curl -s "$API_URL/api/admin/audit?limit=20" \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

## 🌱 Seed/Demo Data

Per popolare il database con dati demo:

```bash
cd /app/backend

# Script seed (se esiste)
python scripts/seed_demo_data.py

# Oppure via API (usando i curl sopra)
# 1. Crea 3 casi LSPD
# 2. Crea 2 mandati (1 OPEN, 1 EXECUTED)
# 3. Crea 2 multe
# 4. Crea 2 pratiche legali con udienze
# 5. Crea 3 articoli news
# 6. Crea 5 POI sulla mappa
```

---

## 📊 Verification Checklist

| Test | Comando | Expected |
|------|---------|----------|
| Health | `curl $API_URL/api/health` | `{"status":"ok"}` |
| Login | `curl -X POST .../auth/login` | `access_token` presente |
| Evidence list | `GET /lspd/evidence/{id}` | Array (può essere vuoto) |
| Warrant status | `PATCH /lspd/warrants/{id}/status` | `status` aggiornato |
| Fine edit | `PUT /lspd/fines/{id}` | `modification_reason` salvato |
| Justice case | `POST /justice/cases` | `lawyer_name` presente |
| Audit log | `GET /admin/audit` | Array con azioni recenti |

---

## 🚨 Troubleshooting

### Backend non risponde
```bash
sudo supervisorctl status backend
tail -n 50 /var/log/supervisor/backend.err.log
```

### Errore 520/500
```bash
# Verifica logs
tail -f /var/log/supervisor/backend.err.log

# Restart
sudo supervisorctl restart backend
```

### Token scaduto
```bash
# Re-login
export TOKEN=$(curl -s -X POST "$API_URL/api/auth/login" ...)
```

---

## 🔄 FiveM Database Sync (RBAC)

### Configurazione Connessione Automatica (.env)

Aggiungi le seguenti variabili al file `/app/backend/.env`:

```bash
# FiveM Database Auto-Connection
FIVEM_DB_ENABLED=true          # Abilita connessione automatica
FIVEM_DB_HOST=your-fivem-db    # Host del database FiveM
FIVEM_DB_PORT=3306             # Porta MySQL (default 3306)
FIVEM_DB_NAME=essentialmode    # Nome database (es. essentialmode, qb-core)
FIVEM_DB_USER=fivem_user       # Username database
FIVEM_DB_PASS=your_password    # Password database
FIVEM_DB_FRAMEWORK=auto        # Framework: auto, esx, qbcore
```

### Esempio per Server ESX

```bash
FIVEM_DB_ENABLED=true
FIVEM_DB_HOST=mysql.myserver.com
FIVEM_DB_PORT=3306
FIVEM_DB_NAME=essentialmode
FIVEM_DB_USER=esx_readonly
FIVEM_DB_PASS=SecurePassword123!
FIVEM_DB_FRAMEWORK=esx
```

### Esempio per Server QBCore

```bash
FIVEM_DB_ENABLED=true
FIVEM_DB_HOST=mysql.myserver.com
FIVEM_DB_PORT=3306
FIVEM_DB_NAME=qbcore
FIVEM_DB_USER=qb_readonly
FIVEM_DB_PASS=SecurePassword123!
FIVEM_DB_FRAMEWORK=qbcore
```

### API Sync

```bash
# 1. Verifica stato configurazione
curl -s "$API_URL/api/admin/rbac/sync/env-status" \
  -H "Authorization: Bearer $TOKEN" | jq

# 2. Test connessione database FiveM
curl -s -X POST "$API_URL/api/admin/rbac/sync/test-connection" \
  -H "Authorization: Bearer $TOKEN" | jq

# 3. Sync in modalità anteprima (dry-run)
curl -s -X POST "$API_URL/api/admin/rbac/sync" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "auto",
    "mode": "merge",
    "dry_run": true
  }' | jq

# 4. Sync effettivo (applica modifiche)
curl -s -X POST "$API_URL/api/admin/rbac/sync" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "auto",
    "mode": "merge",
    "dry_run": false
  }' | jq

# 5. Sync con URL manuale (ignora .env)
curl -s -X POST "$API_URL/api/admin/rbac/sync" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "esx",
    "mode": "merge",
    "dry_run": true,
    "fivem_db_url": "mysql+aiomysql://user:pass@host:3306/database"
  }' | jq
```

### Troubleshooting Sync

| Errore | Causa | Soluzione |
|--------|-------|-----------|
| `Connection refused` | Host non raggiungibile | Verifica firewall e hostname |
| `Access denied` | Credenziali errate | Controlla user/password in .env |
| `Unknown database` | DB non esiste | Verifica FIVEM_DB_NAME |
| `No framework detected` | Tabelle non trovate | Verifica che il DB contenga tabelle ESX/QBCore |
| `1045 Access denied for user` | Permessi insufficienti | Assicurati che l'utente abbia SELECT sui tables jobs/job_grades |

### Tabelle ESX Richieste

```sql
-- Per ESX il sync legge queste tabelle:
jobs (name, label)
job_grades (job, grade, name, salary)
```

### Tabelle QBCore Richieste

```sql
-- Per QBCore il sync legge:
qb_jobs (name, label, grades JSON)
-- oppure cerca pattern qb_* tables
```

### Sicurezza

⚠️ **Best Practices:**
- Usa un utente MySQL con permessi **SOLO SELECT** (read-only)
- Non usare l'utente root del database FiveM
- Le password non vengono mai esposte al frontend
- I log mascherano automaticamente le credenziali

```sql
-- Esempio creazione utente read-only per sync
CREATE USER 'plos_sync'@'%' IDENTIFIED BY 'StrongPassword!';
GRANT SELECT ON essentialmode.jobs TO 'plos_sync'@'%';
GRANT SELECT ON essentialmode.job_grades TO 'plos_sync'@'%';
FLUSH PRIVILEGES;
```

