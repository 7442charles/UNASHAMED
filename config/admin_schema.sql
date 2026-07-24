-- =============================================
-- UNASHAMED ADMIN PANEL - DATABASE SCHEMA
-- =============================================
-- Run this in your terminal:
-- mysql -u root unashamed_db < config/admin_schema.sql
-- OR copy and paste each section manually

-- =============================================
-- 1. ADMINS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('super_admin', 'admin', 'manager') NOT NULL DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default admin (password: admin123)
-- IMPORTANT: Change this password after first login!
INSERT INTO admins (name, email, password_hash, role) VALUES
('Super Admin', 'admin@unashamed.co.ke', '$2b$10$mVUaMeYXuWOlroMyLAE34.4ziX8/P0xP9RdXCOlYdHQLXu7/sGEqO', 'super_admin');

-- =============================================
-- 2. COLLECTIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS collections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    image VARCHAR(500),
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 3. PRODUCTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS products (
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

-- =============================================
-- 4. PRODUCT_COLLECTIONS (Many-to-Many)
-- =============================================
CREATE TABLE IF NOT EXISTS product_collections (
    product_id INT NOT NULL,
    collection_id INT NOT NULL,
    PRIMARY KEY (product_id, collection_id),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 5. OFFERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS offers (
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

-- =============================================
-- 6. OFFER_PRODUCTS (Many-to-Many)
-- =============================================
CREATE TABLE IF NOT EXISTS offer_products (
    offer_id INT NOT NULL,
    product_id INT NOT NULL,
    PRIMARY KEY (offer_id, product_id),
    FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 7. CARTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS carts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    user_id INT DEFAULT NULL,
    status ENUM('active', 'abandoned', 'converted') NOT NULL DEFAULT 'active',
    customer_name VARCHAR(255) DEFAULT NULL,
    customer_phone VARCHAR(50) DEFAULT NULL,
    customer_address TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 8. CART_ITEMS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS cart_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cart_id INT NOT NULL,
    product_id INT NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 9. ORDERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS orders (
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
    FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 10. ORDER_ITEMS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS order_items (
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

-- =============================================
-- INSERT SAMPLE DATA
-- =============================================

-- Collections
INSERT INTO collections (name, slug, description, image) VALUES
('Core Essentials', 'core-essentials', 'The unapologetic foundation of your wardrobe.', 'https://images.unsplash.com/photo-1516826957135-7331826922bd?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'),
('Urban Tactical', 'urban-tactical', 'Built for the streets. Heavyweight fabrics and utility.', 'https://images.unsplash.com/photo-1523398002811-999aa8e9f5b9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80');

-- Products
INSERT INTO products (name, slug, description, price, image, stock) VALUES
('Unashamed Classic Tee', 'unashamed-classic-tee', 'The iconic classic tee. 100% cotton, relaxed fit.', 1500, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 50),
('Premium Heavyweight Hoodie', 'premium-heavyweight-hoodie', 'Heavyweight fleece hoodie for ultimate warmth.', 3500, 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 30),
('Logo Beanie', 'logo-beanie', 'Ribbed knit beanie with embroidered logo.', 800, 'https://images.unsplash.com/photo-1576871337622-98d48d1cf531?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 100),
('Signature Cargo Pants', 'signature-cargo-pants', 'Cargo pants with utility pockets and tapered fit.', 2800, 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 40),
('Oversized Graphic Tee', 'oversized-graphic-tee', 'Bold graphic print on oversized fit.', 1800, 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 60),
('Utility Vest', 'utility-vest', 'Multi-pocket utility vest for layering.', 4500, 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 20);

-- Link products to collections
INSERT INTO product_collections (product_id, collection_id) VALUES
(1, 1), (2, 1), (3, 1),
(4, 2), (5, 2), (6, 2);

-- Sample offer
INSERT INTO offers (name, type, value, start_date, end_date) VALUES
('Summer Sale - 20% Off', 'percentage', 20, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY));

-- Link offer to all products
INSERT INTO offer_products (offer_id, product_id) VALUES
(1, 1), (1, 2), (1, 3), (1, 4), (1, 5), (1, 6);

-- Sample order
INSERT INTO orders (customer_name, customer_phone, customer_address, total, status) VALUES
('Jane Doe', '254712345678', '123 Kenyatta Avenue, Nairobi', 5000, 'pending');

INSERT INTO order_items (order_id, product_id, product_name, quantity, price) VALUES
(1, 1, 'Unashamed Classic Tee', 2, 1500),
(1, 2, 'Premium Heavyweight Hoodie', 1, 2000);

-- Sample cart (abandoned)
INSERT INTO carts (session_id, status, customer_name, customer_phone, customer_address) VALUES
('sample-session-001', 'abandoned', 'John Smith', '254723456789', '456 Moi Avenue, Mombasa');

INSERT INTO cart_items (cart_id, product_id, product_name, quantity, price) VALUES
(1, 1, 'Unashamed Classic Tee', 1, 1500),
(1, 5, 'Oversized Graphic Tee', 2, 1800);

PRINT '✅ All admin tables created successfully!';

