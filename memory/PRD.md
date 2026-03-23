# PURE LIFE OS - PRD v3.7.0
## Sistema Operativo Governativo RP

**Version:** v3.7.0 | **Updated:** 2026-03-23 | **Status:** Production Ready

---

## Prodotto
PURE LIFE OS - Sistema Operativo Civico RP per FiveM. Tema: Lime Green (#adff2f) + Nero. Ottimizzato per laptop in-game (1280x720).

## Architettura
- Backend: FastAPI + MariaDB (VPS)
- Frontend: React 18 + TailwindCSS (build statica)
- FiveM: plos_bridge + lb-phone + auto-link

## v3.7.0 - Changelog
- Tema completo Lime Green (#adff2f) + Nero profondo (#060a0d)
- Rimosso tutto il codice phone/mobile
- Sidebar compatta (w-56) con label sempre visibili
- Effetto scanline CRT sottile
- Scrollbar custom lime
- Glow effects sulle card al hover
- Sidebar con active state glow
- SystemBar v3.7 con lime accents
- Dashboard cittadino ottimizzata per laptop

## Funzionalita'
- **Cittadino**: Dashboard, Multe, Mandati, Ticket, News, Lavoro, Appuntamenti
- **Staff GOV/ADMIN**: Gestione Ticket (LSPD/EMS/DISPATCH = 403)
- **Auto-Link FiveM**: Collegamento automatico account tramite bridge
- **lb-phone**: Notifiche in-game (ticket, risposte, multe, mandati)
- **LSPD, EMS, GOV, DISPATCH, NEWS, ADMIN**: Tutti i moduli settoriali

## Deploy
1. `mysql < migration_v3_5_2.sql && mysql < migration_v3_6_0.sql`
2. Backend: plos_backend.zip
3. Frontend: plos_frontend_build.zip
4. Bridge: plos_bridge.zip

## Backlog
- [ ] Cambio password predefinite
- [ ] Upload immagini Marketplace
- [ ] Broadcast Operativo
- [ ] Dossier System
