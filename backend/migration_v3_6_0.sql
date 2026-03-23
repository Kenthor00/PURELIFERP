-- ============================================
-- PURE LIFE OS v3.6.0 - Migration Script
-- Nuove tabelle per sistema ticket e notifiche lb-phone
-- Eseguire DOPO migration_v3_5_2.sql
-- ============================================

-- Sistema Ticket
CREATE TABLE IF NOT EXISTS tickets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_number VARCHAR(20) UNIQUE NOT NULL,
    subject VARCHAR(500) NOT NULL,
    category VARCHAR(50) DEFAULT 'generale',
    priority VARCHAR(20) DEFAULT 'normal',
    status VARCHAR(20) DEFAULT 'open',
    created_by INT NOT NULL,
    assigned_to INT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    closed_at DATETIME NULL,
    closed_by INT NULL
);

CREATE TABLE IF NOT EXISTS ticket_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT NOT NULL,
    sender_id INT NOT NULL,
    sender_name VARCHAR(100),
    sender_sector VARCHAR(50),
    message TEXT NOT NULL,
    is_staff_reply BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
);

-- Coda notifiche lb-phone
CREATE TABLE IF NOT EXISTS lbphone_notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    target_identifier VARCHAR(100) NOT NULL,
    target_user_id INT NULL,
    app VARCHAR(50) DEFAULT 'purelifeos',
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    icon VARCHAR(200) DEFAULT 'fa-solid fa-building-columns',
    color VARCHAR(20) DEFAULT '#00ff9c',
    sound BOOLEAN DEFAULT TRUE,
    sent BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    sent_at DATETIME NULL,
    INDEX idx_pending (sent, created_at)
);

-- Colonna fivem_identifier nella tabella users (se non esiste)
-- Necessaria per il mapping notifiche lb-phone -> player in-game
ALTER TABLE users ADD COLUMN fivem_identifier VARCHAR(100) NULL;
-- Se errore: la colonna gia' esiste, ignorare.
