# PURE LIFE OS - PRD (Product Requirements Document)
## Sistema Operativo Governativo RP v3.5.1

**Current Version:** v3.5.1  
**Last Updated:** 2026-03-23  
**Status:** Production (Deployed on User VPS)

---

## Descrizione del Prodotto

PURE LIFE OS e' un Sistema Operativo Civico Roleplay ULTRA PREMIUM per server GTA FiveM. Un vero OS digitale della citta' con interfaccia premium, performance estreme e funzionalita' avanzate.

---

## Architettura

- **Backend:** FastAPI (Python 3.11) su VPS utente `185.229.239.176:8000`
- **Frontend:** React 18 + TailwindCSS (build statica servita da Caddy)
- **Database:** MariaDB su VPS utente (porta 3307)
- **Reverse Proxy:** Caddy con SSL su `https://api.pureliferp.it`
- **FiveM Integration:** Risorsa `plos_bridge` per tablet/phone in-game

---

## Fasi Completate

### FASE 1-4 - Sistema Base + City Hub + News + Chat
### FASE 5 - Bug Fix e Stabilizzazione
### P0 - Performance Extreme (Cache, WebSocket, Indici DB)
### P1 - UI OS-Style + Command Palette + City Pulse + Delete Universale
### P1 - Admin RBAC (Job, Gradi, Permessi, Staff)
### P1 - Documenti Verificabili con QR
### P1 - Marketplace Annunci
### P1.1 - Sync FiveM (ESX/QBCore)
### FiveM NUI Integration (Handshake, JWT, WebSocket, NUI Bridge)
### Deploy VPS + Troubleshooting (DB, CORS, credenziali, build)

---

## Stato Attuale (23/03/2026)

### v3.5.1 - Fix Frontend Build per HTTPS
- Aggiornato URL API da `http://185.229.239.176:8000` a `https://api.pureliferp.it`
- Risolto problema `craco.config.js` che sovrascriveva `.env.production` con `.env`
- Build di produzione rigenerata e verificata (22 riferimenti corretti, 0 vecchi)
- ZIP fornito all'utente per deploy su VPS

---

## Credenziali Test

| Ruolo | Email | Password |
|-------|-------|----------|
| Admin | admin@purelife.rp | Admin@2026! |
| LSPD | lspd@purelife.rp | Lspd@2026! |
| EMS | ems@purelife.rp | Ems@2026! |

---

## Backlog

### P1 - In attesa verifica utente
- [ ] Conferma funzionamento HTTPS da NUI FiveM dopo deploy nuovo frontend

### P1 - Sicurezza
- [ ] Cambio password predefinite account dipartimentali
- [ ] Configurazione HTTPS completa (gia' in corso con Caddy)

### P2 - Funzionalita'
- [ ] Notifiche Discord per mandati alta priorita'
- [ ] Upload immagini per annunci Marketplace
- [ ] PC Realism Mode (finestre draggable, snap layout)
- [ ] Dossier System (profilo cittadino completo)
- [ ] Broadcast Operativo (alert urgenti)

---

## Note Tecniche

- Il `craco.config.js` contiene `require("dotenv").config()` che sovrascrive `.env.production`. Per build corrette, usare: `REACT_APP_BACKEND_URL=https://api.pureliferp.it yarn build`
- L'utente gestisce il deploy sulla propria VPS. Fornire sempre ZIP pronti.
- L'utente non e' tecnico: istruzioni sempre chiare e passo-passo.
