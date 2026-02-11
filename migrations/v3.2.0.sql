-- ============================================
-- PURE LIFE OS - Migration v3.2.0
-- Sprint Bug Fix A-F + Fase 2
-- Date: 2026-02-11
-- ============================================

-- ============================================
-- A) EVIDENCE TABLE
-- ============================================
-- Tabella già esistente con collected_at
-- Verifica che la colonna esista:
ALTER TABLE evidence 
    ADD COLUMN IF NOT EXISTS collected_at DATETIME DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE evidence 
    ADD COLUMN IF NOT EXISTS collected_by INT NULL,
    ADD CONSTRAINT fk_evidence_collected_by 
    FOREIGN KEY (collected_by) REFERENCES users(id) ON DELETE SET NULL;

-- Backfill: se esistono record senza collected_at
UPDATE evidence SET collected_at = NOW() WHERE collected_at IS NULL;

-- ============================================
-- B) WARRANTS STATUS ENUM
-- ============================================
-- Aggiunge colonna status se non esiste
ALTER TABLE warrants 
    ADD COLUMN IF NOT EXISTS status ENUM('OPEN', 'EXECUTED', 'EXPIRED', 'CANCELLED') DEFAULT 'OPEN';

-- Colonne tracking revoca/esecuzione
ALTER TABLE warrants 
    ADD COLUMN IF NOT EXISTS executed_at DATETIME NULL,
    ADD COLUMN IF NOT EXISTS executed_by INT NULL,
    ADD COLUMN IF NOT EXISTS execution_notes TEXT NULL,
    ADD COLUMN IF NOT EXISTS cancelled_at DATETIME NULL,
    ADD COLUMN IF NOT EXISTS cancelled_by INT NULL,
    ADD COLUMN IF NOT EXISTS cancellation_reason TEXT NULL;

-- Backfill: mandati esistenti senza status → OPEN
UPDATE warrants SET status = 'OPEN' WHERE status IS NULL;

-- Indice per query frequenti
CREATE INDEX IF NOT EXISTS idx_warrants_status ON warrants(status);

-- ============================================
-- C) FINES MODIFICATION TRACKING
-- ============================================
ALTER TABLE fines 
    ADD COLUMN IF NOT EXISTS last_modified_by INT NULL,
    ADD COLUMN IF NOT EXISTS modification_reason TEXT NULL,
    ADD COLUMN IF NOT EXISTS updated_at DATETIME NULL;

-- citizen_identifier già nullable, verifica:
ALTER TABLE fines MODIFY COLUMN citizen_identifier VARCHAR(100) NULL;

-- Backfill: nessuno necessario (campi nuovi opzionali)

-- ============================================
-- D) LEGAL_CASES LAWYER_NAME
-- ============================================
ALTER TABLE legal_cases 
    ADD COLUMN IF NOT EXISTS lawyer_name VARCHAR(100) NULL;

-- Backfill: nessuno necessario (campo nuovo opzionale)

-- ============================================
-- E) AGENDA APPOINTMENTS (se non esiste)
-- ============================================
CREATE TABLE IF NOT EXISTS agenda_appointments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL,
    description TEXT NULL,
    scheduled_at DATETIME NOT NULL,
    duration_minutes INT DEFAULT 30,
    location VARCHAR(200) NULL,
    appointment_type VARCHAR(50) DEFAULT 'meeting',
    status ENUM('scheduled', 'confirmed', 'cancelled', 'completed') DEFAULT 'scheduled',
    organizer_id INT NOT NULL,
    is_private BOOLEAN DEFAULT FALSE,
    color VARCHAR(20) NULL,
    reminder_settings JSON NULL,
    reminder_sent JSON NULL,
    discord_webhook_url VARCHAR(500) NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_appointments_scheduled ON agenda_appointments(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_appointments_organizer ON agenda_appointments(organizer_id);

-- ============================================
-- F) MAP_POIS (se non esiste)
-- ============================================
CREATE TABLE IF NOT EXISTS map_pois (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    category VARCHAR(50) NOT NULL,
    x_percent FLOAT NOT NULL,
    y_percent FLOAT NOT NULL,
    address VARCHAR(200) NULL,
    phone VARCHAR(50) NULL,
    is_public BOOLEAN DEFAULT TRUE,
    created_by INT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_pois_category ON map_pois(category);

-- ============================================
-- AUDIT LOG (verifica struttura)
-- ============================================
-- La tabella audit_log dovrebbe già esistere
-- Aggiungi colonne mancanti se necessario:
ALTER TABLE audit_log 
    ADD COLUMN IF NOT EXISTS entity_type VARCHAR(50) NULL,
    ADD COLUMN IF NOT EXISTS entity_id INT NULL,
    ADD COLUMN IF NOT EXISTS description TEXT NULL,
    ADD COLUMN IF NOT EXISTS metadata JSON NULL;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Esegui queste query per verificare la migrazione:

-- SELECT COUNT(*) as evidence_count FROM evidence;
-- SELECT status, COUNT(*) FROM warrants GROUP BY status;
-- SELECT COUNT(*) FROM fines WHERE citizen_identifier IS NULL;
-- SELECT COUNT(*) FROM legal_cases WHERE lawyer_name IS NOT NULL;
-- SELECT COUNT(*) FROM agenda_appointments;
-- SELECT COUNT(*) FROM map_pois;

-- ============================================
-- ROLLBACK (in caso di problemi)
-- ============================================
-- ALTER TABLE warrants DROP COLUMN status;
-- ALTER TABLE warrants DROP COLUMN executed_at, executed_by, execution_notes;
-- ALTER TABLE warrants DROP COLUMN cancelled_at, cancelled_by, cancellation_reason;
-- ALTER TABLE fines DROP COLUMN last_modified_by, modification_reason, updated_at;
-- ALTER TABLE legal_cases DROP COLUMN lawyer_name;
-- DROP TABLE IF EXISTS agenda_appointments;
-- DROP TABLE IF EXISTS map_pois;
