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

## Stato Attuale (23/03/2026) - v3.5.2

### Bug Fix Critici Risolti
1. **Registrazione cittadino non funzionava** -> Colonna `name` mancante nel modello + `grade` tipo sbagliato (String vs Integer)
2. **Login riportava a schermata iniziale** -> `/api/auth/me` restituiva 500 per mismatch `grade: str` vs `int` nel Pydantic model
3. **CityHub mostrava sempre ACCEDI/REGISTRATI** -> Aggiunto stato auth-aware nella header
4. **LSPD/EMS/Justice/Chat/Dispatch API 500** -> Schema DB disallineato con modelli SQLAlchemy (26 colonne mancanti in 15+ tabelle)
5. **Mixed Content HTTPS** -> Frontend build punta a `https://api.pureliferp.it`
6. **Tutti i `grade: str` nel codebase** -> Corretti in `int` (auth, users, chat, audit)

### Migrazione DB Completata (migration_v3_5_2.sql)
Tabelle corrette: cases, court_hearings, news_articles, chat_channels, chat_messages, dispatch_calls, evidence, fines, legal_cases, warrants, medical_reports, timeline_events, businesses, city_events, advertisements, audit_logs

---

## Test Results (Iteration 25)
- Backend: **100% (23/23 tests passed)**
- Frontend: **100% (all pages and flows verified)**
- Ruoli testati: ADMIN, LSPD, EMS, CIVIL

---

## Funzionalita' per Ruolo

### CIVIL (Cittadino)
- CityHub (home pubblica)
- Chat (comunicazioni inter-settore)
- Marketplace (compra/vendi)
- Documenti
- Annunci pubblici
- Bandi di lavoro
- Prenotazioni appuntamenti

### LSPD (Polizia)
- Dashboard con statistiche
- Gestione casi
- Mandati di arresto
- Multe
- Dispatch
- Chat settoriale

### EMS (Emergenze Mediche)
- Dashboard con statistiche
- Gestione pazienti
- Referti medici
- Dispatch
- Chat settoriale

### GOV/Justice (Governo/Tribunale)
- Dashboard giustizia
- Casi legali
- Udienze
- City Pulse

### NEWS (Giornalista)
- Editor articoli Weazel News
- Pubblicazione notizie
- Breaking news

### DISPATCH
- Centrale operativa
- Gestione chiamate
- City Pulse

### ADMIN
- Dashboard amministrativa
- Gestione utenti (RBAC)
- Audit log
- Tutti gli accessi

---

## Credenziali Test

| Ruolo | Email | Password |
|-------|-------|----------|
| Admin | admin@purelife.rp | Admin@2026! |
| LSPD | lspd@purelife.rp | Lspd@2026! |
| EMS | ems@purelife.rp | Ems@2026! |
| Citizen | testflow@purelife.rp | CiaoCiao1! |

---

## Note Tecniche Importanti

1. Il `craco.config.js` contiene `require("dotenv").config()` che sovrascrive `.env.production`. Per build corrette usare: `REACT_APP_BACKEND_URL=https://api.pureliferp.it yarn build`
2. MySQL locale NON supporta `ALTER TABLE ADD COLUMN IF NOT EXISTS` - usare script Python con try/catch
3. L'utente non e' tecnico: fornire sempre ZIP pronti e istruzioni chiare
4. Lo script `migration_v3_5_2.sql` DEVE essere eseguito anche sulla VPS dell'utente

---

## Backlog

### P1 - Da fare
- [ ] Eseguire migrazione DB sulla VPS utente (migration_v3_5_2.sql)
- [ ] Cambio password predefinite account dipartimentali

### P2 - Futuro
- [ ] Notifiche Discord per mandati alta priorita'
- [ ] Upload immagini per annunci Marketplace
- [ ] PC Realism Mode (finestre draggable, snap layout)
- [ ] Dossier System (profilo cittadino completo)
- [ ] Broadcast Operativo (alert urgenti)
