# PURE LIFE OS - PRD (Product Requirements Document)
## Sistema Operativo Governativo RP v3.6.0

**Current Version:** v3.6.0
**Last Updated:** 2026-03-23
**Status:** Production (Deployed on User VPS)

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
- Sidebar navigazione per ruolo

### CITTADINO (NUOVO v3.6.0)
- Dashboard personale con riepilogo (multe, mandati, ticket, documenti, marketplace)
- Visualizzazione proprie multe con filtro e pagamento
- Visualizzazione propri mandati attivi
- Sistema ticket assistenza (crea, rispondi, visualizza stato)
- Consultazione Weazel News
- Quick links a tutti i servizi cittadini
- Candidatura a bandi di lavoro (via Recruitment)
- Prenotazione appuntamenti

### STAFF - Gestione Ticket (NUOVO v3.6.0)
- Dashboard ticket con statistiche (aperti, in corso, risolti, chiusi, urgenti)
- Lista tutti i ticket con filtri per stato e categoria
- Dettaglio ticket con conversazione completa
- Risposte ai ticket (con auto-assegnazione)
- Cambio stato ticket (aperto/in corso/risolto/chiuso)
- Assegnazione ticket a staff specifico

### LSPD (Polizia)
- Dashboard con statistiche (casi aperti, mandati attivi)
- Creazione e gestione casi
- Creazione e gestione mandati (con transizioni di stato)
- Creazione e gestione multe
- Evidenze
- Dispatch (visualizzazione)

### EMS (Emergenze Mediche)
- Dashboard con statistiche
- Gestione pazienti (CRUD)
- Creazione referti medici

### GOV/Justice (Governo/Tribunale)
- Dashboard giustizia
- Creazione casi legali
- Gestione udienze

### DISPATCH
- Creazione chiamate con priorita'
- Statistiche in tempo reale
- Mappa termica zone

### NEWS
- Editor articoli Weazel News
- Pubblicazione notizie

### ADMIN
- Dashboard amministrativa
- Gestione utenti (RBAC)
- Audit log

### lb-phone Integration (NUOVO v3.6.0)
- Coda notifiche persistente nel DB
- Endpoint per polling dal bridge FiveM
- Notifiche automatiche per: nuovo ticket, risposta ticket
- Script Lua per plos_bridge (server/lbphone.lua)
- Supporto SendNotification lb-phone con app, title, content, icon, color, sound

---

## API Testate (100% funzionanti)

### GET (21/21 = 200)
Cases, Warrants, Fines, Patients, Reports, JCases, Hearings, DStats, DCalls, Chat, Market, Docs, News, Timeline, CitizenDashboard, CitizenFines, CitizenWarrants, CitizenProfile, TicketsMy, StaffTicketsAll, StaffTicketsStats

### POST (11/11 = 200)
NewCase, NewWarrant, NewFine, NewPatient, NewReport, NewLCase, NewDCall, ChatMsg, TicketCreate, TicketReply, LBPhoneMarkSent

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

## Deploy sulla VPS - ISTRUZIONI

### 1. Migrazione DB (OBBLIGATORIA)
```bash
mysql -u root -p purelife < migration_v3_5_2.sql
```
Le nuove tabelle (tickets, ticket_messages, lbphone_notifications) si creano automaticamente.

### 2. Deploy Backend
Sostituisci i file Python (NON il .env). Riavvia il servizio.

### 3. Deploy Frontend
Esegui: `REACT_APP_BACKEND_URL=https://api.pureliferp.it yarn build`
Sostituisci i file statici nella cartella build di Caddy.

### 4. lb-phone Bridge
Copia `plos_bridge/server/lbphone.lua` nella risorsa plos_bridge.
Aggiungi `server_script 'server/lbphone.lua'` nel fxmanifest.lua.

---

## Backlog

### P1 - Prossimi
- [ ] Deploy VPS con nuove funzionalita' v3.6.0
- [ ] Cambio password predefinite (sicurezza)
- [ ] Collegare Candidature (Recruitment) per cittadini
- [ ] Collegare Appuntamenti per cittadini

### P2 - Futuro
- [ ] Upload immagini per annunci Marketplace
- [ ] Broadcast Operativo (alert urgenti)
- [ ] Dossier System (profilo cittadino completo)
- [ ] PC Realism Mode (finestre draggable)
