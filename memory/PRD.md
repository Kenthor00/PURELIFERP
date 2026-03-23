# PURE LIFE OS - PRD (Product Requirements Document)
## Sistema Operativo Governativo RP v3.5.2

**Current Version:** v3.5.2
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

## Funzionalita' Complete e Testate (v3.5.2)

### Per tutti i ruoli
- Login/Registrazione cittadino
- Chat (canale generale + settoriale)
- Marketplace (compra/vendi)
- Documenti verificabili con QR
- Annunci pubblici (bandi, assistenza)
- Sidebar navigazione per ruolo

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

---

## API Testate (100% funzionanti)

### GET (14/14 = 200)
Cases, Warrants, Fines, Patients, Reports, JCases, Hearings, DStats, DCalls, Chat, Market, Docs, News, Timeline

### POST (8/8 = 200)
NewCase, NewWarrant, NewFine, NewPatient, NewReport, NewLCase, NewDCall, ChatMsg

---

## Bug Fix Critici (v3.5.2)

1. Registrazione: colonna `name` mancante + tipo `grade` errato
2. Login loop: `/api/auth/me` 500 per grade:str vs int
3. CityHub auth-aware: PANNELLO/ESCI dopo login
4. Migrazione DB: 26 colonne aggiunte + 10 colonne rese nullable
5. ENUM crash: tutti gli Enum() sostituiti con String() nei modelli
6. Tutti i `grade:str` Pydantic corretti in `int`
7. Chat: sender_id reso nullable, canale generale creato
8. Frontend HTTPS: `https://api.pureliferp.it`

---

## Credenziali Test

| Ruolo | Email | Password |
|-------|-------|----------|
| Admin | admin@purelife.rp | Admin@2026! |
| LSPD | lspd@purelife.rp | Lspd@2026! |
| EMS | ems@purelife.rp | Ems@2026! |
| Citizen | testflow@purelife.rp | CiaoCiao1! |

---

## Deploy sulla VPS - ISTRUZIONI

### 1. Migrazione DB (OBBLIGATORIA)
```bash
mysql -u root -p purelife < migration_v3_5_2.sql
```

### 2. Deploy Backend
Sostituisci i file Python (NON il .env). Riavvia il servizio.

### 3. Deploy Frontend
Sostituisci i file statici nella cartella build di Caddy.

---

## Note Tecniche

1. `craco.config.js` sovrascrive `.env.production` - usare: `REACT_APP_BACKEND_URL=https://api.pureliferp.it yarn build`
2. MySQL NON supporta `ALTER TABLE ADD COLUMN IF NOT EXISTS` - usare script separati con error handling
3. Tutti gli Enum SQLAlchemy sostituiti con String() per compatibilita' cross-DB

---

## Backlog

### P1 - Prossimi
- [ ] Deploy VPS con migration_v3_5_2.sql
- [ ] Cambio password predefinite

### P2 - Futuro
- [ ] Notifiche Discord per mandati alta priorita'
- [ ] Upload immagini per annunci Marketplace
- [ ] Broadcast Operativo (alert urgenti)
- [ ] Dossier System (profilo cittadino completo)
- [ ] PC Realism Mode (finestre draggable)
