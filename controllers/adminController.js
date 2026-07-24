const bcrypt = require('bcrypt');
const pool = require('../config/db');

// ============================================================
// AUTH
// ============================================================

exports.getLogin = (req, res) => {
    if (req.session.adminId) {
        return res.redirect('/admin/dashboard');
    }
    res.render('admin/login', { title: 'Admin Login', error: null });
};

exports.postLogin = async (req, res) => {
    const { email, password } = req.body;
    
    try {
        const [rows] = await pool.execute('SELECT * FROM admins WHERE email = ?', [email]);
        
        if (rows.length === 0) {
            console.log(`⛔ ADMIN LOGIN FAILED: No account found for ${email}`);
            return res.render('admin/login', { title: 'Admin Login', error: 'Invalid email or password.' });
        }
        
        const admin = rows[0];
        const match = await bcrypt.compare(password, admin.password_hash);
        
        if (!match) {
            console.log(`⛔ ADMIN LOGIN FAILED: Wrong password for ${email}`);
            return res.render('admin/login', { title: 'Admin Login', error: 'Invalid email or password.' });
        }
        
        // Set admin session
        req.session.adminId = admin.id;
        req.session.adminName = admin.name;
        req.session.adminEmail = admin.email;
        req.session.adminRole = admin.role;
        
        console.log(`✅ ADMIN LOGIN SUCCESS: ${admin.name} (${admin.role}) logged in`);
        res.redirect('/admin/dashboard');
    } catch (error) {
        console.error('Admin Login Error:', error);
        res.render('admin/login', { title: 'Admin Login', error: 'An error occurred. Please try again.' });
    }
};

exports.logout = (req, res) => {
    const name = req.session.adminName || 'Unknown';
    req.session.destroy((err) => {
        if (err) console.error('Logout error:', err);
        console.log(`👋 ADMIN LOGOUT: ${name} logged out`);
        res.redirect('/admin/login');
    });
};

// ============================================================
// DASHBOARD
// ============================================================

exports.getDashboard = async (req, res) => {
    try {
        // Get stats
        const [productCount] = await pool.execute('SELECT COUNT(*) as count FROM products WHERE is_active = 1');
        const [collectionCount] = await pool.execute('SELECT COUNT(*) as count FROM collections WHERE is_active = 1');
        const [orderCount] = await pool.execute('SELECT COUNT(*) as count FROM orders');
        const [pendingOrders] = await pool.execute('SELECT COUNT(*) as count FROM orders WHERE status = "pending"');
        const [totalRevenue] = await pool.execute('SELECT COALESCE(SUM(total), 0) as total FROM orders WHERE status != "cancelled"');
        const [abandonedCarts] = await pool.execute('SELECT COUNT(*) as count FROM carts WHERE status = "abandoned"');
        const [recentOrders] = await pool.execute('SELECT * FROM orders ORDER BY created_at DESC LIMIT 5');
        
        // Get dashboard stats
        const [todayOrders] = await pool.execute(
            'SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as revenue FROM orders WHERE DATE(created_at) = CURDATE()'
        );
        
        // Weekly orders chart data
        const [weeklyOrders] = await pool.execute(`
            SELECT DATE(created_at) as date, COUNT(*) as count, COALESCE(SUM(total), 0) as revenue 
            FROM orders 
            WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            GROUP BY DATE(created_at)
            ORDER BY date
        `);
        
        res.render('admin/dashboard', {
            title: 'Dashboard | Admin',
            stats: {
                totalProducts: productCount[0].count,
                totalCollections: collectionCount[0].count,
                totalOrders: orderCount[0].count,
                pendingOrders: pendingOrders[0].count,
                totalRevenue: totalRevenue[0].total,
                abandonedCarts: abandonedCarts[0].count,
                todayOrders: todayOrders[0].count,
                todayRevenue: todayOrders[0].revenue
            },
            recentOrders,
            weeklyOrders
        });
    } catch (error) {
        console.error('Dashboard Error:', error);
        res.status(500).send('Error loading dashboard.');
    }
};

// ============================================================
// PRODUCTS CRUD
// ============================================================

exports.getProducts = async (req, res) => {
    try {
        const [products] = await pool.execute(`
            SELECT p.*, GROUP_CONCAT(c.name SEPARATOR ', ') as collection_names
            FROM products p
            LEFT JOIN product_collections pc ON p.id = pc.product_id
            LEFT JOIN collections c ON pc.collection_id = c.id
            GROUP BY p.id
            ORDER BY p.created_at DESC
        `);
        
        res.render('admin/products', { title: 'Products | Admin', products });
    } catch (error) {
        console.error('Get Products Error:', error);
        res.status(500).send('Error loading products.');
    }
};

exports.getProductForm = async (req, res) => {
    try {
        const [collections] = await pool.execute('SELECT * FROM collections WHERE is_active = 1');
        let product = null;
        let selectedCollections = [];
        
        if (req.params.id) {
            const [products] = await pool.execute('SELECT * FROM products WHERE id = ?', [req.params.id]);
            if (products.length > 0) {
                product = products[0];
                const [pc] = await pool.execute('SELECT collection_id FROM product_collections WHERE product_id = ?', [req.params.id]);
                selectedCollections = pc.map(p => p.collection_id);
            }
        }
        
        res.render('admin/product-form', {
            title: product ? 'Edit Product | Admin' : 'Add Product | Admin',
            product,
            collections,
            selectedCollections,
            error: null
        });
    } catch (error) {
        console.error('Product Form Error:', error);
        res.status(500).send('Error loading form.');
    }
};

exports.postProduct = async (req, res) => {
    const { name, slug, description, price, compare_price, image, stock, is_active, collection_ids } = req.body;
    
    try {
        // Validate slug uniqueness
        const [existing] = await pool.execute('SELECT id FROM products WHERE slug = ? AND id != ?', [slug, req.params.id || 0]);
        if (existing.length > 0) {
            const [collections] = await pool.execute('SELECT * FROM collections WHERE is_active = 1');
            let product = null;
            let selectedCollections = collection_ids ? (Array.isArray(collection_ids) ? collection_ids.map(Number) : [Number(collection_ids)]) : [];
            
            if (req.params.id) {
                const [products] = await pool.execute('SELECT * FROM products WHERE id = ?', [req.params.id]);
                product = products[0];
            }
            
            return res.render('admin/product-form', {
                title: 'Add Product | Admin',
                product,
                collections,
                selectedCollections,
                error: 'A product with this slug already exists.'
            });
        }
        
        if (req.params.id) {
            // Update existing product
            await pool.execute(
                'UPDATE products SET name = ?, slug = ?, description = ?, price = ?, compare_price = ?, image = ?, stock = ?, is_active = ? WHERE id = ?',
                [name, slug, description || null, price, compare_price || null, image || null, stock || 0, is_active || 0, req.params.id]
            );
            
            // Update collections
            await pool.execute('DELETE FROM product_collections WHERE product_id = ?', [req.params.id]);
            if (collection_ids) {
                const ids = Array.isArray(collection_ids) ? collection_ids : [collection_ids];
                for (const cid of ids) {
                    await pool.execute('INSERT INTO product_collections (product_id, collection_id) VALUES (?, ?)', [req.params.id, cid]);
                }
            }
            
            console.log(`📦 PRODUCT UPDATED: ID ${req.params.id} - "${name}" (KES ${price})`);
            res.redirect('/admin/products');
        } else {
            // Create new product
            const [result] = await pool.execute(
                'INSERT INTO products (name, slug, description, price, compare_price, image, stock, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [name, slug, description || null, price, compare_price || null, image || null, stock || 0, is_active || 0]
            );
            
            const productId = result.insertId;
            
            // Link collections
            if (collection_ids) {
                const ids = Array.isArray(collection_ids) ? collection_ids : [collection_ids];
                for (const cid of ids) {
                    await pool.execute('INSERT INTO product_collections (product_id, collection_id) VALUES (?, ?)', [productId, cid]);
                }
            }
            
            console.log(`📦 PRODUCT CREATED: ID ${productId} - "${name}" (KES ${price})`);
            res.redirect('/admin/products');
        }
    } catch (error) {
        console.error('Save Product Error:', error);
        const [collections] = await pool.execute('SELECT * FROM collections WHERE is_active = 1');
        let product = null;
        let selectedCollections = collection_ids ? (Array.isArray(collection_ids) ? collection_ids.map(Number) : [Number(collection_ids)]) : [];
        
        if (req.params.id) {
            const [products] = await pool.execute('SELECT * FROM products WHERE id = ?', [req.params.id]);
            product = products[0];
        }
        
        res.render('admin/product-form', {
            title: 'Add Product | Admin',
            product,
            collections,
            selectedCollections,
            error: 'Error saving product. ' + error.message
        });
    }
};

exports.deleteProduct = async (req, res) => {
    try {
        const [product] = await pool.execute('SELECT name FROM products WHERE id = ?', [req.params.id]);
        await pool.execute('DELETE FROM products WHERE id = ?', [req.params.id]);
        console.log(`🗑️ PRODUCT DELETED: ID ${req.params.id} - "${product[0]?.name || 'Unknown'}"`);
        res.redirect('/admin/products');
    } catch (error) {
        console.error('Delete Product Error:', error);
        res.status(500).send('Error deleting product.');
    }
};

// ============================================================
// COLLECTIONS CRUD
// ============================================================

exports.getCollections = async (req, res) => {
    try {
        const [collections] = await pool.execute(`
            SELECT c.*, COUNT(pc.product_id) as product_count
            FROM collections c
            LEFT JOIN product_collections pc ON c.id = pc.collection_id
            GROUP BY c.id
            ORDER BY c.created_at DESC
        `);
        
        res.render('admin/collections', { title: 'Collections | Admin', collections });
    } catch (error) {
        console.error('Get Collections Error:', error);
        res.status(500).send('Error loading collections.');
    }
};

exports.getCollectionForm = async (req, res) => {
    try {
        let collection = null;
        if (req.params.id) {
            const [collections] = await pool.execute('SELECT * FROM collections WHERE id = ?', [req.params.id]);
            if (collections.length > 0) collection = collections[0];
        }
        res.render('admin/collection-form', {
            title: collection ? 'Edit Collection | Admin' : 'Add Collection | Admin',
            collection,
            error: null
        });
    } catch (error) {
        console.error('Collection Form Error:', error);
        res.status(500).send('Error loading form.');
    }
};

exports.postCollection = async (req, res) => {
    const { name, slug, description, image, is_active } = req.body;
    
    try {
        // Validate slug uniqueness
        const [existing] = await pool.execute('SELECT id FROM collections WHERE slug = ? AND id != ?', [slug, req.params.id || 0]);
        if (existing.length > 0) {
            let collection = null;
            if (req.params.id) {
                const [collections] = await pool.execute('SELECT * FROM collections WHERE id = ?', [req.params.id]);
                collection = collections[0];
            }
            return res.render('admin/collection-form', {
                title: 'Add Collection | Admin',
                collection,
                error: 'A collection with this slug already exists.'
            });
        }
        
        if (req.params.id) {
            await pool.execute(
                'UPDATE collections SET name = ?, slug = ?, description = ?, image = ?, is_active = ? WHERE id = ?',
                [name, slug, description || null, image || null, is_active || 0, req.params.id]
            );
        } else {
            await pool.execute(
                'INSERT INTO collections (name, slug, description, image, is_active) VALUES (?, ?, ?, ?, ?)',
                [name, slug, description || null, image || null, is_active || 0]
            );
        }
        
        res.redirect('/admin/collections');
    } catch (error) {
        console.error('Save Collection Error:', error);
        let collection = null;
        if (req.params.id) {
            const [collections] = await pool.execute('SELECT * FROM collections WHERE id = ?', [req.params.id]);
            collection = collections[0];
        }
        res.render('admin/collection-form', {
            title: 'Add Collection | Admin',
            collection,
            error: 'Error saving collection. ' + error.message
        });
    }
};

exports.deleteCollection = async (req, res) => {
    try {
        const [collection] = await pool.execute('SELECT name FROM collections WHERE id = ?', [req.params.id]);
        await pool.execute('DELETE FROM collections WHERE id = ?', [req.params.id]);
        console.log(`🗂️ COLLECTION DELETED: ID ${req.params.id} - "${collection[0]?.name || 'Unknown'}"`);
        res.redirect('/admin/collections');
    } catch (error) {
        console.error('Delete Collection Error:', error);
        res.status(500).send('Error deleting collection.');
    }
};

// ============================================================
// OFFERS CRUD
// ============================================================

exports.getOffers = async (req, res) => {
    try {
        const [offers] = await pool.execute(`
            SELECT o.*, COUNT(op.product_id) as product_count
            FROM offers o
            LEFT JOIN offer_products op ON o.id = op.offer_id
            GROUP BY o.id
            ORDER BY o.created_at DESC
        `);
        
        res.render('admin/offers', { title: 'Offers | Admin', offers });
    } catch (error) {
        console.error('Get Offers Error:', error);
        res.status(500).send('Error loading offers.');
    }
};

exports.getOfferForm = async (req, res) => {
    try {
        const [products] = await pool.execute('SELECT * FROM products WHERE is_active = 1');
        let offer = null;
        let selectedProducts = [];
        
        if (req.params.id) {
            const [offers] = await pool.execute('SELECT * FROM offers WHERE id = ?', [req.params.id]);
            if (offers.length > 0) {
                offer = offers[0];
                const [op] = await pool.execute('SELECT product_id FROM offer_products WHERE offer_id = ?', [req.params.id]);
                selectedProducts = op.map(p => p.product_id);
            }
        }
        
        res.render('admin/offer-form', {
            title: offer ? 'Edit Offer | Admin' : 'Add Offer | Admin',
            offer,
            products,
            selectedProducts,
            error: null
        });
    } catch (error) {
        console.error('Offer Form Error:', error);
        res.status(500).send('Error loading form.');
    }
};

exports.postOffer = async (req, res) => {
    const { name, type, value, start_date, end_date, is_active, product_ids } = req.body;
    
    try {
        if (req.params.id) {
            await pool.execute(
                'UPDATE offers SET name = ?, type = ?, value = ?, start_date = ?, end_date = ?, is_active = ? WHERE id = ?',
                [name, type, value, start_date, end_date, is_active || 0, req.params.id]
            );
            
            // Update linked products
            await pool.execute('DELETE FROM offer_products WHERE offer_id = ?', [req.params.id]);
            if (product_ids) {
                const ids = Array.isArray(product_ids) ? product_ids : [product_ids];
                for (const pid of ids) {
                    await pool.execute('INSERT INTO offer_products (offer_id, product_id) VALUES (?, ?)', [req.params.id, pid]);
                }
            }
        } else {
            const [result] = await pool.execute(
                'INSERT INTO offers (name, type, value, start_date, end_date, is_active) VALUES (?, ?, ?, ?, ?, ?)',
                [name, type, value, start_date, end_date, is_active || 0]
            );
            
            const offerId = result.insertId;
            if (product_ids) {
                const ids = Array.isArray(product_ids) ? product_ids : [product_ids];
                for (const pid of ids) {
                    await pool.execute('INSERT INTO offer_products (offer_id, product_id) VALUES (?, ?)', [offerId, pid]);
                }
            }
        }
        
        res.redirect('/admin/offers');
    } catch (error) {
        console.error('Save Offer Error:', error);
        const [products] = await pool.execute('SELECT * FROM products WHERE is_active = 1');
        let offer = null;
        let selectedProducts = product_ids ? (Array.isArray(product_ids) ? product_ids.map(Number) : [Number(product_ids)]) : [];
        
        if (req.params.id) {
            const [offers] = await pool.execute('SELECT * FROM offers WHERE id = ?', [req.params.id]);
            offer = offers[0];
        }
        
        res.render('admin/offer-form', {
            title: 'Add Offer | Admin',
            offer,
            products,
            selectedProducts,
            error: 'Error saving offer. ' + error.message
        });
    }
};

exports.deleteOffer = async (req, res) => {
    try {
        const [offer] = await pool.execute('SELECT name FROM offers WHERE id = ?', [req.params.id]);
        await pool.execute('DELETE FROM offers WHERE id = ?', [req.params.id]);
        console.log(`🏷️ OFFER DELETED: ID ${req.params.id} - "${offer[0]?.name || 'Unknown'}"`);
        res.redirect('/admin/offers');
    } catch (error) {
        console.error('Delete Offer Error:', error);
        res.status(500).send('Error deleting offer.');
    }
};

// ============================================================
// ORDERS
// ============================================================

exports.getOrders = async (req, res) => {
    try {
        const { status } = req.query;
        let query = `
            SELECT o.*, 
                   (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
            FROM orders o
        `;
        const params = [];
        
        if (status && status !== 'all') {
            query += ' WHERE o.status = ?';
            params.push(status);
        }
        
        query += ' ORDER BY o.created_at DESC';
        
        const [orders] = await pool.execute(query, params);
        res.render('admin/orders', { title: 'Orders | Admin', orders, currentStatus: status || 'all' });
    } catch (error) {
        console.error('Get Orders Error:', error);
        res.status(500).send('Error loading orders.');
    }
};

exports.getOrderDetail = async (req, res) => {
    try {
        const [orders] = await pool.execute('SELECT * FROM orders WHERE id = ?', [req.params.id]);
        if (orders.length === 0) return res.status(404).send('Order not found.');
        
        const [items] = await pool.execute('SELECT * FROM order_items WHERE order_id = ?', [req.params.id]);
        
        res.render('admin/order-detail', {
            title: `Order #${orders[0].id} | Admin`,
            order: orders[0],
            items
        });
    } catch (error) {
        console.error('Order Detail Error:', error);
        res.status(500).send('Error loading order.');
    }
};

exports.postOrderStatus = async (req, res) => {
    const { status, notes } = req.body;
    try {
        const [order] = await pool.execute('SELECT id, customer_name FROM orders WHERE id = ?', [req.params.id]);
        await pool.execute('UPDATE orders SET status = ?, notes = ? WHERE id = ?', [status, notes || null, req.params.id]);
        console.log(`📋 ORDER #${req.params.id} STATUS UPDATED: ${order[0]?.customer_name} → ${status}`);
        res.redirect('/admin/orders/' + req.params.id);
    } catch (error) {
        console.error('Update Order Error:', error);
        res.status(500).send('Error updating order.');
    }
};

// ============================================================
// CARTS / ABANDONED CARTS ANALYTICS
// ============================================================

exports.getCarts = async (req, res) => {
    try {
        const { status } = req.query;
        let query = `
            SELECT c.*, 
                   (SELECT COUNT(*) FROM cart_items WHERE cart_id = c.id) as item_count,
                   (SELECT COALESCE(SUM(quantity * price), 0) FROM cart_items WHERE cart_id = c.id) as cart_total
            FROM carts c
        `;
        const params = [];
        
        if (status && status !== 'all') {
            query += ' WHERE c.status = ?';
            params.push(status);
        }
        
        query += ' ORDER BY c.updated_at DESC';
        
        const [carts] = await pool.execute(query, params);
        
        // Get abandonment stats
        const [stats] = await pool.execute(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
                SUM(CASE WHEN status = 'abandoned' THEN 1 ELSE 0 END) as abandoned,
                SUM(CASE WHEN status = 'converted' THEN 1 ELSE 0 END) as converted
            FROM carts
        `);
        
        res.render('admin/carts', {
            title: 'Carts | Admin',
            carts,
            stats: stats[0],
            currentStatus: status || 'all'
        });
    } catch (error) {
        console.error('Get Carts Error:', error);
        res.status(500).send('Error loading carts.');
    }
};

exports.getCartDetail = async (req, res) => {
    try {
        const [carts] = await pool.execute('SELECT * FROM carts WHERE id = ?', [req.params.id]);
        if (carts.length === 0) return res.status(404).send('Cart not found.');
        
        const [items] = await pool.execute(`
            SELECT ci.*, p.image as product_image
            FROM cart_items ci
            LEFT JOIN products p ON ci.product_id = p.id
            WHERE ci.cart_id = ?
        `, [req.params.id]);
        
        res.render('admin/cart-detail', {
            title: `Cart #${carts[0].id} | Admin`,
            cart: carts[0],
            items
        });
    } catch (error) {
        console.error('Cart Detail Error:', error);
        res.status(500).send('Error loading cart.');
    }
};

// ============================================================
// API: Track Cart (called from checkout page)
// ============================================================

exports.trackCart = async (req, res) => {
    try {
        const { session_id, items, customer_name, customer_phone, customer_address } = req.body;
        
        if (!session_id || !items || !Array.isArray(items)) {
            return res.status(400).json({ error: 'Invalid cart data' });
        }
        
        // Check if cart exists for this session
        const [existingCarts] = await pool.execute('SELECT id FROM carts WHERE session_id = ? AND status = "active"', [session_id]);
        let cartId;
        
        if (existingCarts.length > 0) {
            cartId = existingCarts[0].id;
            // Remove existing items and re-add
            await pool.execute('DELETE FROM cart_items WHERE cart_id = ?', [cartId]);
            await pool.execute(
                'UPDATE carts SET customer_name = ?, customer_phone = ?, customer_address = ?, updated_at = NOW() WHERE id = ?',
                [customer_name || null, customer_phone || null, customer_address || null, cartId]
            );
        } else {
            const [result] = await pool.execute(
                'INSERT INTO carts (session_id, status, customer_name, customer_phone, customer_address) VALUES (?, "active", ?, ?, ?)',
                [session_id, customer_name || null, customer_phone || null, customer_address || null]
            );
            cartId = result.insertId;
        }
        
// Insert cart items
        for (const item of items) {
            await pool.execute(
                'INSERT INTO cart_items (cart_id, product_id, product_name, quantity, price) VALUES (?, ?, ?, ?, ?)',
                [cartId, item.product_id || null, item.name, item.quantity, item.price]
            );
        }
        
        console.log(`🛒 CART TRACKED: Session ${session_id} → Cart #${cartId} (${items.length} items, customer: ${customer_name || 'Unknown'})`);
        res.json({ success: true, cart_id: cartId });
    } catch (error) {
        console.error('Track Cart Error:', error);
        res.status(500).json({ error: 'Error tracking cart.' });
    }
};

// API: Mark cart as converted (after order placed)
exports.convertCart = async (req, res) => {
    try {
        const { session_id } = req.body;
        if (!session_id) return res.status(400).json({ error: 'No session_id provided' });
        
        await pool.execute('UPDATE carts SET status = "converted" WHERE session_id = ?', [session_id]);
        console.log(`✅ CART CONVERTED: Session ${session_id} marked as converted`);
        res.json({ success: true });
    } catch (error) {
        console.error('Convert Cart Error:', error);
        res.status(500).json({ error: 'Error converting cart.' });
    }
};

