const express = require('express');
const router = express.Router();
const authRoutes = require('./auth');

router.use('/auth', authRoutes);

// 1. Expanded Dummy Data
const collections = [
    { slug: "core-essentials", name: "Core Essentials", description: "The unapologetic foundation of your wardrobe.", image: "https://images.unsplash.com/photo-1516826957135-7331826922bd?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" },
    { slug: "urban-tactical", name: "Urban Tactical", description: "Built for the streets. Heavyweight fabrics and utility.", image: "https://images.unsplash.com/photo-1523398002811-999aa8e9f5b9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" }
];

const products = [
    { id: 1, name: "Unashamed Classic Tee", price: 1500, collection: "core-essentials", image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80" },
    { id: 2, name: "Premium Heavyweight Hoodie", price: 3500, collection: "core-essentials", image: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80" },
    { id: 3, name: "Logo Beanie", price: 800, collection: "core-essentials", image: "https://images.unsplash.com/photo-1576871337622-98d48d1cf531?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80" },
    { id: 4, name: "Signature Cargo Pants", price: 2800, collection: "urban-tactical", image: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80" },
    { id: 5, name: "Oversized Graphic Tee", price: 1800, collection: "urban-tactical", image: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80" },
    { id: 6, name: "Utility Vest", price: 4500, collection: "urban-tactical", image: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80" }
];

// 2. Home Page Route
router.get('/', (req, res) => {
    const featuredProducts = products.slice(0, 3); // Top 3 for Featured
    res.render('index', { 
        title: 'Unashamed | Wear Your Truth', 
        description: 'Shop the latest Unashamed collection. Bold, unapologetic streetwear for those who dare to stand out.',
        products: featuredProducts, // Used for the "Featured Items" section
        allProducts: products,      // New: Pass all products for "Today's Pick"
        collections 
    });
});

// 3. Shop All Route
router.get('/shop', (req, res) => {
    res.render('shop', { title: 'Shop All | Unashamed', products });
});

// 4. Single Collection Route (Dynamic)
router.get('/collections/:slug', (req, res) => {
    const collection = collections.find(c => c.slug === req.params.slug);
    if (!collection) return res.status(404).render('404', { title: 'Not Found' });

    const collectionProducts = products.filter(p => p.collection === req.params.slug);
    res.render('collection', { title: `${collection.name} | Unashamed`, collection, products: collectionProducts });
});

// Capture lead route (Auth form before WhatsApp)
router.get('/capture-lead', (req, res) => {
    res.render('capture', { title: 'Complete Your Order' });
});

module.exports = router;