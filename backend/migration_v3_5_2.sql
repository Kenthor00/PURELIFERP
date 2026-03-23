-- PURE LIFE OS - Database Migration Script
-- Allinea lo schema del database con i modelli SQLAlchemy
-- Data: 2026-03-23

-- ==========================================
-- 1. CASES - Aggiungi closed_at
-- ==========================================
ALTER TABLE cases ADD COLUMN IF NOT EXISTS closed_at DATETIME NULL;

-- ==========================================
-- 2. COURT_HEARINGS - Aggiungi notes e updated_at
-- ==========================================
ALTER TABLE court_hearings ADD COLUMN IF NOT EXISTS notes TEXT NULL;
ALTER TABLE court_hearings ADD COLUMN IF NOT EXISTS updated_at DATETIME NULL;
-- Copia dati da minutes a notes se esiste
UPDATE court_hearings SET notes = minutes WHERE notes IS NULL AND minutes IS NOT NULL;

-- ==========================================
-- 3. NEWS_ARTICLES - Aggiungi video_embed_type
-- ==========================================
ALTER TABLE news_articles ADD COLUMN IF NOT EXISTS video_embed_type VARCHAR(50) NULL DEFAULT 'youtube';

-- ==========================================
-- 4. CHAT_CHANNELS - Aggiungi sector e min_level
-- ==========================================
ALTER TABLE chat_channels ADD COLUMN IF NOT EXISTS sector VARCHAR(50) NULL;
ALTER TABLE chat_channels ADD COLUMN IF NOT EXISTS min_level INT DEFAULT 0;

-- ==========================================
-- 5. CHAT_MESSAGES - Ristruttura completa
-- ==========================================
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS author_id INT NULL;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS author_game_name VARCHAR(100) NULL;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS author_sector VARCHAR(50) NULL;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS author_grade INT DEFAULT 0;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS mentions TEXT NULL;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS deleted_by_id INT NULL;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS deleted_at DATETIME NULL;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS updated_at DATETIME NULL;
-- Copia sender_id a author_id
UPDATE chat_messages SET author_id = sender_id WHERE author_id IS NULL AND sender_id IS NOT NULL;

-- ==========================================
-- 6. DISPATCH_CALLS - Aggiungi colonne mancanti
-- ==========================================
ALTER TABLE dispatch_calls ADD COLUMN IF NOT EXISTS created_by INT NULL;
ALTER TABLE dispatch_calls ADD COLUMN IF NOT EXISTS assigned_by INT NULL;
ALTER TABLE dispatch_calls ADD COLUMN IF NOT EXISTS assigned_at DATETIME NULL;
ALTER TABLE dispatch_calls ADD COLUMN IF NOT EXISTS completed_at DATETIME NULL;
-- Copia dispatcher_id a created_by
UPDATE dispatch_calls SET created_by = dispatcher_id WHERE created_by IS NULL AND dispatcher_id IS NOT NULL;

-- ==========================================
-- 7. EVIDENCE - Aggiungi colonne mancanti
-- ==========================================
ALTER TABLE evidence ADD COLUMN IF NOT EXISTS collected_by INT NULL;
ALTER TABLE evidence ADD COLUMN IF NOT EXISTS collected_at DATETIME NULL;

-- ==========================================
-- 8. FINES - Ristruttura
-- ==========================================
ALTER TABLE fines ADD COLUMN IF NOT EXISTS citizen_name VARCHAR(255) NULL;
ALTER TABLE fines ADD COLUMN IF NOT EXISTS citizen_identifier VARCHAR(255) NULL;
ALTER TABLE fines ADD COLUMN IF NOT EXISTS paid_at DATETIME NULL;
ALTER TABLE fines ADD COLUMN IF NOT EXISTS due_date DATETIME NULL;
-- Copia subject_name/identifier a citizen_name/identifier
UPDATE fines SET citizen_name = subject_name WHERE citizen_name IS NULL AND subject_name IS NOT NULL;
UPDATE fines SET citizen_identifier = subject_identifier WHERE citizen_identifier IS NULL AND subject_identifier IS NOT NULL;

-- ==========================================
-- 9. LEGAL_CASES - Ristruttura
-- ==========================================
ALTER TABLE legal_cases ADD COLUMN IF NOT EXISTS title VARCHAR(500) NULL;
ALTER TABLE legal_cases ADD COLUMN IF NOT EXISTS plaintiff_name VARCHAR(255) NULL;
ALTER TABLE legal_cases ADD COLUMN IF NOT EXISTS defendant_name VARCHAR(255) NULL;
ALTER TABLE legal_cases ADD COLUMN IF NOT EXISTS related_case_id INT NULL;
-- Copia client_name a defendant_name
UPDATE legal_cases SET defendant_name = client_name WHERE defendant_name IS NULL AND client_name IS NOT NULL;

-- ==========================================
-- 10. WARRANTS - Ristruttura
-- ==========================================
ALTER TABLE warrants ADD COLUMN IF NOT EXISTS suspect_name VARCHAR(255) NULL;
ALTER TABLE warrants ADD COLUMN IF NOT EXISTS suspect_identifier VARCHAR(255) NULL;
ALTER TABLE warrants ADD COLUMN IF NOT EXISTS reason TEXT NULL;
ALTER TABLE warrants ADD COLUMN IF NOT EXISTS executed BOOLEAN DEFAULT FALSE;
ALTER TABLE warrants ADD COLUMN IF NOT EXISTS executed_at DATETIME NULL;
ALTER TABLE warrants ADD COLUMN IF NOT EXISTS executed_by INT NULL;
-- Copia subject_name/identifier a suspect_name/identifier
UPDATE warrants SET suspect_name = subject_name WHERE suspect_name IS NULL AND subject_name IS NOT NULL;
UPDATE warrants SET suspect_identifier = subject_identifier WHERE suspect_identifier IS NULL AND subject_identifier IS NOT NULL;
UPDATE warrants SET reason = description WHERE reason IS NULL AND description IS NOT NULL;

-- ==========================================
-- 11. MEDICAL_REPORTS - Aggiungi colonne mancanti
-- ==========================================
ALTER TABLE medical_reports ADD COLUMN IF NOT EXISTS is_confidential BOOLEAN DEFAULT FALSE;
ALTER TABLE medical_reports ADD COLUMN IF NOT EXISTS updated_at DATETIME NULL;

-- ==========================================
-- 12. TIMELINE_EVENTS - Aggiungi colonne con nomi corretti
-- ==========================================
ALTER TABLE timeline_events ADD COLUMN IF NOT EXISTS entity_type VARCHAR(100) NULL;
ALTER TABLE timeline_events ADD COLUMN IF NOT EXISTS entity_id INT NULL;
ALTER TABLE timeline_events ADD COLUMN IF NOT EXISTS extra_data TEXT NULL;
-- Copia reference_type/id a entity_type/id
UPDATE timeline_events SET entity_type = reference_type WHERE entity_type IS NULL AND reference_type IS NOT NULL;
UPDATE timeline_events SET entity_id = reference_id WHERE entity_id IS NULL AND reference_id IS NOT NULL;

-- ==========================================
-- 13. BUSINESSES - Aggiungi owner_id
-- ==========================================
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS owner_id INT NULL;

-- ==========================================
-- 14. CITY_EVENTS - Aggiungi created_by
-- ==========================================
ALTER TABLE city_events ADD COLUMN IF NOT EXISTS created_by INT NULL;

-- ==========================================
-- 15. ADVERTISEMENTS - Allinea colonne
-- ==========================================
ALTER TABLE advertisements ADD COLUMN IF NOT EXISTS price_ingame DECIMAL(10,2) NULL;
ALTER TABLE advertisements ADD COLUMN IF NOT EXISTS created_by INT NULL;

-- ==========================================
-- 16. AUDIT_LOGS - Assicura tutti i campi
-- ==========================================
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS resource_type VARCHAR(100) NULL;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS resource_id VARCHAR(255) NULL;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS details TEXT NULL;

-- DONE
SELECT 'Migration completed successfully!' AS status;
