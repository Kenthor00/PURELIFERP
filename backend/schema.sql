-- PURE LIFE OS - Schema MySQL
-- Database: purelife_os

CREATE DATABASE IF NOT EXISTS purelife_os CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE purelife_os;

-- Utenti sistema
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    badge_number VARCHAR(50) UNIQUE,
    role ENUM('police', 'ems', 'dispatch', 'admin') NOT NULL DEFAULT 'police',
    department VARCHAR(50),
    phone_number VARCHAR(20),
    fivem_identifier VARCHAR(100) UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    sound_enabled BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_fivem (fivem_identifier)
) ENGINE=InnoDB;

-- Casi polizia
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

-- Mandati
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

-- Multe
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

-- Prove
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

-- Pazienti EMS
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

-- Referti medici
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

-- Chiamate dispatch
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

-- Timeline eventi
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

-- Outbox pattern (Prism Billing)
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

-- Audit log
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

-- Seed dati esempio
INSERT INTO users (email, password_hash, name, badge_number, role, department) VALUES
('admin@purelife.rp', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.Q6TL.N.OP2w3Qu', 'Admin Sistema', 'ADMIN-001', 'admin', 'Amministrazione'),
('lspd@purelife.rp', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.Q6TL.N.OP2w3Qu', 'Agente Demo', 'LSPD-001', 'police', 'LSPD'),
('ems@purelife.rp', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.Q6TL.N.OP2w3Qu', 'Medico Demo', 'EMS-001', 'ems', 'EMS'),
('dispatch@purelife.rp', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.Q6TL.N.OP2w3Qu', 'Dispatcher Demo', 'DSP-001', 'dispatch', 'Dispatch');
-- Password per tutti: demo123
