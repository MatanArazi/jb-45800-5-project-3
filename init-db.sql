-- Vacation Website Database Schema
-- This file is automatically executed when the MySQL container starts
-- All tables use "IF NOT EXISTS" so it's safe to run multiple times

-- Create users table for customers
CREATE TABLE IF NOT EXISTS users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    role ENUM('admin', 'user') NOT NULL DEFAULT 'user',
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email)
);

-- Create vacations table
CREATE TABLE IF NOT EXISTS vacations (
    vacation_id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    destination VARCHAR(150) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    max_participants INT DEFAULT 100,
    current_participants INT DEFAULT 0,
    image_url VARCHAR(500),
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL,
    INDEX idx_destination (destination),
    INDEX idx_start_date (start_date),
    INDEX idx_price (price)
);

-- Create likes table (many-to-many relationship between users and vacations)
CREATE TABLE IF NOT EXISTS likes (
    like_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    vacation_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (vacation_id) REFERENCES vacations(vacation_id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_vacation (user_id, vacation_id),
    INDEX idx_user_id (user_id),
    INDEX idx_vacation_id (vacation_id)
);

-- Create bookings table (for tracking user-vacation bookings)
CREATE TABLE IF NOT EXISTS bookings (
    booking_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    vacation_id INT NOT NULL,
    booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('pending', 'confirmed', 'cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (vacation_id) REFERENCES vacations(vacation_id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_vacation_id (vacation_id),
    INDEX idx_status (status)
);

-- Create reviews table for user feedback on vacations
CREATE TABLE IF NOT EXISTS reviews (
    review_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    vacation_id INT NOT NULL,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (vacation_id) REFERENCES vacations(vacation_id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_vacation_review (user_id, vacation_id),
    INDEX idx_vacation_id (vacation_id),
    INDEX idx_rating (rating)
);

-- Optional: Create indexes for better query performance
CREATE INDEX idx_vacations_dates ON vacations(start_date, end_date);
CREATE INDEX idx_bookings_dates ON bookings(created_at);

-- Seed one admin user (required by project guidelines)
INSERT INTO users (role, first_name, last_name, email, password_hash)
SELECT 'admin', 'Project', 'Admin', 'admin@vacations.local', 'Admin1234'
WHERE NOT EXISTS (
        SELECT 1 FROM users WHERE email = 'admin@vacations.local'
);

-- Seed at least 12 vacations with image URLs in initialization SQL
INSERT INTO vacations (title, description, destination, start_date, end_date, price, image_url, created_by)
SELECT
    'Eilat Coral Escape',
    'A sunny Red Sea package with snorkeling and beach hotels.',
    'Eilat',
    '2026-08-15',
    '2026-08-21',
    799.00,
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200',
    (SELECT user_id FROM users WHERE email = 'admin@vacations.local' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM vacations WHERE title = 'Eilat Coral Escape');

INSERT INTO vacations (title, description, destination, start_date, end_date, price, image_url, created_by)
SELECT
    'Jerusalem Heritage Weekend',
    'Historic tours, food market visits, and old city walking routes.',
    'Jerusalem',
    '2026-09-05',
    '2026-09-08',
    549.00,
    'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=1200',
    (SELECT user_id FROM users WHERE email = 'admin@vacations.local' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM vacations WHERE title = 'Jerusalem Heritage Weekend');

INSERT INTO vacations (title, description, destination, start_date, end_date, price, image_url, created_by)
SELECT
    'Tel Aviv City Break',
    'Urban beach vacation with nightlife and culinary experiences.',
    'Tel Aviv',
    '2026-09-18',
    '2026-09-22',
    699.00,
    'https://images.unsplash.com/photo-1473116763249-2faaef81ccda?w=1200',
    (SELECT user_id FROM users WHERE email = 'admin@vacations.local' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM vacations WHERE title = 'Tel Aviv City Break');

INSERT INTO vacations (title, description, destination, start_date, end_date, price, image_url, created_by)
SELECT
    'Dead Sea Wellness Retreat',
    'Spa treatments and floating sessions at premium resorts.',
    'Dead Sea',
    '2026-10-01',
    '2026-10-05',
    920.00,
    'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200',
    (SELECT user_id FROM users WHERE email = 'admin@vacations.local' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM vacations WHERE title = 'Dead Sea Wellness Retreat');

INSERT INTO vacations (title, description, destination, start_date, end_date, price, image_url, created_by)
SELECT
    'Galilee Green Hills',
    'Nature lodges, hiking trails, and local winery tours.',
    'Galilee',
    '2026-10-12',
    '2026-10-16',
    640.00,
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200',
    (SELECT user_id FROM users WHERE email = 'admin@vacations.local' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM vacations WHERE title = 'Galilee Green Hills');

INSERT INTO vacations (title, description, destination, start_date, end_date, price, image_url, created_by)
SELECT
    'Haifa Coastline Discovery',
    'Scenic coast viewpoints and family-friendly attractions.',
    'Haifa',
    '2026-10-20',
    '2026-10-24',
    610.00,
    'https://images.unsplash.com/photo-1493558103817-58b2924bce98?w=1200',
    (SELECT user_id FROM users WHERE email = 'admin@vacations.local' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM vacations WHERE title = 'Haifa Coastline Discovery');

INSERT INTO vacations (title, description, destination, start_date, end_date, price, image_url, created_by)
SELECT
    'Mitzpe Ramon Desert Stars',
    'Night-sky desert glamping and jeep excursions.',
    'Mitzpe Ramon',
    '2026-11-03',
    '2026-11-07',
    770.00,
    'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200',
    (SELECT user_id FROM users WHERE email = 'admin@vacations.local' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM vacations WHERE title = 'Mitzpe Ramon Desert Stars');

INSERT INTO vacations (title, description, destination, start_date, end_date, price, image_url, created_by)
SELECT
    'Nazareth Cultural Journey',
    'Guided heritage routes and authentic local cuisine.',
    'Nazareth',
    '2026-11-14',
    '2026-11-18',
    560.00,
    'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=1200',
    (SELECT user_id FROM users WHERE email = 'admin@vacations.local' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM vacations WHERE title = 'Nazareth Cultural Journey');

INSERT INTO vacations (title, description, destination, start_date, end_date, price, image_url, created_by)
SELECT
    'Acre Old Port Experience',
    'Boutique stay near the old port with historic tunnels tour.',
    'Acre',
    '2026-11-25',
    '2026-11-29',
    590.00,
    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
    (SELECT user_id FROM users WHERE email = 'admin@vacations.local' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM vacations WHERE title = 'Acre Old Port Experience');

INSERT INTO vacations (title, description, destination, start_date, end_date, price, image_url, created_by)
SELECT
    'Tiberias Lakeside Stay',
    'Relaxed lakeside holiday with boat tours and hot springs.',
    'Tiberias',
    '2026-12-03',
    '2026-12-07',
    625.00,
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200',
    (SELECT user_id FROM users WHERE email = 'admin@vacations.local' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM vacations WHERE title = 'Tiberias Lakeside Stay');

INSERT INTO vacations (title, description, destination, start_date, end_date, price, image_url, created_by)
SELECT
    'Golan Heights Adventure',
    'Waterfalls, off-road trails, and scenic mountain stays.',
    'Golan Heights',
    '2026-12-12',
    '2026-12-16',
    810.00,
    'https://images.unsplash.com/photo-1418065460487-3e41a6c84dc5?w=1200',
    (SELECT user_id FROM users WHERE email = 'admin@vacations.local' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM vacations WHERE title = 'Golan Heights Adventure');

INSERT INTO vacations (title, description, destination, start_date, end_date, price, image_url, created_by)
SELECT
    'Netanya Seaside Holiday',
    'Beachfront relaxation and promenade dining experience.',
    'Netanya',
    '2026-12-22',
    '2026-12-27',
    680.00,
    'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=1200',
    (SELECT user_id FROM users WHERE email = 'admin@vacations.local' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM vacations WHERE title = 'Netanya Seaside Holiday');
