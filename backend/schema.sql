-- PURE LIFE OS - Extended Schema MySQL
-- Database: purelife_os
-- Version: 2.0.0

CREATE DATABASE IF NOT EXISTS purelife_os CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE purelife_os;

-- ==========================================
-- UTENTI ESTESO
-- ==========================================

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    badge_number VARCHAR(50) UNIQUE,
    role ENUM('police', 'ems', 'dispatch', 'admin', 'government', 'judge', 'lawyer', 'prosecutor', 'weazel', 'citizen') NOT NULL DEFAULT 'citizen',
    department VARCHAR(50),
    phone_number VARCHAR(20),
    fivem_identifier VARCHAR(100) UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    sound_enabled BOOLEAN DEFAULT TRUE,
    presence ENUM('online', 'in_service', 'off_duty', 'offline') DEFAULT 'offline',
    last_seen DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_fivem (fivem_identifier),
    INDEX idx_role (role)
) ENGINE=InnoDB;

-- ==========================================
-- LSPD TABLES
-- ==========================================

CREATE TABLE IF NOT EXISTS cases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    case_number VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status ENUM('open', 'investigating', 'closed', 'archived') DEFAULT 'open',
    priority VARCHAR(10) DEFAULT 'normale',
    officer_id INT,
    suspect_name VARCHAR(100),
    suspect_identifier VARCHAR(100),
    location VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (officer_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_case_number (case_number),
    INDEX idx_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS warrants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    warrant_number VARCHAR(50) NOT NULL UNIQUE,
    case_id INT,
    subject_name VARCHAR(100) NOT NULL,
    subject_identifier VARCHAR(100),
    warrant_type VARCHAR(50) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    issued_by INT NOT NULL,
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE SET NULL,
    FOREIGN KEY (issued_by) REFERENCES users(id),
    INDEX idx_warrant_number (warrant_number),
    INDEX idx_active (is_active)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS fines (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fine_number VARCHAR(50) NOT NULL UNIQUE,
    case_id INT,
    subject_name VARCHAR(100) NOT NULL,
    subject_identifier VARCHAR(100),
    amount INT NOT NULL,
    reason TEXT NOT NULL,
    is_paid BOOLEAN DEFAULT FALSE,
    issued_by INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE SET NULL,
    FOREIGN KEY (issued_by) REFERENCES users(id),
    INDEX idx_fine_number (fine_number),
    INDEX idx_paid (is_paid)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS evidence (
    id INT AUTO_INCREMENT PRIMARY KEY,
    case_id INT NOT NULL,
    evidence_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_url VARCHAR(500),
    metadata_json JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
    INDEX idx_case (case_id)
) ENGINE=InnoDB;

-- ==========================================
-- EMS TABLES
-- ==========================================

CREATE TABLE IF NOT EXISTS patients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_number VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    identifier VARCHAR(100),
    date_of_birth DATETIME,
    blood_type VARCHAR(10),
    allergies TEXT,
    medical_history TEXT,
    phone_number VARCHAR(20),
    emergency_contact VARCHAR(100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_patient_number (patient_number),
    INDEX idx_identifier (identifier)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS medical_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    report_number VARCHAR(50) NOT NULL UNIQUE,
    patient_id INT NOT NULL,
    doctor_id INT NOT NULL,
    diagnosis TEXT NOT NULL,
    treatment TEXT,
    prescription TEXT,
    notes TEXT,
    template_used VARCHAR(50),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES users(id),
    INDEX idx_report_number (report_number),
    INDEX idx_patient (patient_id)
) ENGINE=InnoDB;

-- ==========================================
-- DISPATCH TABLES
-- ==========================================

CREATE TABLE IF NOT EXISTS dispatch_calls (
    id INT AUTO_INCREMENT PRIMARY KEY,
    call_number VARCHAR(50) NOT NULL UNIQUE,
    priority ENUM('P1', 'P2', 'P3') NOT NULL DEFAULT 'P3',
    status ENUM('pending', 'assigned', 'in_progress', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
    call_type VARCHAR(50) NOT NULL,
    location VARCHAR(255) NOT NULL,
    description TEXT,
    caller_name VARCHAR(100),
    caller_phone VARCHAR(20),
    assigned_units JSON,
    dispatcher_id INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (dispatcher_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_call_number (call_number),
    INDEX idx_priority (priority),
    INDEX idx_status (status)
) ENGINE=InnoDB;

-- ==========================================
-- CITY HUB - AZIENDE
-- ==========================================

CREATE TABLE IF NOT EXISTS businesses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    owner_identifier VARCHAR(100),
    owner_name VARCHAR(100),
    category VARCHAR(50),
    description TEXT,
    logo_url VARCHAR(500),
    address VARCHAR(255),
    phone VARCHAR(20),
    is_verified BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_owner (owner_identifier),
    INDEX idx_category (category)
) ENGINE=InnoDB;

-- ==========================================
-- CITY HUB - PUBBLICITÀ
-- ==========================================

CREATE TABLE IF NOT EXISTS advertisements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    business_id INT NOT NULL,
    slot_type ENUM('premium_banner', 'standard_card', 'small_slot') NOT NULL,
    title VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    image_url VARCHAR(500) NOT NULL,
    link_url VARCHAR(500),
    status ENUM('pending', 'approved', 'active', 'expired', 'rejected') DEFAULT 'pending',
    start_date DATETIME,
    end_date DATETIME,
    price_paid INT DEFAULT 0,
    views INT DEFAULT 0,
    clicks INT DEFAULT 0,
    approved_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_slot (slot_type),
    INDEX idx_dates (start_date, end_date)
) ENGINE=InnoDB;

-- ==========================================
-- CITY HUB - EVENTI
-- ==========================================

CREATE TABLE IF NOT EXISTS city_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    business_id INT,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    category ENUM('club', 'ristorante', 'concessionario', 'governo', 'beneficenza', 'sport', 'altro') DEFAULT 'altro',
    event_date DATETIME NOT NULL,
    end_date DATETIME,
    location VARCHAR(255) NOT NULL,
    coords_x FLOAT,
    coords_y FLOAT,
    coords_z FLOAT,
    image_url VARCHAR(500),
    status ENUM('pending', 'approved', 'active', 'completed', 'cancelled') DEFAULT 'pending',
    max_participants INT,
    approved_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE SET NULL,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_category (category),
    INDEX idx_date (event_date)
) ENGINE=InnoDB;

-- ==========================================
-- WEAZEL NEWS
-- ==========================================

CREATE TABLE IF NOT EXISTS news_articles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(255),
    content TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'generale',
    author_id INT NOT NULL,
    image_url VARCHAR(500),
    video_url VARCHAR(500),
    is_breaking_news BOOLEAN DEFAULT FALSE,
    is_published BOOLEAN DEFAULT FALSE,
    views INT DEFAULT 0,
    published_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users(id),
    INDEX idx_published (is_published),
    INDEX idx_breaking (is_breaking_news),
    INDEX idx_category (category)
) ENGINE=InnoDB;

-- ==========================================
-- GOVERNO & GIUSTIZIA
-- ==========================================

CREATE TABLE IF NOT EXISTS legal_cases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    case_number VARCHAR(50) NOT NULL UNIQUE,
    police_case_id INT,
    client_name VARCHAR(100) NOT NULL,
    client_identifier VARCHAR(100),
    lawyer_id INT,
    prosecutor_id INT,
    case_type VARCHAR(50) NOT NULL,
    description TEXT,
    status ENUM('draft', 'submitted', 'review', 'approved', 'rejected', 'archived') DEFAULT 'draft',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (police_case_id) REFERENCES cases(id) ON DELETE SET NULL,
    FOREIGN KEY (lawyer_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (prosecutor_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_case_number (case_number),
    INDEX idx_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS court_hearings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    hearing_number VARCHAR(50) NOT NULL UNIQUE,
    legal_case_id INT,
    case_id INT,
    judge_id INT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    scheduled_date DATETIME NOT NULL,
    courtroom VARCHAR(50),
    status ENUM('scheduled', 'in_progress', 'completed', 'postponed', 'cancelled') DEFAULT 'scheduled',
    verdict TEXT,
    verdict_date DATETIME,
    minutes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (legal_case_id) REFERENCES legal_cases(id) ON DELETE SET NULL,
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE SET NULL,
    FOREIGN KEY (judge_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_hearing_number (hearing_number),
    INDEX idx_status (status),
    INDEX idx_date (scheduled_date)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS legal_documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    legal_case_id INT NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    file_url VARCHAR(500),
    submitted_by INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (legal_case_id) REFERENCES legal_cases(id) ON DELETE CASCADE,
    FOREIGN KEY (submitted_by) REFERENCES users(id),
    INDEX idx_case (legal_case_id)
) ENGINE=InnoDB;

-- ==========================================
-- SERVICE CHAT
-- ==========================================

CREATE TABLE IF NOT EXISTS chat_channels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    channel_type VARCHAR(20) DEFAULT 'department',
    allowed_roles JSON,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_name (name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS chat_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    channel_id INT NOT NULL,
    sender_id INT NOT NULL,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text',
    action_type VARCHAR(50),
    action_data JSON,
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (channel_id) REFERENCES chat_channels(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id),
    INDEX idx_channel (channel_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB;

-- ==========================================
-- TIMELINE & SYSTEM
-- ==========================================

CREATE TABLE IF NOT EXISTS timeline_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    category VARCHAR(20) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    reference_id INT,
    reference_type VARCHAR(50),
    user_id INT,
    metadata_json JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_event_type (event_type),
    INDEX idx_category (category),
    INDEX idx_created (created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS outbox (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    payload JSON NOT NULL,
    status ENUM('pending', 'sent', 'failed') DEFAULT 'pending',
    retry_count INT DEFAULT 0,
    max_retries INT DEFAULT 3,
    last_error TEXT,
    next_retry_at DATETIME,
    processed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_next_retry (next_retry_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id INT,
    details JSON,
    ip_address VARCHAR(45),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user (user_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB;

-- ==========================================
-- SEED DATA
-- ==========================================

-- Default users (password: demo123)
INSERT INTO users (email, password_hash, name, badge_number, role, department) VALUES
('admin@purelife.rp', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.Q6TL.N.OP2w3Qu', 'Admin Sistema', 'ADMIN-001', 'admin', 'Amministrazione'),
('lspd@purelife.rp', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.Q6TL.N.OP2w3Qu', 'Agente Demo', 'LSPD-001', 'police', 'LSPD'),
('ems@purelife.rp', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.Q6TL.N.OP2w3Qu', 'Medico Demo', 'EMS-001', 'ems', 'EMS'),
('dispatch@purelife.rp', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.Q6TL.N.OP2w3Qu', 'Dispatcher Demo', 'DSP-001', 'dispatch', 'Dispatch'),
('governo@purelife.rp', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.Q6TL.N.OP2w3Qu', 'Governatore Demo', 'GOV-001', 'government', 'Governo'),
('giudice@purelife.rp', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.Q6TL.N.OP2w3Qu', 'Giudice Demo', 'JUD-001', 'judge', 'Tribunale'),
('avvocato@purelife.rp', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.Q6TL.N.OP2w3Qu', 'Avvocato Demo', 'LAW-001', 'lawyer', 'Studio Legale'),
('weazel@purelife.rp', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.Q6TL.N.OP2w3Qu', 'Giornalista Demo', 'WZL-001', 'weazel', 'Weazel News')
ON DUPLICATE KEY UPDATE name=name;

-- Default chat channels
INSERT INTO chat_channels (name, display_name, description, allowed_roles) VALUES
('dispatch', 'Dispatch', 'Canale dispatch centrale', '["police", "ems", "dispatch", "admin"]'),
('pattuglie', 'Pattuglie LSPD', 'Comunicazioni pattuglie', '["police", "dispatch", "admin"]'),
('ems-radio', 'Radio EMS', 'Comunicazioni mediche', '["ems", "dispatch", "admin"]'),
('tribunale', 'Tribunale', 'Comunicazioni legali', '["judge", "lawyer", "prosecutor", "government", "admin"]'),
('governo', 'Governo', 'Canale governativo', '["government", "judge", "admin"]'),
('annunci', 'Annunci', 'Annunci pubblici', NULL)
ON DUPLICATE KEY UPDATE display_name=display_name;
