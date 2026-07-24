const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAdmin } = require('../middleware/requireAdmin');

// ============================================================
// AUTH ROUTES (no middleware)
// ============================================================
router.get('/login', adminController.getLogin);
router.post('/login', adminController.postLogin);
router.get('/logout', adminController.logout);

// ============================================================
// PROTECTED ROUTES (require admin login)
// ============================================================

// Dashboard
router.get('/dashboard', requireAdmin, adminController.getDashboard);

// Products
router.get('/products', requireAdmin, adminController.getProducts);
router.get('/products/add', requireAdmin, adminController.getProductForm);
router.get('/products/edit/:id', requireAdmin, adminController.getProductForm);
router.post('/products/save', requireAdmin, adminController.postProduct);
router.post('/products/save/:id', requireAdmin, adminController.postProduct);
router.post('/products/delete/:id', requireAdmin, adminController.deleteProduct);

// Collections
router.get('/collections', requireAdmin, adminController.getCollections);
router.get('/collections/add', requireAdmin, adminController.getCollectionForm);
router.get('/collections/edit/:id', requireAdmin, adminController.getCollectionForm);
router.post('/collections/save', requireAdmin, adminController.postCollection);
router.post('/collections/save/:id', requireAdmin, adminController.postCollection);
router.post('/collections/delete/:id', requireAdmin, adminController.deleteCollection);

// Offers
router.get('/offers', requireAdmin, adminController.getOffers);
router.get('/offers/add', requireAdmin, adminController.getOfferForm);
router.get('/offers/edit/:id', requireAdmin, adminController.getOfferForm);
router.post('/offers/save', requireAdmin, adminController.postOffer);
router.post('/offers/save/:id', requireAdmin, adminController.postOffer);
router.post('/offers/delete/:id', requireAdmin, adminController.deleteOffer);

// Orders
router.get('/orders', requireAdmin, adminController.getOrders);
router.get('/orders/:id', requireAdmin, adminController.getOrderDetail);
router.post('/orders/:id/status', requireAdmin, adminController.postOrderStatus);

// Carts / Analytics
router.get('/carts', requireAdmin, adminController.getCarts);
router.get('/carts/:id', requireAdmin, adminController.getCartDetail);

// Root redirect
router.get('/', (req, res) => {
    if (req.session.adminId) {
        console.log(`↪️ ADMIN REDIRECT: ${req.session.adminName} → /admin/dashboard`);
        res.redirect('/admin/dashboard');
    } else {
        res.redirect('/admin/login');
    }
});

module.exports = router;

