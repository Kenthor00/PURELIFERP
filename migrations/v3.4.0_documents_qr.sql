-- PURE LIFE OS - Migration v3.4.0
-- Sistema Documenti Verificabili con QR
-- Date: 2026-02-11

-- ==========================================
-- TABELLA TIPI DOCUMENTO
-- ==========================================
CREATE TABLE IF NOT EXISTS document_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    name_short VARCHAR(50) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL DEFAULT 'general',
    issuing_authority VARCHAR(100) NOT NULL,
    has_expiry BOOLEAN DEFAULT FALSE,
    default_validity_days INT DEFAULT NULL,
    required_fields JSON DEFAULT NULL,
    icon VARCHAR(50) DEFAULT 'FileText',
    color VARCHAR(20) DEFAULT '#00FF88',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- TABELLA DOCUMENTI
-- ==========================================
CREATE TABLE IF NOT EXISTS documents (
    id VARCHAR(36) PRIMARY KEY,
    document_number VARCHAR(50) NOT NULL UNIQUE,
    type_id INT NOT NULL,
    citizen_id INT NOT NULL,
    citizen_name VARCHAR(100) NOT NULL,
    citizen_surname VARCHAR(100) NOT NULL,
    citizen_dob DATE DEFAULT NULL,
    citizen_photo_url VARCHAR(500) DEFAULT NULL,
    citizen_identifier VARCHAR(50) DEFAULT NULL,
    
    -- Emissione
    issued_by INT NOT NULL,
    issued_by_name VARCHAR(100) NOT NULL,
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    issuing_office VARCHAR(100) DEFAULT NULL,
    
    -- Scadenza
    expires_at TIMESTAMP DEFAULT NULL,
    
    -- Stato
    status ENUM('VALID', 'SUSPENDED', 'REVOKED', 'EXPIRED') DEFAULT 'VALID',
    status_reason TEXT DEFAULT NULL,
    status_changed_at TIMESTAMP DEFAULT NULL,
    status_changed_by INT DEFAULT NULL,
    
    -- Dati aggiuntivi (per licenze specifiche)
    extra_data JSON DEFAULT NULL,
    
    -- QR Verification
    qr_signature VARCHAR(64) NOT NULL,
    verify_token VARCHAR(32) NOT NULL UNIQUE,
    
    -- Metadata
    notes TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (type_id) REFERENCES document_types(id),
    FOREIGN KEY (citizen_id) REFERENCES user(id),
    FOREIGN KEY (issued_by) REFERENCES user(id),
    INDEX idx_documents_citizen (citizen_id),
    INDEX idx_documents_type (type_id),
    INDEX idx_documents_status (status),
    INDEX idx_documents_number (document_number),
    INDEX idx_documents_verify_token (verify_token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- TABELLA EVENTI DOCUMENTO (Timeline)
-- ==========================================
CREATE TABLE IF NOT EXISTS document_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    document_id VARCHAR(36) NOT NULL,
    event_type ENUM('CREATED', 'UPDATED', 'STATUS_CHANGE', 'VERIFIED', 'RENEWAL', 'NOTE_ADDED') NOT NULL,
    event_data JSON DEFAULT NULL,
    old_status VARCHAR(20) DEFAULT NULL,
    new_status VARCHAR(20) DEFAULT NULL,
    reason TEXT DEFAULT NULL,
    performed_by INT NOT NULL,
    performed_by_name VARCHAR(100) NOT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (performed_by) REFERENCES user(id),
    INDEX idx_doc_events_document (document_id),
    INDEX idx_doc_events_type (event_type),
    INDEX idx_doc_events_date (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- PERMESSI DOCUMENTO (per RBAC)
-- ==========================================
INSERT IGNORE INTO permission_records (code, category, description) VALUES
('DOC_VIEW', 'documents', 'Visualizza documenti'),
('DOC_CREATE_ID', 'documents', 'Emette Carte d''Identità'),
('DOC_CREATE_LICENSE', 'documents', 'Emette Patenti di Guida'),
('DOC_CREATE_PERMIT', 'documents', 'Emette Licenze (armi, caccia, etc.)'),
('DOC_SUSPEND', 'documents', 'Sospende documenti'),
('DOC_REVOKE', 'documents', 'Revoca documenti'),
('DOC_UPDATE', 'documents', 'Modifica dati documento'),
('DOC_VERIFY', 'documents', 'Verifica documenti (controllo autorità)'),
('DOC_ADMIN', 'documents', 'Gestione completa documenti');

-- ==========================================
-- SEED TIPI DOCUMENTO
-- ==========================================
INSERT INTO document_types (code, name, name_short, description, category, issuing_authority, has_expiry, default_validity_days, icon, color) VALUES
('CARTA_IDENTITA', 'Carta d''Identità Elettronica', 'C.I.E.', 'Documento di identificazione personale valido su tutto il territorio', 'identity', 'Comune di Los Santos', TRUE, 3650, 'CreditCard', '#00FF88'),
('PATENTE_B', 'Patente di Guida Cat. B', 'Patente B', 'Licenza di guida per autoveicoli fino a 3.5t', 'driving', 'Motorizzazione Civile', TRUE, 1825, 'Car', '#3B82F6'),
('PATENTE_A', 'Patente di Guida Cat. A', 'Patente A', 'Licenza di guida per motocicli', 'driving', 'Motorizzazione Civile', TRUE, 1825, 'Bike', '#8B5CF6'),
('PATENTE_C', 'Patente di Guida Cat. C', 'Patente C', 'Licenza di guida per veicoli pesanti', 'driving', 'Motorizzazione Civile', TRUE, 1825, 'Truck', '#F59E0B'),
('PORTO_ARMI', 'Porto d''Armi', 'P.A.', 'Licenza per porto e detenzione armi da fuoco', 'permit', 'Questura di Los Santos', TRUE, 365, 'Shield', '#EF4444'),
('LICENZA_CACCIA', 'Licenza di Caccia', 'L.C.', 'Autorizzazione all''esercizio venatorio', 'permit', 'Regione San Andreas', TRUE, 365, 'Target', '#22C55E'),
('LICENZA_PESCA', 'Licenza di Pesca', 'L.P.', 'Autorizzazione alla pesca sportiva', 'permit', 'Regione San Andreas', TRUE, 365, 'Fish', '#06B6D4'),
('LICENZA_TAXI', 'Licenza Taxi NCC', 'L.T.', 'Autorizzazione al servizio di trasporto pubblico non di linea', 'professional', 'Comune di Los Santos', TRUE, 730, 'Taxi', '#FBBF24'),
('LICENZA_MEDICA', 'Abilitazione Professione Medica', 'A.P.M.', 'Licenza per l''esercizio della professione medica', 'professional', 'Ordine dei Medici LS', FALSE, NULL, 'Stethoscope', '#EC4899'),
('LICENZA_LEGALE', 'Abilitazione Professione Forense', 'A.P.F.', 'Licenza per l''esercizio della professione forense', 'professional', 'Ordine degli Avvocati LS', FALSE, NULL, 'Scale', '#A855F7')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- ==========================================
-- ASSEGNAZIONE PERMESSI AI JOB
-- ==========================================
-- Governo: può emettere carte identità
INSERT IGNORE INTO job_permissions (job_id, permission_code, min_grade_level) 
SELECT j.id, 'DOC_CREATE_ID', 1 FROM jobs j WHERE j.name_short IN ('governo', 'government', 'GOV');

-- Governo: può emettere patenti
INSERT IGNORE INTO job_permissions (job_id, permission_code, min_grade_level) 
SELECT j.id, 'DOC_CREATE_LICENSE', 1 FROM jobs j WHERE j.name_short IN ('governo', 'government', 'GOV');

-- Governo: può emettere licenze
INSERT IGNORE INTO job_permissions (job_id, permission_code, min_grade_level) 
SELECT j.id, 'DOC_CREATE_PERMIT', 2 FROM jobs j WHERE j.name_short IN ('governo', 'government', 'GOV');

-- LSPD: può verificare documenti
INSERT IGNORE INTO job_permissions (job_id, permission_code, min_grade_level) 
SELECT j.id, 'DOC_VERIFY', 0 FROM jobs j WHERE j.name_short IN ('lspd', 'police', 'LSPD');

-- LSPD: può sospendere documenti (grado medio)
INSERT IGNORE INTO job_permissions (job_id, permission_code, min_grade_level) 
SELECT j.id, 'DOC_SUSPEND', 2 FROM jobs j WHERE j.name_short IN ('lspd', 'police', 'LSPD');

-- Giustizia: può revocare documenti
INSERT IGNORE INTO job_permissions (job_id, permission_code, min_grade_level) 
SELECT j.id, 'DOC_REVOKE', 3 FROM jobs j WHERE j.name_short IN ('giustizia', 'justice', 'tribunale');

-- EMS: può visualizzare documenti
INSERT IGNORE INTO job_permissions (job_id, permission_code, min_grade_level) 
SELECT j.id, 'DOC_VIEW', 0 FROM jobs j WHERE j.name_short IN ('ems', 'ambulance', 'EMS');
