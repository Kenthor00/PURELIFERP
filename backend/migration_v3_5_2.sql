-- PURE LIFE OS - Database Migration Script v3.5.2
-- Eseguire sulla VPS con: mysql -u root -p purelife < migration_v3_5_2.sql
-- Data: 2026-03-23

-- ==========================================
-- 1. CASES
-- ==========================================
ALTER TABLE cases ADD COLUMN closed_at DATETIME NULL;
ALTER TABLE cases MODIFY COLUMN priority VARCHAR(50) NULL DEFAULT 'medium';

-- ==========================================
-- 2. COURT_HEARINGS
-- ==========================================
ALTER TABLE court_hearings ADD COLUMN notes TEXT NULL;
ALTER TABLE court_hearings ADD COLUMN updated_at DATETIME NULL;
UPDATE court_hearings SET notes = minutes WHERE notes IS NULL AND minutes IS NOT NULL;

-- ==========================================
-- 3. NEWS_ARTICLES
-- ==========================================
ALTER TABLE news_articles ADD COLUMN video_embed_type VARCHAR(50) NULL DEFAULT 'youtube';

-- ==========================================
-- 4. CHAT_CHANNELS
-- ==========================================
ALTER TABLE chat_channels ADD COLUMN sector VARCHAR(50) NULL;
ALTER TABLE chat_channels ADD COLUMN min_level INT DEFAULT 0;
-- Crea canale generale per tutti gli utenti
INSERT IGNORE INTO chat_channels (name, display_name, description, channel_type, is_active) VALUES ('generale', 'Generale', 'Canale pubblico per tutti', 'public', 1);
INSERT IGNORE INTO chat_channels (name, display_name, description, channel_type, is_active) VALUES ('cittadini', 'Cittadini', 'Chat cittadini di Pure Life', 'public', 1);

-- ==========================================
-- 5. CHAT_MESSAGES
-- ==========================================
ALTER TABLE chat_messages ADD COLUMN author_id INT NULL;
ALTER TABLE chat_messages ADD COLUMN author_game_name VARCHAR(100) NULL;
ALTER TABLE chat_messages ADD COLUMN author_sector VARCHAR(50) NULL;
ALTER TABLE chat_messages ADD COLUMN author_grade INT DEFAULT 0;
ALTER TABLE chat_messages ADD COLUMN mentions TEXT NULL;
ALTER TABLE chat_messages ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE chat_messages ADD COLUMN deleted_by_id INT NULL;
ALTER TABLE chat_messages ADD COLUMN deleted_at DATETIME NULL;
ALTER TABLE chat_messages ADD COLUMN updated_at DATETIME NULL;
ALTER TABLE chat_messages MODIFY COLUMN sender_id INT NULL;
ALTER TABLE chat_messages MODIFY COLUMN action_type VARCHAR(100) NULL;
ALTER TABLE chat_messages MODIFY COLUMN action_data TEXT NULL;
UPDATE chat_messages SET author_id = sender_id WHERE author_id IS NULL AND sender_id IS NOT NULL;

-- ==========================================
-- 6. DISPATCH_CALLS
-- ==========================================
ALTER TABLE dispatch_calls ADD COLUMN created_by INT NULL;
ALTER TABLE dispatch_calls ADD COLUMN assigned_by INT NULL;
ALTER TABLE dispatch_calls ADD COLUMN assigned_at DATETIME NULL;
ALTER TABLE dispatch_calls ADD COLUMN completed_at DATETIME NULL;
ALTER TABLE dispatch_calls MODIFY COLUMN dispatcher_id INT NULL;
UPDATE dispatch_calls SET created_by = dispatcher_id WHERE created_by IS NULL AND dispatcher_id IS NOT NULL;

-- ==========================================
-- 7. EVIDENCE
-- ==========================================
ALTER TABLE evidence ADD COLUMN collected_by INT NULL;
ALTER TABLE evidence ADD COLUMN collected_at DATETIME NULL;

-- ==========================================
-- 8. FINES
-- ==========================================
ALTER TABLE fines ADD COLUMN citizen_name VARCHAR(255) NULL;
ALTER TABLE fines ADD COLUMN citizen_identifier VARCHAR(255) NULL;
ALTER TABLE fines ADD COLUMN paid_at DATETIME NULL;
ALTER TABLE fines ADD COLUMN due_date DATETIME NULL;
ALTER TABLE fines MODIFY COLUMN subject_name VARCHAR(255) NULL;
ALTER TABLE fines MODIFY COLUMN subject_identifier VARCHAR(255) NULL;
UPDATE fines SET citizen_name = subject_name WHERE citizen_name IS NULL AND subject_name IS NOT NULL;
UPDATE fines SET citizen_identifier = subject_identifier WHERE citizen_identifier IS NULL AND subject_identifier IS NOT NULL;

-- ==========================================
-- 9. LEGAL_CASES
-- ==========================================
ALTER TABLE legal_cases ADD COLUMN title VARCHAR(500) NULL;
ALTER TABLE legal_cases ADD COLUMN plaintiff_name VARCHAR(255) NULL;
ALTER TABLE legal_cases ADD COLUMN defendant_name VARCHAR(255) NULL;
ALTER TABLE legal_cases ADD COLUMN related_case_id INT NULL;
ALTER TABLE legal_cases MODIFY COLUMN client_name VARCHAR(255) NULL;
ALTER TABLE legal_cases MODIFY COLUMN client_identifier VARCHAR(255) NULL;
UPDATE legal_cases SET defendant_name = client_name WHERE defendant_name IS NULL AND client_name IS NOT NULL;

-- ==========================================
-- 10. WARRANTS
-- ==========================================
ALTER TABLE warrants ADD COLUMN suspect_name VARCHAR(255) NULL;
ALTER TABLE warrants ADD COLUMN suspect_identifier VARCHAR(255) NULL;
ALTER TABLE warrants ADD COLUMN reason TEXT NULL;
ALTER TABLE warrants ADD COLUMN executed BOOLEAN DEFAULT FALSE;
ALTER TABLE warrants ADD COLUMN executed_at DATETIME NULL;
ALTER TABLE warrants ADD COLUMN executed_by INT NULL;
ALTER TABLE warrants MODIFY COLUMN subject_name VARCHAR(255) NULL;
ALTER TABLE warrants MODIFY COLUMN subject_identifier VARCHAR(255) NULL;
ALTER TABLE warrants MODIFY COLUMN description TEXT NULL;
ALTER TABLE warrants MODIFY COLUMN warrant_type VARCHAR(100) NULL;
UPDATE warrants SET suspect_name = subject_name WHERE suspect_name IS NULL AND subject_name IS NOT NULL;
UPDATE warrants SET suspect_identifier = subject_identifier WHERE suspect_identifier IS NULL AND subject_identifier IS NOT NULL;
UPDATE warrants SET reason = description WHERE reason IS NULL AND description IS NOT NULL;

-- ==========================================
-- 11. MEDICAL_REPORTS
-- ==========================================
ALTER TABLE medical_reports ADD COLUMN is_confidential BOOLEAN DEFAULT FALSE;
ALTER TABLE medical_reports ADD COLUMN updated_at DATETIME NULL;

-- ==========================================
-- 12. TIMELINE_EVENTS
-- ==========================================
ALTER TABLE timeline_events ADD COLUMN entity_type VARCHAR(100) NULL;
ALTER TABLE timeline_events ADD COLUMN entity_id INT NULL;
ALTER TABLE timeline_events ADD COLUMN extra_data TEXT NULL;
UPDATE timeline_events SET entity_type = reference_type WHERE entity_type IS NULL AND reference_type IS NOT NULL;
UPDATE timeline_events SET entity_id = reference_id WHERE entity_id IS NULL AND reference_id IS NOT NULL;

-- ==========================================
-- 13. BUSINESSES, EVENTS, ADS
-- ==========================================
ALTER TABLE businesses ADD COLUMN owner_id INT NULL;
ALTER TABLE city_events ADD COLUMN created_by INT NULL;
ALTER TABLE advertisements ADD COLUMN price_ingame DECIMAL(10,2) NULL;
ALTER TABLE advertisements ADD COLUMN created_by INT NULL;

-- ==========================================
-- 14. AUDIT_LOGS
-- ==========================================
ALTER TABLE audit_logs ADD COLUMN resource_type VARCHAR(100) NULL;
ALTER TABLE audit_logs ADD COLUMN resource_id VARCHAR(255) NULL;
ALTER TABLE audit_logs ADD COLUMN details TEXT NULL;

-- DONE
SELECT 'Migration v3.5.2 completed!' AS status;
