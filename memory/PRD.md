# PURE LIFE OS - PRD (Product Requirements Document)
## Sistema Operativo Governativo RP v3.6.0

**Current Version:** v3.6.0
**Last Updated:** 2026-03-23
**Status:** Production Ready (Tested)

---

## Descrizione del Prodotto

PURE LIFE OS e' un Sistema Operativo Civico Roleplay ULTRA PREMIUM per server GTA FiveM. Un vero OS digitale della citta' con interfaccia premium, performance estreme e funzionalita' avanzate. Obiettivo: sostituire completamente Discord come strumento gestionale.

---

## Architettura

- **Backend:** FastAPI (Python 3.11) su VPS utente `185.229.239.176:8000`
- **Frontend:** React 18 + TailwindCSS (build statica servita da Caddy)
- **Database:** MariaDB su VPS utente (porta 3307)
- **Reverse Proxy:** Caddy con SSL su `https://api.pureliferp.it`
- **FiveM Integration:** Risorsa `plos_bridge` per tablet/phone in-game + lb-phone notifications

---

## Funzionalita' Complete e Testate (v3.6.0)

### Per tutti i ruoli
- Login/Registrazione cittadino
- Chat (canale generale + settoriale)
- Marketplace (compra/vendi)
- Documenti verificabili con QR
- Annunci pubblici (bandi, assistenza)
- Sidebar navigazione per ruolo (con mapping ruolo corretto per LSPD, EMS, ecc.)

### CITTADINO (v3.6.0)
- Dashboard personale con riepilogo (multe, mandati, ticket, documenti, marketplace)
- Visualizzazione proprie multe con filtro e pagamento
- Visualizzazione propri mandati attivi
- Sistema ticket assistenza (crea, rispondi, visualizza stato) - SOLO verso GOV/ADMIN
- Consultazione Weazel News
- Quick links a tutti i servizi cittadini
- Candidatura a bandi di lavoro (via Recruitment in sidebar)
- Prenotazione appuntamenti (via Appuntamenti in sidebar)

### STAFF GOV/ADMIN - Gestione Ticket (v3.6.0)
- Dashboard ticket con statistiche (aperti, in corso, risolti, chiusi, urgenti)
- Lista tutti i ticket con filtri per stato e categoria
- Dettaglio ticket con conversazione completa
- Risposte ai ticket (con auto-assegnazione)
- Cambio stato ticket (aperto/in corso/risolto/chiuso)
- Accesso NEGATO a LSPD/EMS/DISPATCH (403)

### LSPD (Polizia)
- Dashboard con statistiche (casi aperti, mandati attivi)
- Creazione e gestione casi, mandati, multe
- Evidenze, Dispatch
- Notifica lb-phone al cittadino multato

### EMS (Emergenze Mediche)
- Dashboard con statistiche
- Gestione pazienti, referti medici

### GOV/Justice
- Dashboard giustizia, casi legali, udienze

### DISPATCH
- Chiamate con priorita', statistiche, mappa termica

### NEWS/WEAZEL
- Editor articoli Weazel News

### ADMIN
- Dashboard amministrativa, gestione utenti RBAC, audit log

### lb-phone Integration (v3.6.0)
- Coda notifiche persistente nel DB
- Endpoint polling per bridge FiveM (/api/lbphone/notifications/pending)
- Notifiche automatiche: nuovo ticket, risposta ticket, nuova multa, nuovo mandato
- Script Lua lbphone.lua per plos_bridge con SendNotification

---

## Sidebar per Ruolo (CORRETTO v3.6.0)

| Ruolo | Voci Sidebar |
|-------|-------------|
| CITIZEN/CIVIL | PANNELLO, MULTE, MANDATI, ASSISTENZA, NEWS, LAVORO, APPUNTAMENTI, DOCUMENTI, CHAT, MERCATO, SERVIZI |
| LSPD | LSPD, DISPATCH, DOCUMENTI, CHAT, MERCATO, SERVIZI |
| EMS | EMS, DISPATCH, DOCUMENTI, CHAT, MERCATO, SERVIZI |
| DISPATCH | DISPATCH, DOCUMENTI, CHAT, MERCATO, SERVIZI |
| GOV | CITY PULSE, GIUSTIZIA, TICKET, DOCUMENTI, CHAT, MERCATO, SERVIZI |
| ADMIN | CITY PULSE, LSPD, EMS, DISPATCH, GIUSTIZIA, WEAZEL, TICKET, DOCUMENTI, CHAT, MERCATO, SERVIZI, ADMIN |

---

## Credenziali Test

| Ruolo | Email | Password |
|-------|-------|----------|
| Admin | admin@purelife.rp | Admin@2026! |
| LSPD | lspd@purelife.rp | Lspd@2026! |
| EMS | ems@purelife.rp | Ems@2026! |
| Citizen | testflow@purelife.rp | CiaoCiao1! |
| lb-phone bridge | secret: plos-bridge-secret-2026 | |

---

## Deploy v3.6.0 - ISTRUZIONI

### 1. Migrazione DB
```bash
mysql -u root -p purelife < migration_v3_5_2.sql
mysql -u root -p purelife < migration_v3_6_0.sql
```

### 2. Deploy Backend
Sostituisci i file Python. Riavvia il servizio.

### 3. Deploy Frontend
Build gia' pronta in plos_frontend_build.zip. Sostituisci i file in Caddy.

### 4. lb-phone Bridge
Copia lbphone.lua in plos_bridge/server/. Aggiungi al fxmanifest.lua.

---

## Backlog

### P1 - Prossimi
- [ ] Cambio password predefinite (sicurezza)

### P2 - Futuro
- [ ] Upload immagini per annunci Marketplace
- [ ] Broadcast Operativo (alert urgenti)
- [ ] Dossier System (profilo cittadino completo)
- [ ] PC Realism Mode (finestre draggable)
