-- MindCare Mental Health Platform Database Schema
-- MariaDB/MySQL compatible

CREATE DATABASE IF NOT EXISTS mindcare_db;
USE mindcare_db;

-- Moods table for tracking user moods
CREATE TABLE IF NOT EXISTS moods (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mood VARCHAR(50) NOT NULL,
    mood_value INT NOT NULL CHECK (mood_value BETWEEN 1 AND 5),
    logged_at DATETIME NOT NULL,
    INDEX idx_logged_at (logged_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Journal entries table for user journal entries
CREATE TABLE IF NOT EXISTS journal_entries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL DEFAULT 1,
    title VARCHAR(255) DEFAULT 'Untitled',
    content TEXT NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

