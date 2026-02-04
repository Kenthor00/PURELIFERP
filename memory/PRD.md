# PURE LIFE OS (PLOS) - Product Requirements Document

## Panoramica
Sistema Operativo Digitale per server FiveM PURE LIFE RP.
Un ecosistema unico per browser desktop, tablet di reparto e WebView lb-phone.

## Architettura
- **Backend**: FastAPI (Python) con MySQL
- **Frontend**: React + TailwindCSS
- **Realtime**: Server-Sent Events (SSE)
- **Auth**: JWT custom + FiveM SSO con rotazione chiavi

## User Personas
1. **Agente LSPD** - Gestisce casi, mandati, multe
2. **Medico EMS** - Gestisce pazienti, referti, emergenze
3. **Dispatcher** - Gestisce chiamate P1/P2/P3, coordina unità
4. **Admin** - Accesso completo a tutti i moduli
5. **Giudice/Avvocato/Procuratore** - Modulo Giustizia (Fase 2)
6. **Weazel News** - Giornalisti per il modulo News (Fase 2)
7. **Cittadino** - Accesso City Hub pubblico (Fase 2)

---

## FASE 1 - MVP (COMPLETATA)

### Backend
- [x] Server FastAPI con routers modulari
- [x] MySQL schema completo
- [x] Auth JWT con refresh token
- [x] FiveM SSO endpoint /auth/fivem/exchange
- [x] SSE manager per realtime
- [x] Outbox worker per Prism Billing

### Frontend
- [x] Login page con tema tattico
- [x] Layout con sidebar responsive
- [x] Dashboard LSPD con statistiche
- [x] Lista e dettaglio casi
- [x] Creazione nuovi casi
- [x] Dashboard EMS con statistiche
- [x] Lista e registrazione pazienti
- [x] Dispatch Center con chiamate
- [x] Timeline globale
- [x] Impostazioni utente (suoni)
- [x] Context providers (Auth, SSE, Sound)

---

## FASE 2 - ESPANSIONE (IN CORSO)

### P0 - Stabilizzazione COMPLETATA (04/02/2026)
- [x] Endpoint `/api/health` con JSON strutturato (backend, db, migrations, sse)
- [x] L'app si avvia sempre anche senza MySQL
- [x] Banner errore UI quando DB è down
- [x] Login disabilitato quando DB non raggiungibile
- [x] Endpoint pubblici ritornano liste vuote invece di errori 500
- [x] HealthContext + HealthBanner componente

### P1 - City Hub (Pubblico) - SCAFFOLDING CREATO
- [x] Backend: routers/city.py con ads, events, businesses
- [x] Backend: routers/news.py con articoli e breaking news
- [x] Frontend: CityHubPage.js con banner ads, eventi, news sidebar
- [x] Frontend: NewsPage.js con lista e dettaglio articoli
- [ ] Workflow moderazione annunci (pending/approved)
- [ ] Tracking views/clicks pubblicità

### P1 - Weazel News - SCAFFOLDING CREATO
- [x] Backend: gestione articoli, breaking news, video embed
- [x] Frontend: NewsPage con filtri categoria
- [ ] Notifiche SSE breaking news
- [ ] Staff Weazel: creazione/modifica/pubblicazione

### P1 - Governo & Giustizia - SCAFFOLDING CREATO
- [x] Backend: routers/justice.py con pratiche legali e udienze
- [x] Frontend: JusticePage.js con dashboard
- [x] Nuovi ruoli: judge, lawyer, prosecutor, government
- [ ] Collegamento udienze a case_id LSPD
- [ ] Workflow stati pratiche legali

### P1 - Service Chat - SCAFFOLDING CREATO
- [x] Backend: routers/chat.py con canali e messaggi
- [x] Frontend: ChatPage.js con UI chat
- [x] Canali predefiniti (dispatch, pattuglie, ems, tribunale, governo)
- [ ] Stato presenza utenti (online/in_service/off_duty)
- [ ] Quick actions (crea chiamata, apri caso, invia posizione)

### P1 - Deep Linking - COMPLETATO
- [x] ?open=city, ?open=news, ?open=lspd, ?open=ems, ?open=dispatch
- [x] ?open=timeline, ?open=chat, ?open=justice
- [x] ?open=case&id=ID, ?open=event&id=ID

---

## Backlog Futuro

### P2 - PC Realism Mode
- [ ] Pannelli trascinabili/ridimensionabili per desktop
- [ ] Scorciatoie tastiera (CTRL+K, ALT+1, etc.)

### P2 - Integrazioni
- [ ] Prism Billing (logica reale per outbox worker)
- [ ] YouTube/Twitch embed nel modulo News

### P3 - Miglioramenti UX
- [ ] Suoni UI opzionali
- [ ] Scanline overlay
- [ ] Export PDF
- [ ] Notifiche push browser

---

## Note Tecniche

### Database
- MySQL esterno (credenziali via .env)
- Chiavi: MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE

### Health Check
Endpoint: `GET /api/health`
```json
{
  "status": "ok|degraded",
  "backend": "ok",
  "db": {"status": "ok|down", "error": null},
  "migrations": {"status": "ok|missing", "error": null},
  "sse": {"status": "ok", "connected_clients": 0}
}
```

---

## File Chiave
- `/app/backend/server.py` - Entry point backend
- `/app/backend/database.py` - Configurazione MySQL
- `/app/backend/models.py` - Modelli SQLAlchemy
- `/app/backend/routers/` - Endpoint API modulari
- `/app/frontend/src/App.js` - Routing React
- `/app/frontend/src/context/` - Context providers
- `/app/frontend/src/pages/` - Pagine UI
