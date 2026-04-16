-- ============================================
-- EduTrack - Database Setup Script
-- Jalankan file ini di phpMyAdmin
-- ============================================

-- Buat database (jika belum ada)
CREATE DATABASE IF NOT EXISTS edutrack_db 
    CHARACTER SET utf8mb4 
    COLLATE utf8mb4_unicode_ci;

USE edutrack_db;

-- ============================================
-- TABEL TEACHERS (Guru)
-- ============================================
CREATE TABLE IF NOT EXISTS teachers (
    id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABEL STUDENTS (Siswa)
-- ============================================
CREATE TABLE IF NOT EXISTS students (
    id VARCHAR(20) PRIMARY KEY,
    nis VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(100) NULL,
    name VARCHAR(100) NOT NULL,
    kelas VARCHAR(20) NOT NULL DEFAULT '',
    gender ENUM('L','P') DEFAULT 'L',
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABEL ASSIGNMENTS (Tugas/Evaluasi)
-- ============================================
CREATE TABLE IF NOT EXISTS assignments (
    id VARCHAR(20) PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    type ENUM('UH','PTS','PAS','PRAKTIK') NOT NULL DEFAULT 'UH',
    kkm INT NOT NULL DEFAULT 75,
    deadline DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABEL GRADES (Nilai Siswa per Tugas)
-- ============================================
CREATE TABLE IF NOT EXISTS grades (
    id INT AUTO_INCREMENT PRIMARY KEY,
    assignment_id VARCHAR(20) NOT NULL,
    student_id VARCHAR(20) NOT NULL,
    score INT DEFAULT 0,
    feedback TEXT NULL,
    file VARCHAR(255) NULL,
    status ENUM('pending','done') DEFAULT 'pending',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_grade (assignment_id, student_id),
    FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABEL PUBLISHED REPORTS (Rapor Terbit)
-- ============================================
CREATE TABLE IF NOT EXISTS published_reports (
    student_id VARCHAR(20) PRIMARY KEY,
    published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- DATA DEFAULT: Akun Admin
-- (password: admin123)
-- ============================================
INSERT IGNORE INTO teachers (id, name, email, password) 
VALUES ('admin', 'Admin Sekolah', 'admin@sekolah.com', 'admin123');

-- ============================================
-- Selesai! Database EduTrack siap digunakan.
-- ============================================
