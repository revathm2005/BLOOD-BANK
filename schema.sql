-- ========================================================
-- Full Stack Development (FSD) Project 14:
-- BLOOD BANK MANAGEMENT SYSTEM
-- Database Schema for MySQL / MariaDB / SQLite
-- ========================================================

CREATE DATABASE IF NOT EXISTS blood_bank_db;
USE blood_bank_db;

-- 1. Donors Table
DROP TABLE IF EXISTS donors;
CREATE TABLE donors (
    donor_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    age INT NOT NULL,
    gender VARCHAR(10) NOT NULL,
    blood_group VARCHAR(5) NOT NULL,
    phone VARCHAR(15) NOT NULL
);

-- 2. Blood Stock Table
DROP TABLE IF EXISTS blood_stock;
CREATE TABLE blood_stock (
    stock_id INT AUTO_INCREMENT PRIMARY KEY,
    blood_group VARCHAR(5) NOT NULL UNIQUE,
    units_available INT NOT NULL DEFAULT 0,
    last_updated DATE NOT NULL
);

-- 3. Blood Requests Table
DROP TABLE IF EXISTS blood_requests;
CREATE TABLE blood_requests (
    request_id INT AUTO_INCREMENT PRIMARY KEY,
    hospital_name VARCHAR(150) NOT NULL,
    blood_group VARCHAR(5) NOT NULL,
    units_required INT NOT NULL,
    request_date DATE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'Pending'
);

-- ========================================================
-- INITIAL SEED DATA
-- ========================================================

-- Initial Stock for all standard 8 blood types
INSERT INTO blood_stock (blood_group, units_available, last_updated) VALUES
('A+', 15, CURDATE()),
('A-', 6, CURDATE()),
('B+', 20, CURDATE()),
('B-', 4, CURDATE()),
('AB+', 8, CURDATE()),
('AB-', 2, CURDATE()),
('O+', 25, CURDATE()),
('O-', 5, CURDATE());

-- Sample Donors
INSERT INTO donors (name, age, gender, blood_group, phone) VALUES
('Aarav Sharma', 28, 'Male', 'O+', '9876543210'),
('Priya Patel', 24, 'Female', 'A+', '9812345678'),
('Rahul Verma', 32, 'Male', 'B+', '9823456789'),
('Ananya Iyer', 29, 'Female', 'AB+', '9834567890'),
('Rohan Kulkarni', 35, 'Male', 'O-', '9845678901'),
('Sneha Reddy', 27, 'Female', 'B-', '9856789012'),
('Vikram Singh', 41, 'Male', 'A-', '9867890123'),
('Kavita Rao', 30, 'Female', 'AB-', '9878901234');

-- Sample Hospital Blood Requests
INSERT INTO blood_requests (hospital_name, blood_group, units_required, request_date, status) VALUES
('City Apollo Hospital', 'O+', 3, CURDATE(), 'Pending'),
('St. John Medical Center', 'A+', 2, CURDATE(), 'Approved'),
('LifeCare Super Specialty Hospital', 'B-', 1, CURDATE(), 'Fulfilled'),
('Global Health Institute', 'AB+', 2, CURDATE(), 'Pending'),
('Sunrise Emergency Care', 'O-', 4, CURDATE(), 'Pending');
