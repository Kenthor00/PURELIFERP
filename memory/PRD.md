# PURE LIFE OS - PRD (Product Requirements Document)
## Sistema Operativo Governativo RP v3.6.1

**Current Version:** v3.6.1
**Last Updated:** 2026-03-23
**Status:** Production Ready (Tested)

---

## Descrizione del Prodotto

PURE LIFE OS e' un Sistema Operativo Civico Roleplay ULTRA PREMIUM per server GTA FiveM. Un vero OS digitale della citta' con interfaccia premium, performance estreme e funzionalita' avanzate. Obiettivo: sostituire completamente Discord come strumento gestionale.

---

## Architettura

- **Backend:** FastAPI (Python 3.11) su VPS utente
- **Frontend:** React 18 + TailwindCSS (build statica servita da Caddy)
- **Database:** MariaDB su VPS utente (porta 3307)
- **Reverse Proxy:** Caddy con SSL su https://api.pureliferp.it
- **FiveM Integration:** plos_bridge (tablet/phone in-game) + lb-phone notifications + auto-link account

---

## Funzionalita' Complete e Testate (v3.6.1)

### Auto-Link Account FiveM (NUOVO v3.6.1)
- Collegamento automatico account PLOS <-> identifier FiveM
- Quando il player accede dal tablet in-game, il bridge (server-side Lua) chiama il backend con l'identifier
- Endpoint sicuro con bridge_secret (server-to-server)
- Endpoint alternativo JWT + bridge_secret per il frontend
- Dashboard mostra stato collegamento (verde = collegato, giallo = non collegato)
- Identifiers supportati: license, steam, fivem, discord (priorita')
- Cache session-level per evitare ri-link inutili
- Notifica lb-phone al player quando il collegamento avviene

### Per tutti i ruoli
- Login/Registrazione cittadino
- Chat, Marketplace, Documenti verificabili con QR, Annunci pubblici
- Sidebar navigazione corretta per ruolo

### CITTADINO
- Dashboard personale con riepilogo e stato FiveM link
- Visualizzazione multe con filtro e pagamento
- Visualizzazione mandati attivi
- Sistema ticket assistenza (SOLO verso GOV/ADMIN)
- Consultazione Weazel News
- Candidatura bandi di lavoro (Recruitment)
- Prenotazione appuntamenti

### STAFF GOV/ADMIN - Gestione Ticket
- Dashboard ticket con statistiche
- Lista/filtri/dettaglio/risposte/cambio stato
- Accesso NEGATO a LSPD/EMS/DISPATCH

### LSPD, EMS, GOV/Justice, DISPATCH, NEWS, ADMIN
- Tutte le funzionalita' specifiche di ruolo (complete)

### lb-phone Integration
- Coda notifiche persistente nel DB
- Endpoint polling per bridge FiveM
- Notifiche automatiche: ticket, risposte, multe, mandati
- Script Lua lbphone.lua + autolink.lua per plos_bridge

---

## Sidebar per Ruolo

| Ruolo | Voci Sidebar |
|-------|-------------|
| CITIZEN/CIVIL | PANNELLO, MULTE, MANDATI, ASSISTENZA, NEWS, LAVORO, APPUNTAMENTI, DOCUMENTI, CHAT, MERCATO, SERVIZI |
| LSPD | LSPD, DISPATCH, DOCUMENTI, CHAT, MERCATO, SERVIZI |
| EMS | EMS, DISPATCH, DOCUMENTI, CHAT, MERCATO, SERVIZI |
| GOV | CITY PULSE, GIUSTIZIA, TICKET, DOCUMENTI, CHAT, MERCATO, SERVIZI |
| ADMIN | CITY PULSE, LSPD, EMS, DISPATCH, GIUSTIZIA, WEAZEL, TICKET, DOCUMENTI, CHAT, MERCATO, SERVIZI, ADMIN |

---

## API Nuove (v3.6.1)

- POST /api/auth/link-fivem (bridge secret, server-to-server)
- POST /api/auth/link-fivem-token (JWT + bridge secret)
- GET /api/auth/fivem-status (stato collegamento)

---

## Deploy v3.6.1 - ISTRUZIONI

1. Migrazione DB: migration_v3_5_2.sql + migration_v3_6_0.sql
2. Deploy Backend (plos_backend.zip)
3. Deploy Frontend (plos_frontend_build.zip)
4. Deploy Bridge (plos_bridge.zip) - include autolink.lua + lbphone.lua
5. fxmanifest.lua aggiornato automaticamente

---

## Backlog

### P1
- [ ] Cambio password predefinite (sicurezza)

### P2
- [ ] Upload immagini Marketplace
- [ ] Broadcast Operativo (alert urgenti)
- [ ] Dossier System (profilo cittadino completo)
- [ ] PC Realism Mode (finestre draggable)
