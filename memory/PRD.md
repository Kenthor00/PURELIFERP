# PURE LIFE OS (PLOS) - Product Requirements Document

## Panoramica
Sistema Operativo Digitale per server FiveM PURE LIFE RP.
Un ecosistema unico per browser desktop, tablet di reparto e WebView lb-phone.

## Architettura
- **Backend**: FastAPI (Python) con MySQL (Railway esterno)
- **Frontend**: React + TailwindCSS
- **Database**: MySQL su Railway (via DATABASE_URL)
- **Realtime**: Server-Sent Events (SSE)
- **Auth**: JWT custom + FiveM SSO

## Deployment
- **Platform**: Emergent
- **Database**: Railway MySQL (esterno)
- **Env Var**: `DATABASE_URL` iniettata da Railway

---

## COMPLETATO

### Fase 1 - MVP ✅
- [x] Autenticazione JWT con RBAC
- [x] Modulo LSPD (casi, mandati, multe)
- [x] Modulo EMS (pazienti, referti)
- [x] Dispatch Center
- [x] Timeline globale
- [x] SSE per realtime

### Fase 2 - Espansione ✅
- [x] City Hub pubblico (eventi, annunci)
- [x] Weazel News (articoli, breaking news)
- [x] Service Chat (canali, messaggi)
- [x] Governo & Giustizia (udienze, pratiche)
- [x] Deep linking per lb-phone

### Stabilizzazione P0 ✅
- [x] Endpoint /api/health con JSON strutturato
- [x] App si avvia anche senza DB (stato degradato)
- [x] Banner errore UI quando DB down
- [x] Login disabilitato quando sistema degradato
- [x] Auto-migrations all'avvio
- [x] Auto-seed se DB vuoto

### lb-phone Integration ✅
- [x] Rimozione X-Frame-Options per embedding
- [x] CSP frame-ancestors *
- [x] Modalità phone-webview (reduced motion)
- [x] SSO FiveM con token monouso
- [x] Deep link funzionanti in iframe

### Database Railway ✅ (04/02/2026)
- [x] Supporto DATABASE_URL
- [x] Conversione mysql:// → mysql+aiomysql://
- [x] Rimossi riferimenti localhost
- [x] Auto-seed all'avvio se DB vuoto
- [x] Graceful degradation senza DB

---

## Credenziali Demo
Password: `demo123`

| Email | Ruolo |
|-------|-------|
| admin@purelife.rp | Admin |
| lspd@purelife.rp | Police |
| ems@purelife.rp | EMS |
| dispatch@purelife.rp | Dispatch |
| gov@purelife.rp | Government |
| judge@purelife.rp | Judge |
| lawyer@purelife.rp | Lawyer |
| weazel@purelife.rp | Weazel News |
| citizen@purelife.rp | Citizen |

---

## Deep Link (lb-phone)
```
?open=city        → /city
?open=news        → /city/news
?open=event&id=X  → /city/events/X
?open=lspd        → /lspd (auth)
?open=ems         → /ems (auth)
?open=dispatch    → /dispatch (auth)
?open=timeline    → /timeline (auth)
?open=chat        → /chat (auth)
?open=justice     → /justice (auth)
?phone=1          → modalità ridotta
?sso=TOKEN        → auto-login FiveM
```

---

## Endpoint Chiave
- `GET /api/health` - Stato sistema
- `POST /api/auth/login` - Login
- `POST /api/admin/seed` - Seed manuale (admin/SEED_KEY)
- `POST /api/fivem/sso` - Crea token SSO
- `POST /api/fivem/sso/exchange` - Scambia token per JWT

---

## File Chiave
- `/app/backend/database.py` - Connessione DATABASE_URL
- `/app/backend/server.py` - Entry point + auto-seed
- `/app/backend/.env` - Config (no DB credentials)
- `/app/frontend/src/App.js` - Routing + SSO handler
