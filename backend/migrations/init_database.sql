-- ============================================
-- MIGRATION: Database Schema untuk Herbal Chain AI
-- Database: ta
-- ============================================

CREATE DATABASE IF NOT EXISTS ta;
USE ta;

-- ============================================
-- 1. Tabel Riwayat Rekomendasi AI
-- Menyimpan hasil rekomendasi herbal dari AI
-- ============================================
CREATE TABLE IF NOT EXISTS riwayat_rekomendasi (
    id INT AUTO_INCREMENT PRIMARY KEY,
    address VARCHAR(255) NOT NULL,
    keluhan TEXT NOT NULL,
    hasil_ai LONGTEXT NOT NULL,
    MODE VARCHAR(50),
    tanggal TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================
-- 2. Tabel Notifikasi
-- Menyimpan pesan notifikasi antar pengguna
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    address VARCHAR(255) NOT NULL,
    pesan TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    tanggal TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================
-- 3. Tabel Autentikasi Pengguna
-- Menyimpan kredensial login (Wallet + Password)
-- ============================================
CREATE TABLE IF NOT EXISTS user_auth (
    wallet_address VARCHAR(42) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    document_cid VARCHAR(100) DEFAULT NULL,
    verification_status ENUM('pending', 'verified', 'rejected', 'deactivated') DEFAULT 'pending',
    rejection_reason TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================
-- MIGRATION: Jika tabel sudah ada, jalankan query ini secara manual
-- di MySQL/SQLyog untuk menambahkan nilai 'deactivated' ke ENUM
-- ============================================
-- ALTER TABLE user_auth
-- MODIFY COLUMN verification_status
-- ENUM('pending', 'verified', 'rejected', 'deactivated') DEFAULT 'pending';
