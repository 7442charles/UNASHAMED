/**
 * Middleware to protect admin routes
 * Checks if user has an active admin session
 */

function requireAdmin(req, res, next) {
    if (!req.session.adminId) {
        console.log(`⛔ UNAUTHORIZED ADMIN ACCESS: ${req.method} ${req.originalUrl} - Redirected to login`);
        return res.redirect('/admin/login');
    }
    
    console.log(`👤 ADMIN ACCESS: ${req.session.adminName} (${req.session.adminRole}) → ${req.method} ${req.originalUrl}`);
    
    // Attach admin info to locals for views
    res.locals.admin = {
        id: req.session.adminId,
        name: req.session.adminName,
        email: req.session.adminEmail,
        role: req.session.adminRole
    };
    
    next();
}

function requireSuperAdmin(req, res, next) {
    if (!req.session.adminId) {
        console.log(`⛔ UNAUTHORIZED SUPER ADMIN ACCESS: ${req.method} ${req.originalUrl}`);
        return res.redirect('/admin/login');
    }
    
    if (req.session.adminRole !== 'super_admin') {
        console.log(`⛔ INSUFFICIENT ROLE: ${req.session.adminName} (${req.session.adminRole}) tried to access super admin route`);
        return res.status(403).send('Access denied. Super Admin privileges required.');
    }
    
    res.locals.admin = {
        id: req.session.adminId,
        name: req.session.adminName,
        email: req.session.adminEmail,
        role: req.session.adminRole
    };
    
    next();
}

module.exports = { requireAdmin, requireSuperAdmin };

