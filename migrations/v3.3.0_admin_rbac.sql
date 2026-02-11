-- ============================================
-- PURE LIFE OS - Migration v3.3.0 (P1 Admin)
-- Sistema RBAC Lavori/Gradi/Permessi
-- Date: 2026-02-11
-- ============================================

-- ============================================
-- 1) TABELLA LAVORI (JOBS)
-- ============================================
CREATE TABLE IF NOT EXISTS jobs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(50) UNIQUE NOT NULL,           -- es: 'lspd', 'ems', 'taxi'
    name VARCHAR(100) NOT NULL,                  -- es: 'Los Santos Police Department'
    name_short VARCHAR(50) NOT NULL,             -- es: 'LSPD'
    category VARCHAR(50) NOT NULL,               -- es: 'law_enforcement', 'medical', 'civilian'
    description TEXT NULL,
    icon VARCHAR(50) NULL,                       -- es: 'Shield', 'Heart', 'Car'
    color VARCHAR(20) NULL,                      -- es: '#3B82F6'
    is_active BOOLEAN DEFAULT TRUE,
    is_whitelisted BOOLEAN DEFAULT FALSE,        -- Richiede approvazione
    max_employees INT DEFAULT 0,                 -- 0 = illimitato
    discord_role_id VARCHAR(50) NULL,            -- Per sync Discord
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX idx_jobs_code ON jobs(code);
CREATE INDEX idx_jobs_category ON jobs(category);

-- ============================================
-- 2) TABELLA GRADI (JOB_GRADES)
-- ============================================
CREATE TABLE IF NOT EXISTS job_grades (
    id INT PRIMARY KEY AUTO_INCREMENT,
    job_id INT NOT NULL,
    grade_level INT NOT NULL,                    -- 1 = più basso, crescente
    code VARCHAR(50) NOT NULL,                   -- es: 'recruit', 'officer_1'
    name VARCHAR(100) NOT NULL,                  -- es: 'Recluta', 'Agente I'
    category VARCHAR(50) NULL,                   -- es: 'COMANDO', 'SUPERVISIONE', 'UFFICIALI'
    salary INT DEFAULT 0,
    is_boss BOOLEAN DEFAULT FALSE,               -- Può gestire dipendenti
    is_supervisor BOOLEAN DEFAULT FALSE,         -- Può supervisionare
    can_hire BOOLEAN DEFAULT FALSE,
    can_fire BOOLEAN DEFAULT FALSE,
    can_promote BOOLEAN DEFAULT FALSE,
    permissions JSON NULL,                       -- Permessi specifici del grado
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    UNIQUE KEY unique_job_grade (job_id, grade_level)
);

CREATE INDEX idx_job_grades_job ON job_grades(job_id);
CREATE INDEX idx_job_grades_level ON job_grades(grade_level);

-- ============================================
-- 3) TABELLA PERMESSI (PERMISSIONS)
-- ============================================
CREATE TABLE IF NOT EXISTS permissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(100) UNIQUE NOT NULL,           -- es: 'lspd.warrant.execute'
    name VARCHAR(200) NOT NULL,                  -- es: 'LSPD: Esegui Mandato'
    description TEXT NULL,
    category VARCHAR(50) NOT NULL,               -- es: 'lspd', 'ems', 'admin', 'system'
    is_dangerous BOOLEAN DEFAULT FALSE,          -- Richiede conferma
    requires_audit BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_permissions_category ON permissions(category);

-- ============================================
-- 4) TABELLA PERMESSI PER GRADO (JOB_GRADE_PERMISSIONS)
-- ============================================
CREATE TABLE IF NOT EXISTS job_grade_permissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    job_grade_id INT NOT NULL,
    permission_id INT NOT NULL,
    granted_by INT NULL,                         -- User ID che ha concesso
    granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_grade_id) REFERENCES job_grades(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
    FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_grade_perm (job_grade_id, permission_id)
);

-- ============================================
-- 5) TABELLA OVERRIDE UTENTE (USER_PERMISSION_OVERRIDES)
-- ============================================
CREATE TABLE IF NOT EXISTS user_permission_overrides (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    permission_id INT NOT NULL,
    override_type ENUM('grant', 'revoke') NOT NULL,
    reason TEXT NOT NULL,                        -- Motivazione obbligatoria
    expires_at DATETIME NULL,                    -- NULL = permanente
    granted_by INT NOT NULL,
    granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    revoked_at DATETIME NULL,
    revoked_by INT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
    FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (revoked_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_user_overrides_user ON user_permission_overrides(user_id);
CREATE INDEX idx_user_overrides_active ON user_permission_overrides(is_active, expires_at);

-- ============================================
-- 6) RUOLI STAFF (SEPARATI DAI JOB)
-- ============================================
CREATE TABLE IF NOT EXISTS staff_roles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(50) UNIQUE NOT NULL,            -- 'moderator', 'admin', 'superadmin'
    name VARCHAR(100) NOT NULL,                  -- 'Moderatore', 'Amministratore', 'Super Admin'
    level INT NOT NULL,                          -- 1=mod, 2=admin, 3=superadmin
    color VARCHAR(20) NULL,
    bypass_job_permissions BOOLEAN DEFAULT FALSE, -- Ignora permessi job
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 7) ASSEGNAZIONE RUOLI STAFF A UTENTI
-- ============================================
CREATE TABLE IF NOT EXISTS user_staff_roles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    staff_role_id INT NOT NULL,
    reason TEXT NOT NULL,
    assigned_by INT NOT NULL,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NULL,
    revoked_at DATETIME NULL,
    revoked_by INT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (staff_role_id) REFERENCES staff_roles(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (revoked_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_user_staff (user_id, staff_role_id, is_active)
);

-- ============================================
-- 8) AGGIORNA TABELLA USERS
-- ============================================
ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS job_id INT NULL,
    ADD COLUMN IF NOT EXISTS job_grade_id INT NULL,
    ADD CONSTRAINT fk_user_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_user_job_grade FOREIGN KEY (job_grade_id) REFERENCES job_grades(id) ON DELETE SET NULL;

-- ============================================
-- SEED: PERMESSI BASE
-- ============================================
INSERT INTO permissions (code, name, description, category, is_dangerous, requires_audit) VALUES
-- LSPD
('lspd.case.view', 'LSPD: Visualizza Casi', 'Permette di visualizzare i casi', 'lspd', FALSE, FALSE),
('lspd.case.create', 'LSPD: Crea Caso', 'Permette di creare nuovi casi', 'lspd', FALSE, TRUE),
('lspd.case.edit', 'LSPD: Modifica Caso', 'Permette di modificare casi esistenti', 'lspd', FALSE, TRUE),
('lspd.case.delete', 'LSPD: Elimina Caso', 'Permette di eliminare casi', 'lspd', TRUE, TRUE),
('lspd.case.close', 'LSPD: Chiudi Caso', 'Permette di chiudere casi', 'lspd', FALSE, TRUE),
('lspd.warrant.view', 'LSPD: Visualizza Mandati', 'Permette di visualizzare i mandati', 'lspd', FALSE, FALSE),
('lspd.warrant.create', 'LSPD: Emetti Mandato', 'Permette di emettere mandati', 'lspd', FALSE, TRUE),
('lspd.warrant.execute', 'LSPD: Esegui Mandato', 'Permette di eseguire mandati', 'lspd', FALSE, TRUE),
('lspd.warrant.revoke', 'LSPD: Revoca Mandato', 'Permette di revocare mandati', 'lspd', TRUE, TRUE),
('lspd.fine.view', 'LSPD: Visualizza Multe', 'Permette di visualizzare le multe', 'lspd', FALSE, FALSE),
('lspd.fine.create', 'LSPD: Emetti Multa', 'Permette di emettere multe', 'lspd', FALSE, TRUE),
('lspd.fine.edit', 'LSPD: Modifica Multa', 'Permette di modificare multe', 'lspd', FALSE, TRUE),
('lspd.fine.delete', 'LSPD: Annulla Multa', 'Permette di annullare multe', 'lspd', TRUE, TRUE),
('lspd.evidence.view', 'LSPD: Visualizza Prove', 'Permette di visualizzare prove', 'lspd', FALSE, FALSE),
('lspd.evidence.manage', 'LSPD: Gestisci Prove', 'Permette di aggiungere/rimuovere prove', 'lspd', FALSE, TRUE),
('lspd.employees.view', 'LSPD: Visualizza Dipendenti', 'Permette di vedere la lista dipendenti', 'lspd', FALSE, FALSE),
('lspd.employees.manage', 'LSPD: Gestisci Dipendenti', 'Permette di assumere/licenziare/promuovere', 'lspd', TRUE, TRUE),

-- EMS
('ems.patient.view', 'EMS: Visualizza Pazienti', 'Permette di visualizzare pazienti', 'ems', FALSE, FALSE),
('ems.patient.create', 'EMS: Registra Paziente', 'Permette di registrare nuovi pazienti', 'ems', FALSE, TRUE),
('ems.patient.edit', 'EMS: Modifica Paziente', 'Permette di modificare dati paziente', 'ems', FALSE, TRUE),
('ems.report.view', 'EMS: Visualizza Referti', 'Permette di visualizzare referti medici', 'ems', FALSE, FALSE),
('ems.report.create', 'EMS: Crea Referto', 'Permette di creare referti medici', 'ems', FALSE, TRUE),
('ems.report.sign', 'EMS: Firma Referto', 'Permette di firmare e validare referti', 'ems', FALSE, TRUE),
('ems.employees.view', 'EMS: Visualizza Dipendenti', 'Permette di vedere la lista dipendenti', 'ems', FALSE, FALSE),
('ems.employees.manage', 'EMS: Gestisci Dipendenti', 'Permette di assumere/licenziare/promuovere', 'ems', TRUE, TRUE),

-- GIUSTIZIA/GOVERNO
('justice.case.view', 'Giustizia: Visualizza Pratiche', 'Permette di visualizzare pratiche legali', 'justice', FALSE, FALSE),
('justice.case.create', 'Giustizia: Crea Pratica', 'Permette di creare pratiche legali', 'justice', FALSE, TRUE),
('justice.case.edit', 'Giustizia: Modifica Pratica', 'Permette di modificare pratiche', 'justice', FALSE, TRUE),
('justice.hearing.view', 'Giustizia: Visualizza Udienze', 'Permette di visualizzare udienze', 'justice', FALSE, FALSE),
('justice.hearing.create', 'Giustizia: Programma Udienza', 'Permette di programmare udienze', 'justice', FALSE, TRUE),
('justice.hearing.preside', 'Giustizia: Presiedi Udienza', 'Permette di presiedere udienze', 'justice', FALSE, TRUE),
('justice.verdict.issue', 'Giustizia: Emetti Verdetto', 'Permette di emettere verdetti', 'justice', TRUE, TRUE),

-- NEWS/WEAZEL
('news.article.view', 'News: Visualizza Articoli', 'Permette di visualizzare articoli', 'news', FALSE, FALSE),
('news.article.create', 'News: Scrivi Articolo', 'Permette di scrivere articoli', 'news', FALSE, TRUE),
('news.article.edit', 'News: Modifica Articolo', 'Permette di modificare articoli', 'news', FALSE, TRUE),
('news.article.publish', 'News: Pubblica Articolo', 'Permette di pubblicare articoli', 'news', FALSE, TRUE),
('news.article.delete', 'News: Elimina Articolo', 'Permette di eliminare articoli', 'news', TRUE, TRUE),
('news.breaking.set', 'News: Imposta Breaking News', 'Permette di impostare breaking news', 'news', FALSE, TRUE),

-- DISPATCH
('dispatch.call.view', 'Dispatch: Visualizza Chiamate', 'Permette di visualizzare chiamate', 'dispatch', FALSE, FALSE),
('dispatch.call.create', 'Dispatch: Crea Chiamata', 'Permette di creare chiamate', 'dispatch', FALSE, TRUE),
('dispatch.call.assign', 'Dispatch: Assegna Chiamata', 'Permette di assegnare chiamate', 'dispatch', FALSE, TRUE),
('dispatch.call.close', 'Dispatch: Chiudi Chiamata', 'Permette di chiudere chiamate', 'dispatch', FALSE, TRUE),
('dispatch.units.view', 'Dispatch: Visualizza Unità', 'Permette di visualizzare unità attive', 'dispatch', FALSE, FALSE),
('dispatch.units.manage', 'Dispatch: Gestisci Unità', 'Permette di gestire lo stato unità', 'dispatch', FALSE, TRUE),

-- ADMIN/SISTEMA
('admin.users.view', 'Admin: Visualizza Utenti', 'Permette di visualizzare lista utenti', 'admin', FALSE, FALSE),
('admin.users.edit', 'Admin: Modifica Utenti', 'Permette di modificare dati utenti', 'admin', FALSE, TRUE),
('admin.users.ban', 'Admin: Sospendi Utenti', 'Permette di sospendere account', 'admin', TRUE, TRUE),
('admin.users.delete', 'Admin: Elimina Utenti', 'Permette di eliminare account', 'admin', TRUE, TRUE),
('admin.roles.view', 'Admin: Visualizza Ruoli', 'Permette di visualizzare ruoli e permessi', 'admin', FALSE, FALSE),
('admin.roles.manage', 'Admin: Gestisci Ruoli', 'Permette di creare/modificare ruoli', 'admin', TRUE, TRUE),
('admin.permissions.manage', 'Admin: Gestisci Permessi', 'Permette di assegnare/revocare permessi', 'admin', TRUE, TRUE),
('admin.audit.view', 'Admin: Visualizza Audit', 'Permette di visualizzare audit log', 'admin', FALSE, FALSE),
('admin.audit.export', 'Admin: Esporta Audit', 'Permette di esportare audit log', 'admin', FALSE, TRUE),
('admin.system.settings', 'Admin: Impostazioni Sistema', 'Permette di modificare impostazioni', 'admin', TRUE, TRUE),

-- GENERICI
('poi.view', 'Mappa: Visualizza POI', 'Permette di visualizzare punti di interesse', 'system', FALSE, FALSE),
('poi.manage', 'Mappa: Gestisci POI', 'Permette di creare/modificare POI', 'system', FALSE, TRUE),
('agenda.view', 'Agenda: Visualizza Appuntamenti', 'Permette di visualizzare appuntamenti', 'system', FALSE, FALSE),
('agenda.manage', 'Agenda: Gestisci Appuntamenti', 'Permette di creare/modificare appuntamenti', 'system', FALSE, TRUE),
('chat.access', 'Chat: Accesso Base', 'Permette di accedere alla chat', 'system', FALSE, FALSE),
('chat.moderate', 'Chat: Moderazione', 'Permette di moderare messaggi', 'system', FALSE, TRUE)
ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description);

-- ============================================
-- SEED: RUOLI STAFF
-- ============================================
INSERT INTO staff_roles (code, name, level, color, bypass_job_permissions) VALUES
('moderator', 'Moderatore', 1, '#F59E0B', FALSE),
('admin', 'Amministratore', 2, '#EF4444', TRUE),
('superadmin', 'Super Admin', 3, '#8B5CF6', TRUE)
ON DUPLICATE KEY UPDATE name=VALUES(name), level=VALUES(level);

-- ============================================
-- SEED: LAVORI (JOBS)
-- ============================================
INSERT INTO jobs (code, name, name_short, category, description, icon, color, is_whitelisted) VALUES
-- Forze dell'ordine
('lspd', 'Los Santos Police Department', 'LSPD', 'law_enforcement', 'Dipartimento di Polizia di Los Santos', 'Shield', '#3B82F6', TRUE),
('bcso', 'Blaine County Sheriff Office', 'BCSO', 'law_enforcement', 'Ufficio dello Sceriffo di Blaine County', 'Shield', '#7C3AED', TRUE),

-- Medico/Sanitario
('ems', 'Emergency Medical Services', 'EMS', 'medical', 'Servizi Medici di Emergenza', 'Heart', '#EF4444', TRUE),

-- Governo/Giustizia
('gov', 'Governo di Los Santos', 'GOV', 'government', 'Amministrazione Governativa', 'Building2', '#10B981', TRUE),
('justice', 'Tribunale di Los Santos', 'Giustizia', 'government', 'Sistema Giudiziario', 'Scale', '#F59E0B', TRUE),

-- Dispatch
('dispatch', 'Centro Comunicazioni', 'Dispatch', 'emergency', 'Centro Smistamento Chiamate', 'Radio', '#6366F1', TRUE),

-- Media
('weazel', 'Weazel News', 'Weazel', 'media', 'Emittente Televisiva', 'Tv', '#EC4899', TRUE),

-- Civili
('mechanic', 'Los Santos Customs', 'Meccanico', 'civilian', 'Officina Meccanica', 'Wrench', '#F97316', FALSE),
('taxi', 'Downtown Cab Co.', 'Taxi', 'civilian', 'Servizio Taxi', 'Car', '#FBBF24', FALSE),
('cardealer', 'Premium Deluxe Motorsport', 'Concessionario', 'civilian', 'Concessionario Auto', 'CarFront', '#14B8A6', FALSE),
('restaurant', 'Ristorazione', 'Ristorante', 'civilian', 'Attività di Ristorazione', 'UtensilsCrossed', '#84CC16', FALSE),
('security', 'Gruppe Sechs', 'Sicurezza', 'civilian', 'Sicurezza Privata', 'ShieldCheck', '#64748B', FALSE),
('unemployed', 'Disoccupato', 'Civile', 'civilian', 'Senza impiego', 'User', '#9CA3AF', FALSE)
ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description);

-- ============================================
-- SEED: GRADI LSPD (COMPLETI)
-- ============================================
SET @lspd_id = (SELECT id FROM jobs WHERE code = 'lspd');

INSERT INTO job_grades (job_id, grade_level, code, name, category, salary, is_boss, is_supervisor, can_hire, can_fire, can_promote) VALUES
-- COMANDO
(@lspd_id, 13, 'chief', 'Capo della Polizia', 'COMANDO', 15000, TRUE, TRUE, TRUE, TRUE, TRUE),
(@lspd_id, 12, 'deputy_chief', 'Vice Capo della Polizia', 'COMANDO', 13000, TRUE, TRUE, TRUE, TRUE, TRUE),
-- ALTO COMANDO
(@lspd_id, 11, 'commander', 'Comandante', 'ALTO COMANDO', 11000, FALSE, TRUE, TRUE, TRUE, TRUE),
(@lspd_id, 10, 'deputy_commander', 'Vice Comandante', 'ALTO COMANDO', 10000, FALSE, TRUE, TRUE, TRUE, FALSE),
(@lspd_id, 9, 'captain', 'Capitano', 'ALTO COMANDO', 9000, FALSE, TRUE, TRUE, FALSE, FALSE),
-- SUPERVISIONE
(@lspd_id, 8, 'lieutenant', 'Tenente', 'SUPERVISIONE', 7500, FALSE, TRUE, FALSE, FALSE, FALSE),
(@lspd_id, 7, 'sub_lieutenant', 'Sottotenente', 'SUPERVISIONE', 6500, FALSE, TRUE, FALSE, FALSE, FALSE),
(@lspd_id, 6, 'sergeant', 'Sergente', 'SUPERVISIONE', 5500, FALSE, TRUE, FALSE, FALSE, FALSE),
-- UFFICIALI
(@lspd_id, 5, 'senior_officer', 'Agente Senior', 'UFFICIALI', 4500, FALSE, FALSE, FALSE, FALSE, FALSE),
(@lspd_id, 4, 'officer_3', 'Agente III', 'UFFICIALI', 3800, FALSE, FALSE, FALSE, FALSE, FALSE),
(@lspd_id, 3, 'officer_2', 'Agente II', 'UFFICIALI', 3200, FALSE, FALSE, FALSE, FALSE, FALSE),
(@lspd_id, 2, 'officer_1', 'Agente I', 'UFFICIALI', 2800, FALSE, FALSE, FALSE, FALSE, FALSE),
-- RECLUTE
(@lspd_id, 1, 'recruit', 'Recluta', 'RECLUTE', 2000, FALSE, FALSE, FALSE, FALSE, FALSE)
ON DUPLICATE KEY UPDATE name=VALUES(name), category=VALUES(category), salary=VALUES(salary);

-- ============================================
-- SEED: GRADI EMS
-- ============================================
SET @ems_id = (SELECT id FROM jobs WHERE code = 'ems');

INSERT INTO job_grades (job_id, grade_level, code, name, category, salary, is_boss, is_supervisor, can_hire, can_fire, can_promote) VALUES
(@ems_id, 6, 'director', 'Direttore Sanitario', 'DIREZIONE', 12000, TRUE, TRUE, TRUE, TRUE, TRUE),
(@ems_id, 5, 'manager', 'Dirigente Sanitario', 'DIREZIONE', 10000, FALSE, TRUE, TRUE, TRUE, TRUE),
(@ems_id, 4, 'chief_doctor', 'Primario', 'MEDICI', 8000, FALSE, TRUE, TRUE, FALSE, FALSE),
(@ems_id, 3, 'doctor', 'Dottore', 'MEDICI', 6000, FALSE, FALSE, FALSE, FALSE, FALSE),
(@ems_id, 2, 'nurse', 'Infermiere', 'PERSONALE', 4000, FALSE, FALSE, FALSE, FALSE, FALSE),
(@ems_id, 1, 'paramedic', 'Soccorritore', 'PERSONALE', 2500, FALSE, FALSE, FALSE, FALSE, FALSE)
ON DUPLICATE KEY UPDATE name=VALUES(name), category=VALUES(category), salary=VALUES(salary);

-- ============================================
-- SEED: GRADI GOVERNO/GIUSTIZIA
-- ============================================
SET @gov_id = (SELECT id FROM jobs WHERE code = 'gov');
SET @justice_id = (SELECT id FROM jobs WHERE code = 'justice');

INSERT INTO job_grades (job_id, grade_level, code, name, category, salary, is_boss, is_supervisor, can_hire, can_fire, can_promote) VALUES
-- Governo
(@gov_id, 5, 'governor', 'Governatore', 'ESECUTIVO', 20000, TRUE, TRUE, TRUE, TRUE, TRUE),
(@gov_id, 4, 'deputy_governor', 'Vice Governatore', 'ESECUTIVO', 15000, FALSE, TRUE, TRUE, TRUE, TRUE),
(@gov_id, 3, 'secretary', 'Segretario', 'STAFF', 8000, FALSE, TRUE, FALSE, FALSE, FALSE),
(@gov_id, 2, 'advisor', 'Consigliere', 'STAFF', 5000, FALSE, FALSE, FALSE, FALSE, FALSE),
(@gov_id, 1, 'assistant', 'Assistente', 'STAFF', 3000, FALSE, FALSE, FALSE, FALSE, FALSE),

-- Giustizia
(@justice_id, 5, 'attorney_general', 'Procuratore Generale', 'PROCURA', 18000, TRUE, TRUE, TRUE, TRUE, TRUE),
(@justice_id, 4, 'district_attorney', 'Procuratore Distrettuale', 'PROCURA', 14000, FALSE, TRUE, TRUE, TRUE, FALSE),
(@justice_id, 3, 'judge', 'Giudice', 'MAGISTRATURA', 16000, FALSE, TRUE, FALSE, FALSE, FALSE),
(@justice_id, 2, 'prosecutor', 'Pubblico Ministero', 'PROCURA', 10000, FALSE, FALSE, FALSE, FALSE, FALSE),
(@justice_id, 1, 'lawyer', 'Avvocato', 'AVVOCATURA', 8000, FALSE, FALSE, FALSE, FALSE, FALSE)
ON DUPLICATE KEY UPDATE name=VALUES(name), category=VALUES(category), salary=VALUES(salary);

-- ============================================
-- SEED: GRADI WEAZEL NEWS
-- ============================================
SET @weazel_id = (SELECT id FROM jobs WHERE code = 'weazel');

INSERT INTO job_grades (job_id, grade_level, code, name, category, salary, is_boss, is_supervisor, can_hire, can_fire, can_promote) VALUES
(@weazel_id, 5, 'editorial_director', 'Direttore Editoriale', 'DIREZIONE', 10000, TRUE, TRUE, TRUE, TRUE, TRUE),
(@weazel_id, 4, 'editor_chief', 'Caporedattore', 'REDAZIONE', 7000, FALSE, TRUE, TRUE, FALSE, FALSE),
(@weazel_id, 3, 'editor', 'Redattore', 'REDAZIONE', 5000, FALSE, FALSE, FALSE, FALSE, FALSE),
(@weazel_id, 2, 'journalist', 'Giornalista', 'REPORTER', 3500, FALSE, FALSE, FALSE, FALSE, FALSE),
(@weazel_id, 1, 'reporter', 'Reporter', 'REPORTER', 2500, FALSE, FALSE, FALSE, FALSE, FALSE)
ON DUPLICATE KEY UPDATE name=VALUES(name), category=VALUES(category), salary=VALUES(salary);

-- ============================================
-- SEED: GRADI MECCANICO
-- ============================================
SET @mechanic_id = (SELECT id FROM jobs WHERE code = 'mechanic');

INSERT INTO job_grades (job_id, grade_level, code, name, category, salary, is_boss, is_supervisor, can_hire, can_fire, can_promote) VALUES
(@mechanic_id, 5, 'owner', 'Titolare Officina', 'PROPRIETÀ', 8000, TRUE, TRUE, TRUE, TRUE, TRUE),
(@mechanic_id, 4, 'foreman', 'Capofficina', 'GESTIONE', 5000, FALSE, TRUE, TRUE, FALSE, FALSE),
(@mechanic_id, 3, 'senior_mechanic', 'Meccanico Senior', 'TECNICI', 3500, FALSE, FALSE, FALSE, FALSE, FALSE),
(@mechanic_id, 2, 'mechanic', 'Meccanico', 'TECNICI', 2500, FALSE, FALSE, FALSE, FALSE, FALSE),
(@mechanic_id, 1, 'apprentice', 'Apprendista Meccanico', 'APPRENDISTI', 1500, FALSE, FALSE, FALSE, FALSE, FALSE)
ON DUPLICATE KEY UPDATE name=VALUES(name), category=VALUES(category), salary=VALUES(salary);

-- ============================================
-- SEED: GRADI TAXI
-- ============================================
SET @taxi_id = (SELECT id FROM jobs WHERE code = 'taxi');

INSERT INTO job_grades (job_id, grade_level, code, name, category, salary, is_boss, is_supervisor, can_hire, can_fire, can_promote) VALUES
(@taxi_id, 5, 'director', 'Direttore Servizio', 'DIREZIONE', 6000, TRUE, TRUE, TRUE, TRUE, TRUE),
(@taxi_id, 4, 'fleet_manager', 'Responsabile Flotta', 'GESTIONE', 4500, FALSE, TRUE, TRUE, FALSE, FALSE),
(@taxi_id, 3, 'shift_leader', 'Capo Turno', 'GESTIONE', 3500, FALSE, TRUE, FALSE, FALSE, FALSE),
(@taxi_id, 2, 'senior_driver', 'Autista Senior', 'AUTISTI', 2800, FALSE, FALSE, FALSE, FALSE, FALSE),
(@taxi_id, 1, 'driver', 'Autista Taxi', 'AUTISTI', 2000, FALSE, FALSE, FALSE, FALSE, FALSE)
ON DUPLICATE KEY UPDATE name=VALUES(name), category=VALUES(category), salary=VALUES(salary);

-- ============================================
-- SEED: GRADI CONCESSIONARIO
-- ============================================
SET @cardealer_id = (SELECT id FROM jobs WHERE code = 'cardealer');

INSERT INTO job_grades (job_id, grade_level, code, name, category, salary, is_boss, is_supervisor, can_hire, can_fire, can_promote) VALUES
(@cardealer_id, 4, 'director', 'Direttore Concessionario', 'DIREZIONE', 8000, TRUE, TRUE, TRUE, TRUE, TRUE),
(@cardealer_id, 3, 'sales_manager', 'Responsabile Vendite', 'GESTIONE', 5500, FALSE, TRUE, TRUE, FALSE, FALSE),
(@cardealer_id, 2, 'senior_sales', 'Venditore Senior', 'VENDITE', 3500, FALSE, FALSE, FALSE, FALSE, FALSE),
(@cardealer_id, 1, 'sales', 'Venditore', 'VENDITE', 2500, FALSE, FALSE, FALSE, FALSE, FALSE)
ON DUPLICATE KEY UPDATE name=VALUES(name), category=VALUES(category), salary=VALUES(salary);

-- ============================================
-- SEED: GRADI RISTORAZIONE
-- ============================================
SET @restaurant_id = (SELECT id FROM jobs WHERE code = 'restaurant');

INSERT INTO job_grades (job_id, grade_level, code, name, category, salary, is_boss, is_supervisor, can_hire, can_fire, can_promote) VALUES
(@restaurant_id, 5, 'owner', 'Proprietario', 'PROPRIETÀ', 7000, TRUE, TRUE, TRUE, TRUE, TRUE),
(@restaurant_id, 4, 'chef', 'Chef', 'CUCINA', 5000, FALSE, TRUE, FALSE, FALSE, FALSE),
(@restaurant_id, 3, 'cook', 'Cuoco', 'CUCINA', 3500, FALSE, FALSE, FALSE, FALSE, FALSE),
(@restaurant_id, 2, 'head_waiter', 'Caposala', 'SALA', 3000, FALSE, TRUE, FALSE, FALSE, FALSE),
(@restaurant_id, 1, 'waiter', 'Cameriere', 'SALA', 2000, FALSE, FALSE, FALSE, FALSE, FALSE)
ON DUPLICATE KEY UPDATE name=VALUES(name), category=VALUES(category), salary=VALUES(salary);

-- ============================================
-- SEED: GRADI SICUREZZA
-- ============================================
SET @security_id = (SELECT id FROM jobs WHERE code = 'security');

INSERT INTO job_grades (job_id, grade_level, code, name, category, salary, is_boss, is_supervisor, can_hire, can_fire, can_promote) VALUES
(@security_id, 4, 'operations_director', 'Direttore Operativo', 'DIREZIONE', 7000, TRUE, TRUE, TRUE, TRUE, TRUE),
(@security_id, 3, 'security_manager', 'Responsabile Sicurezza', 'GESTIONE', 5000, FALSE, TRUE, TRUE, FALSE, FALSE),
(@security_id, 2, 'team_leader', 'Caposquadra', 'OPERATIVO', 3500, FALSE, TRUE, FALSE, FALSE, FALSE),
(@security_id, 1, 'guard', 'Guardia', 'OPERATIVO', 2500, FALSE, FALSE, FALSE, FALSE, FALSE)
ON DUPLICATE KEY UPDATE name=VALUES(name), category=VALUES(category), salary=VALUES(salary);

-- ============================================
-- SEED: GRADI DISPATCH
-- ============================================
SET @dispatch_id = (SELECT id FROM jobs WHERE code = 'dispatch');

INSERT INTO job_grades (job_id, grade_level, code, name, category, salary, is_boss, is_supervisor, can_hire, can_fire, can_promote) VALUES
(@dispatch_id, 4, 'director', 'Direttore Comunicazioni', 'DIREZIONE', 8000, TRUE, TRUE, TRUE, TRUE, TRUE),
(@dispatch_id, 3, 'supervisor', 'Supervisore', 'GESTIONE', 5500, FALSE, TRUE, TRUE, FALSE, FALSE),
(@dispatch_id, 2, 'senior_operator', 'Operatore Senior', 'OPERATORI', 4000, FALSE, FALSE, FALSE, FALSE, FALSE),
(@dispatch_id, 1, 'operator', 'Operatore', 'OPERATORI', 3000, FALSE, FALSE, FALSE, FALSE, FALSE)
ON DUPLICATE KEY UPDATE name=VALUES(name), category=VALUES(category), salary=VALUES(salary);

-- ============================================
-- SEED: GRADO DISOCCUPATO
-- ============================================
SET @unemployed_id = (SELECT id FROM jobs WHERE code = 'unemployed');

INSERT INTO job_grades (job_id, grade_level, code, name, category, salary, is_boss, is_supervisor, can_hire, can_fire, can_promote) VALUES
(@unemployed_id, 1, 'unemployed', 'Cittadino', 'CIVILE', 0, FALSE, FALSE, FALSE, FALSE, FALSE)
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- ============================================
-- ASSEGNAZIONE PERMESSI AI GRADI LSPD
-- ============================================
-- Tutti gli LSPD possono visualizzare casi/mandati/multe
INSERT INTO job_grade_permissions (job_grade_id, permission_id)
SELECT jg.id, p.id 
FROM job_grades jg
CROSS JOIN permissions p
WHERE jg.job_id = @lspd_id 
AND p.code IN ('lspd.case.view', 'lspd.warrant.view', 'lspd.fine.view', 'lspd.evidence.view', 'chat.access')
ON DUPLICATE KEY UPDATE granted_at = NOW();

-- Agenti (livello 2+) possono creare
INSERT INTO job_grade_permissions (job_grade_id, permission_id)
SELECT jg.id, p.id 
FROM job_grades jg
CROSS JOIN permissions p
WHERE jg.job_id = @lspd_id AND jg.grade_level >= 2
AND p.code IN ('lspd.case.create', 'lspd.warrant.create', 'lspd.fine.create', 'lspd.evidence.manage')
ON DUPLICATE KEY UPDATE granted_at = NOW();

-- Sergenti+ (livello 6+) possono modificare/eseguire
INSERT INTO job_grade_permissions (job_grade_id, permission_id)
SELECT jg.id, p.id 
FROM job_grades jg
CROSS JOIN permissions p
WHERE jg.job_id = @lspd_id AND jg.grade_level >= 6
AND p.code IN ('lspd.case.edit', 'lspd.case.close', 'lspd.warrant.execute', 'lspd.fine.edit', 'lspd.employees.view')
ON DUPLICATE KEY UPDATE granted_at = NOW();

-- Capitani+ (livello 9+) possono revocare/eliminare
INSERT INTO job_grade_permissions (job_grade_id, permission_id)
SELECT jg.id, p.id 
FROM job_grades jg
CROSS JOIN permissions p
WHERE jg.job_id = @lspd_id AND jg.grade_level >= 9
AND p.code IN ('lspd.warrant.revoke', 'lspd.fine.delete', 'lspd.case.delete', 'lspd.employees.manage')
ON DUPLICATE KEY UPDATE granted_at = NOW();

-- ============================================
-- ASSEGNAZIONE PERMESSI AI GRADI EMS
-- ============================================
-- Tutti EMS possono visualizzare
INSERT INTO job_grade_permissions (job_grade_id, permission_id)
SELECT jg.id, p.id 
FROM job_grades jg
CROSS JOIN permissions p
WHERE jg.job_id = @ems_id 
AND p.code IN ('ems.patient.view', 'ems.report.view', 'chat.access')
ON DUPLICATE KEY UPDATE granted_at = NOW();

-- Infermieri+ possono creare
INSERT INTO job_grade_permissions (job_grade_id, permission_id)
SELECT jg.id, p.id 
FROM job_grades jg
CROSS JOIN permissions p
WHERE jg.job_id = @ems_id AND jg.grade_level >= 2
AND p.code IN ('ems.patient.create', 'ems.patient.edit', 'ems.report.create')
ON DUPLICATE KEY UPDATE granted_at = NOW();

-- Dottori+ possono firmare
INSERT INTO job_grade_permissions (job_grade_id, permission_id)
SELECT jg.id, p.id 
FROM job_grades jg
CROSS JOIN permissions p
WHERE jg.job_id = @ems_id AND jg.grade_level >= 3
AND p.code IN ('ems.report.sign', 'ems.employees.view')
ON DUPLICATE KEY UPDATE granted_at = NOW();

-- Dirigenti+ possono gestire
INSERT INTO job_grade_permissions (job_grade_id, permission_id)
SELECT jg.id, p.id 
FROM job_grades jg
CROSS JOIN permissions p
WHERE jg.job_id = @ems_id AND jg.grade_level >= 5
AND p.code IN ('ems.employees.manage')
ON DUPLICATE KEY UPDATE granted_at = NOW();

-- ============================================
-- VERIFICATION
-- ============================================
-- SELECT j.name_short, COUNT(jg.id) as grades FROM jobs j LEFT JOIN job_grades jg ON j.id = jg.job_id GROUP BY j.id;
-- SELECT COUNT(*) FROM permissions;
-- SELECT COUNT(*) FROM job_grade_permissions;
