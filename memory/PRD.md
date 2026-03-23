# PURE LIFE OS - PRD v3.7.0
## Sistema Operativo Governativo RP

**Version:** v3.7.0
**Last Updated:** 2026-03-23
**Status:** Production Ready

---

## Prodotto
PURE LIFE OS - Sistema Operativo Civico RP per FiveM. Sostituisce Discord. Tema: Lime Green (#adff2f) + Nero.

## Architettura
- Backend: FastAPI + MariaDB (VPS utente)
- Frontend: React 18 + TailwindCSS
- FiveM: plos_bridge (tablet in-game) + lb-phone + auto-link

## Funzionalita' Complete (v3.7.0)

### Tema Visivo - Lime Green (#adff2f) + Nero
- CSS variables: --os-accent: #adff2f
- Tailwind: plos.primary: #adff2f
- Tutti i componenti: green/emerald -> lime

### Auto-Link Account FiveM
- Collegamento automatico PLOS <-> identifier FiveM
- Bridge server-side Lua (autolink.lua)
- Endpoint sicuri con bridge_secret
- Dashboard mostra stato collegamento

### Cittadino
- Dashboard personale con riepilogo + stato FiveM
- Multe (visualizza/paga), Mandati, Ticket, News, Lavoro, Appuntamenti

### Staff GOV/ADMIN - Ticket
- Gestione ticket completa (GOV/ADMIN only)
- LSPD/EMS/DISPATCH = 403

### lb-phone
- Coda notifiche DB + polling bridge + invio automatico
- Notifiche: ticket, risposte, multe, mandati

### Sidebar per Ruolo
- CITIZEN: PANNELLO, MULTE, MANDATI, ASSISTENZA, NEWS, LAVORO, APPUNTAMENTI, DOCUMENTI, CHAT, MERCATO, SERVIZI
- LSPD: LSPD, DISPATCH, DOCUMENTI, CHAT, MERCATO, SERVIZI
- ADMIN: Tutti i moduli

## Deploy
1. `mysql -u root -p purelife < migration_v3_5_2.sql`
2. `mysql -u root -p purelife < migration_v3_6_0.sql`
3. Backend: plos_backend.zip
4. Frontend: plos_frontend_build.zip
5. Bridge: plos_bridge.zip (include autolink.lua + lbphone.lua)

## Backlog
- [ ] Cambio password predefinite
- [ ] Upload immagini Marketplace
- [ ] Broadcast Operativo
- [ ] Dossier System
