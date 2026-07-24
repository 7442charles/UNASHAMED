-- ============================================================
-- UNASHAMED - COMPLETE DATABASE SCHEMA
-- Run this once to set up everything:
--   mysql -u root unashamed_db < config/full_schema.sql
-- ============================================================

-- Drop existing tables (in reverse dependency order)
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS cart_items;
DROP TABLE IF EXISTS carts;
DROP TABLE IF EXISTS offer_products;
DROP TABLE IF EXISTS offers;
DROP TABLE IF EXISTS product_collections;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS collections;
DROP TABLE IF EXISTS password_resets;
DROP TABLE IF EXISTS admins;
DROP TABLE IF EXISTS users;

-- ============================================================
-- 1. USERS (Customer accounts for auth)
-- ============================================================
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 2. PASSWORD RESETS (Forgot password tokens)
-- ============================================================
CREATE TABLE password_resets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    token VARCHAR(255) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_token (token),
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 3. ADMINS (Admin panel users)
-- ============================================================
CREATE TABLE admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('super_admin', 'admin', 'manager') NOT NULL DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 4. COLLECTIONS
-- ============================================================
CREATE TABLE collections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    image VARCHAR(500),
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 5. PRODUCTS
-- ============================================================
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    compare_price DECIMAL(10, 2) DEFAULT NULL,
    image VARCHAR(500),
    stock INT DEFAULT 0,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 6. PRODUCT_COLLECTIONS (Many-to-Many)
-- ============================================================
CREATE TABLE product_collections (
    product_id INT NOT NULL,
    collection_id INT NOT NULL,
    PRIMARY KEY (product_id, collection_id),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 7. OFFERS
-- ============================================================
CREATE TABLE offers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type ENUM('percentage', 'fixed') NOT NULL DEFAULT 'percentage',
    value DECIMAL(10, 2) NOT NULL,
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 8. OFFER_PRODUCTS (Many-to-Many)
-- ============================================================
CREATE TABLE offer_products (
    offer_id INT NOT NULL,
    product_id INT NOT NULL,
    PRIMARY KEY (offer_id, product_id),
    FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 9. CARTS (Abandoned cart tracking)
-- ============================================================
CREATE TABLE carts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    user_id INT DEFAULT NULL,
    status ENUM('active', 'abandoned', 'converted') NOT NULL DEFAULT 'active',
    customer_name VARCHAR(255) DEFAULT NULL,
    customer_phone VARCHAR(50) DEFAULT NULL,
    customer_address TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_session (session_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 10. CART_ITEMS
-- ============================================================
CREATE TABLE cart_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cart_id INT NOT NULL,
    product_id INT DEFAULT NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 11. ORDERS
-- ============================================================
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    customer_address TEXT NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    status ENUM('pending', 'confirmed', 'shipped', 'delivered', 'cancelled') NOT NULL DEFAULT 'pending',
    cart_id INT DEFAULT NULL,
    notes TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 12. ORDER_ITEMS
-- ============================================================
CREATE TABLE order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT DEFAULT NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- SEED DATA
-- ============================================================

-- Default Admin (password: admin123)
-- bcrypt hash for 'admin123'
INSERT INTO admins (name, email, password_hash, role) VALUES
('Super Admin', 'admin@unashamed.co.ke', '$2b$10$mVUaMeYXuWOlroMyLAE34.4ziX8/P0xP9RdXCOlYdHQLXu7/sGEqO', 'super_admin');

-- Collections
INSERT INTO collections (name, slug, description, image) VALUES
('Core Essentials', 'core-essentials', 'The unapologetic foundation of your wardrobe.', 'https://images.unsplash.com/photo-1516826957135-7331826922bd?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'),
('Urban Tactical', 'urban-tactical', 'Built for the streets. Heavyweight fabrics and utility.', 'https://images.unsplash.com/photo-1523398002811-999aa8e9f5b9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80');

-- Products
INSERT INTO products (name, slug, description, price, image, stock) VALUES
('Unashamed Classic Tee', 'unashamed-classic-tee', 'The iconic classic tee. 100% cotton, relaxed fit.', 1500.00, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 50),
('Premium Heavyweight Hoodie', 'premium-heavyweight-hoodie', 'Heavyweight fleece hoodie for ultimate warmth.', 3500.00, 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 30),
('Logo Beanie', 'logo-beanie', 'Ribbed knit beanie with embroidered logo.', 800.00, 'https://images.unsplash.com/photo-1576871337622-98d48d1cf531?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 100),
('Signature Cargo Pants', 'signature-cargo-pants', 'Cargo pants with utility pockets and tapered fit.', 2800.00, 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 40),
('Oversized Graphic Tee', 'oversized-graphic-tee', 'Bold graphic print on oversized fit.', 1800.00, 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 60),
('Utility Vest', 'utility-vest', 'Multi-pocket utility vest for layering.', 4500.00, 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 20);

-- Link products to collections
INSERT INTO product_collections (product_id, collection_id) VALUES
(1, 1), (2, 1), (3, 1),
(4, 2), (5, 2), (6, 2);

-- Sample offer: 20% off everything for 30 days
INSERT INTO offers (name, type, value, start_date, end_date) VALUES
('Summer Sale - 20% Off', 'percentage', 20.00, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY));

-- Link offer to all products
INSERT INTO offer_products (offer_id, product_id) VALUES
(1, 1), (1, 2), (1, 3), (1, 4), (1, 5), (1, 6);

-- Sample order
INSERT INTO orders (customer_name, customer_phone, customer_address, total, status) VALUES
('Jane Doe', '254712345678', '123 Kenyatta Avenue, Nairobi', 5000.00, 'pending');

INSERT INTO order_items (order_id, product_id, product_name, quantity, price) VALUES
(1, 1, 'Unashamed Classic Tee', 2, 1500.00),
(1, 2, 'Premium Heavyweight Hoodie', 1, 2000.00);

-- Sample abandoned cart
INSERT INTO carts (session_id, status, customer_name, customer_phone, customer_address) VALUES
('sample-session-001', 'abandoned', 'John Smith', '254723456789', '456 Moi Avenue, Mombasa');

INSERT INTO cart_items (cart_id, product_id, product_name, quantity, price) VALUES
(1, 1, 'Unashamed Classic Tee', 1, 1500.00),
(1, 5, 'Oversized Graphic Tee', 2, 1800.00);

SELECT '✅ All 12 tables created and seeded successfully!' as STATUS;

