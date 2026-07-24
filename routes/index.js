const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authRoutes = require('./auth');

router.use('/auth', authRoutes);

// ============================================================
// HOME PAGE
// ============================================================
router.get('/', async (req, res) => {
    try {
        // Get active collections
        const [collections] = await pool.execute(
            'SELECT * FROM collections WHERE is_active = 1'
        );
        
        // Get active products
        const [products] = await pool.execute(
            'SELECT * FROM products WHERE is_active = 1 ORDER BY created_at DESC'
        );
        
        // Get active offers to calculate discounted prices
        const [offers] = await pool.execute(`
            SELECT o.*, GROUP_CONCAT(op.product_id) as offer_product_ids
            FROM offers o
            LEFT JOIN offer_products op ON o.id = op.offer_id
            WHERE o.is_active = 1 AND o.start_date <= NOW() AND o.end_date >= NOW()
            GROUP BY o.id
        `);
        
        // Build a map of product_id => best offer
        const offerMap = {};
        offers.forEach(offer => {
            if (offer.offer_product_ids) {
                const ids = offer.offer_product_ids.split(',').map(Number);
                ids.forEach(pid => {
                    if (!offerMap[pid]) {
                        offerMap[pid] = { type: offer.type, value: parseFloat(offer.value) };
                    }
                });
            }
        });
        
        // Attach offer prices to products
        const productsWithOffers = products.map(p => {
            const pObj = { ...p };
            if (offerMap[p.id]) {
                const offer = offerMap[p.id];
                if (offer.type === 'percentage') {
                    pObj.discounted_price = p.price - (p.price * offer.value / 100);
                } else {
                    pObj.discounted_price = Math.max(0, p.price - offer.value);
                }
                pObj.has_offer = true;
            }
            return pObj;
        });
        
        const featuredProducts = productsWithOffers.slice(0, 3);
        
        res.render('index', { 
            title: 'Unashamed | Wear Your Truth', 
            description: 'Shop the latest Unashamed collection. Bold, unapologetic streetwear for those who dare to stand out.',
            products: featuredProducts,
            allProducts: productsWithOffers,
            collections 
        });
    } catch (error) {
        console.error('Home Page Error:', error);
        res.status(500).send('Error loading page.');
    }
});

// ============================================================
// SHOP ALL
// ============================================================
router.get('/shop', async (req, res) => {
    try {
        const [products] = await pool.execute(
            'SELECT * FROM products WHERE is_active = 1 ORDER BY created_at DESC'
        );
        
        res.render('shop', { title: 'Shop All | Unashamed', products });
    } catch (error) {
        console.error('Shop Page Error:', error);
        res.status(500).send('Error loading page.');
    }
});

// ============================================================
// SINGLE COLLECTION
// ============================================================
router.get('/collections/:slug', async (req, res) => {
    try {
        const [collections] = await pool.execute(
            'SELECT * FROM collections WHERE slug = ? AND is_active = 1',
            [req.params.slug]
        );
        
        if (collections.length === 0) {
            return res.status(404).render('404', { title: 'Not Found' });
        }
        
        const collection = collections[0];
        
        const [products] = await pool.execute(`
            SELECT p.* FROM products p
            JOIN product_collections pc ON p.id = pc.product_id
            WHERE pc.collection_id = ? AND p.is_active = 1
        `, [collection.id]);
        
        res.render('collection', { 
            title: `${collection.name} | Unashamed`, 
            collection, 
            products 
        });
    } catch (error) {
        console.error('Collection Page Error:', error);
        res.status(500).send('Error loading collection.');
    }
});

// ============================================================
// CAPTURE LEAD (Checkout Page)
// ============================================================
router.get('/capture-lead', (req, res) => {
    res.render('capture', { title: 'Complete Your Order' });
});

// ============================================================
// API: Track Cart (for abandonment analytics)
// ============================================================
router.post('/api/track-cart', async (req, res) => {
    try {
        const { session_id, items, customer_name, customer_phone, customer_address } = req.body;
        
        if (!session_id || !items || !Array.isArray(items)) {
            return res.status(400).json({ error: 'Invalid cart data' });
        }
        
        // Check if cart exists for this session
        const [existingCarts] = await pool.execute(
            'SELECT id FROM carts WHERE session_id = ? AND status = "active"', 
            [session_id]
        );
        
        let cartId;
        
        if (existingCarts.length > 0) {
            cartId = existingCarts[0].id;
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
                [cartId, item.product_id || null, item.name, item.quantity || 1, item.price || 0]
            );
        }
        
        res.json({ success: true, cart_id: cartId });
    } catch (error) {
        console.error('Track Cart Error:', error);
        res.status(500).json({ error: 'Error tracking cart.' });
    }
});

// ============================================================
// API: Mark cart as converted
// ============================================================
router.post('/api/convert-cart', async (req, res) => {
    try {
        const { session_id } = req.body;
        if (!session_id) return res.status(400).json({ error: 'No session_id provided' });
        
        await pool.execute('UPDATE carts SET status = "converted" WHERE session_id = ?', [session_id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Convert Cart Error:', error);
        res.status(500).json({ error: 'Error converting cart.' });
    }
});

module.exports = router;

