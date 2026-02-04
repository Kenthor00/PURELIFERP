# PURE LIFE OS (PLOS) - Product Requirements Document

## Panoramica
Sistema Operativo Digitale per server FiveM PURE LIFE RP.
Un ecosistema unico per browser desktop, tablet di reparto e WebView lb-phone.

## Architettura
- **Backend**: FastAPI (Python) con MySQL
- **Frontend**: React
- **Realtime**: Server-Sent Events (SSE)
- **Auth**: JWT custom + FiveM SSO con rotazione chiavi

## User Personas
1. **Agente LSPD** - Gestisce casi, mandati, multe
2. **Medico EMS** - Gestisce pazienti, referti, emergenze
3. **Dispatcher** - Gestisce chiamate P1/P2/P3, coordina unità
4. **Admin** - Accesso completo a tutti i moduli

## Core Requirements
- [x] Login email/password con JWT
- [x] FiveM SSO con rotazione chiavi (CURRENT + PREVIOUS)
- [x] RBAC (police, ems, dispatch, admin)
- [x] Portale LSPD (casi, mandati, multe, evidence)
- [x] Portale EMS (pazienti, referti, templates)
- [x] Dispatch Center (chiamate P1/P2/P3)
- [x] Timeline globale eventi
- [x] SSE realtime updates
- [x] Outbox pattern Prism Billing (struttura pronta)
- [x] Suoni UI opzionali WebAudio
- [x] Mobile-first responsive
- [x] Tema tattico verde/nero

## Implementato - Data: 04/02/2026

### Backend
- Server FastAPI con routers modulari
- MySQL schema completo (users, cases, warrants, fines, evidence, patients, reports, dispatch_calls, timeline_events, outbox, audit_logs)
- Auth JWT con refresh token
- FiveM SSO endpoint /auth/fivem/exchange
- SSE manager per realtime
- Outbox worker per Prism Billing

### Frontend
- Login page con tema tattico
- Layout con sidebar responsive
- Dashboard LSPD con statistiche
- Lista e dettaglio casi
- Creazione nuovi casi
- Dashboard EMS con statistiche
- Lista e registrazione pazienti
- Dispatch Center con chiamate
- Timeline globale
- Impostazioni utente (suoni)
- Context providers (Auth, SSE, Sound)

## Backlog Prioritizzato

### P0 - Critici (Configurazione utente)
- [ ] Utente deve configurare credenziali MySQL in /backend/.env
- [ ] Eseguire schema.sql su MySQL

### P1 - Alta Priorità
- [ ] Evidence Board visuale (bacheca investigativa)
- [ ] Dettaglio paziente con timeline clinica
- [ ] Creazione referti con smart templates
- [ ] Assegnazione unità a chiamate dispatch
- [ ] Deep link support completo (?open=dispatch, ?open=case&id=123)

### P2 - Media Priorità
- [ ] Ricerca globale intelligente
- [ ] Gestione mandati (lista, creazione, revoca)
- [ ] Gestione multe (lista, creazione, pagamento)
- [ ] Worker Prism Billing con endpoint reali
- [ ] Rate limiting con slowapi

### P3 - Bassa Priorità
- [ ] Scanline overlay opzionale
- [ ] Statistiche avanzate e grafici
- [ ] Export PDF referti
- [ ] Notifiche push browser

## Next Tasks
1. Configurare MySQL e testare login
2. Implementare Evidence Board
3. Completare gestione referti EMS
4. Aggiungere deep links lb-phone
