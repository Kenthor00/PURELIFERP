# PURE LIFE OS (PLOS)

Sistema Operativo Digitale per server FiveM - PURE LIFE RP

## 📋 Panoramica

PURE LIFE OS è una piattaforma professionale che include:
- **Portale LSPD** - MDT Polizia con gestione casi, mandati, multe
- **Portale EMS** - Sistema ospedaliero con pazienti e referti
- **Dispatch Center** - Centro comando con chiamate P1/P2/P3
- **Timeline Globale** - Feed eventi unificato

## 🛠️ Stack Tecnologico

- **Backend**: FastAPI (Python)
- **Frontend**: React
- **Database**: MySQL
- **Realtime**: Server-Sent Events (SSE)
- **Auth**: JWT + FiveM SSO

## 🚀 Installazione

### 1. Database MySQL

```sql
-- Crea database e importa schema
mysql -u root -p < backend/schema.sql
```

### 2. Configurazione Backend

```bash
cd backend
cp .env.example .env
# Modifica .env con le tue credenziali MySQL
```

### 3. Variabili Ambiente (.env)

```env
# MySQL Database
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=purelife_user
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=purelife_os

# JWT
JWT_SECRET=your-secret-key-min-32-chars
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=60
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# FiveM SSO (rotazione chiavi)
FIVEM_SECRET_CURRENT=your-current-secret
FIVEM_SECRET_PREVIOUS=your-previous-secret

# CORS
CORS_ORIGINS=https://your-domain.com
```

### 4. Avvio Servizi

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001

# Frontend
cd frontend
yarn install
yarn start
```

## 🔐 Autenticazione

### Login Standard
```
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password"
}
```

### FiveM SSO
```
POST /api/auth/fivem/exchange
Header: X-FIVEM-SECRET: <secret>
{
  "identifier": "steam:xxxxx",
  "job": "police",
  "grade": 5,
  "name": "Nome Cognome",
  "phone_number": "555-1234"
}
```

## 👥 Ruoli RBAC

| Ruolo | Accesso |
|-------|---------|
| `police` | LSPD, Dispatch (view) |
| `ems` | EMS, Dispatch (view) |
| `dispatch` | Dispatch, LSPD (view), EMS (view) |
| `admin` | Tutto |

## 📱 Deep Links (lb-phone)

- `/auth/fivem?open=dispatch` → Apre Dispatch
- `/auth/fivem?open=case&id=123` → Apre caso specifico
- `/auth/fivem?open=patient&id=456` → Apre paziente specifico

## 🔄 FiveM Integration

### Rotazione Chiavi
Il sistema supporta due chiavi FiveM simultaneamente:
- `FIVEM_SECRET_CURRENT` - Chiave attuale
- `FIVEM_SECRET_PREVIOUS` - Chiave precedente (accettata per 24h)

Per ruotare:
1. Sposta `FIVEM_SECRET_CURRENT` in `FIVEM_SECRET_PREVIOUS`
2. Genera nuova `FIVEM_SECRET_CURRENT`
3. Aggiorna il server FiveM

## 📤 Prism Billing (Outbox Pattern)

Il sistema include un adapter per Prism Billing:
- Tabella `outbox` per eventi
- Worker con retry/backoff
- Adapter layer in `/backend/outbox_worker.py`

Per integrare:
1. Modifica `prism_billing_fine_handler()` in `outbox_worker.py`
2. Aggiungi credenziali Prism in `.env`

## 🔊 Suoni UI

I suoni sono generati via WebAudio (nessun file):
- `click` - Interazioni
- `success` - Operazioni completate
- `error` - Errori
- `alert` - Avvisi
- `notification` - Notifiche
- `dispatch` - Chiamate dispatch

Toggle ON/OFF in Impostazioni utente.

## 📦 Struttura Progetto

```
/backend
├── server.py          # Main FastAPI app
├── database.py        # MySQL config
├── models.py          # SQLAlchemy models
├── schemas.py         # Pydantic schemas
├── auth.py            # JWT + FiveM auth
├── utils.py           # Utilities
├── sse_manager.py     # SSE realtime
├── outbox_worker.py   # Prism Billing worker
├── schema.sql         # MySQL schema
└── routers/
    ├── auth.py        # Auth endpoints
    ├── lspd.py        # LSPD endpoints
    ├── ems.py         # EMS endpoints
    ├── dispatch.py    # Dispatch endpoints
    └── timeline.py    # Timeline endpoints

/frontend
├── src/
│   ├── App.js
│   ├── context/       # Auth, SSE, Sound contexts
│   ├── components/    # UI components
│   └── pages/         # Page components
│       ├── lspd/
│       ├── ems/
│       └── ...
```

## 🔒 Sicurezza

- ✅ RBAC backend
- ✅ Rate limiting (implementare con slowapi se necessario)
- ✅ Validazione input (Pydantic)
- ✅ Audit log
- ✅ JWT con refresh token
- ✅ FiveM secret rotation

## 👨‍💻 Credenziali Demo

```
Admin: admin@purelife.rp / demo123
LSPD: lspd@purelife.rp / demo123
EMS: ems@purelife.rp / demo123
Dispatch: dispatch@purelife.rp / demo123
```

## 📄 Licenza

© 2024 PURE LIFE RP - Tutti i diritti riservati
