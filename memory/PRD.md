# PURE LIFE OS - PRD v3.8.0
## Sistema Operativo Governativo RP

**Version:** v3.8.0 | **Updated:** 2026-03-23 | **Status:** Production Ready

---

## Prodotto
PURE LIFE OS - Sistema gestionale completo per FiveM che sostituisce Discord. Tema: Lime Green (#adff2f) + Nero. Ottimizzato per laptop in-game (1280x720).

## Architettura
- Backend: FastAPI + MariaDB (VPS)
- Frontend: React 18 + TailwindCSS (build statica)
- FiveM: plos_bridge + lb-phone + auto-link

## v3.8.0 - Job Board System (NUOVO)

### Admin - Gestione Bandi
- Crea bandi con: titolo, dipartimento, descrizione, requisiti, stipendio, posti, luogo, priorita'
- Dashboard con statistiche (totale, aperti, candidature, in attesa, accettati)
- Gestisci candidature: revisione, colloquio, accettazione, rifiuto
- Pausa/riapri/chiudi/elimina bandi
- Notifiche lb-phone al cittadino quando la candidatura viene aggiornata

### Cittadino - Bandi di Lavoro
- Esplora bandi aperti con dettagli completi
- Candidati con motivazione, esperienza, disponibilita'
- Segui lo stato delle candidature (In Attesa, In Revisione, Colloquio, Accettato, Rifiutato)
- Note staff e data colloquio visibili

### Regole Accesso
- **Ticket**: SOLO i cittadini possono crearli, SOLO GOV/ADMIN gestiscono
- **Bandi**: SOLO GOV/ADMIN creano, tutti i cittadini vedono e si candidano
- **LSPD/EMS/DISPATCH**: NO accesso a ticket, NO accesso gestione bandi

## Sidebar per Ruolo
- CITIZEN: PANNELLO, MULTE, MANDATI, ASSISTENZA, NEWS, LAVORO, APPUNTAMENTI, DOCUMENTI, CHAT, MERCATO, SERVIZI
- GOV: CITY PULSE, GIUSTIZIA, TICKET, BANDI, DOCUMENTI, CHAT, MERCATO, SERVIZI
- ADMIN: Tutti + ADMIN

## Deploy v3.8.0
1. Migrazioni DB: migration_v3_5_2.sql + migration_v3_6_0.sql (tabelle jobs auto-create)
2. Backend: plos_backend.zip
3. Frontend: plos_frontend_build.zip
4. Bridge: plos_bridge.zip

## Backlog
- [ ] Cambio password predefinite
- [ ] Upload immagini Marketplace
- [ ] Broadcast Operativo
- [ ] Dossier System
