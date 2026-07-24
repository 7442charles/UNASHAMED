require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');

const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Session for Auth
app.use(session({
    secret: process.env.SESSION_SECRET || 'unashamed_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// View Engine Setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Expose env variables to all EJS views
app.use((req, res, next) => {
    res.locals.SELLER_WHATSAPP = process.env.SELLER_WHATSAPP || '254700000000';
    next();
});

// Routes
console.log('🔄 MOUNTING ROUTES...');
const mainRoutes = require('./routes/index');
app.use('/', mainRoutes);
console.log('   ✅ Store routes mounted at /');

// Admin Routes
const adminRoutes = require('./routes/admin');
app.use('/admin', adminRoutes);
console.log('   ✅ Admin routes mounted at /admin');

const PORT = process.env.PORT;
app.listen(PORT, () => {
    console.log(`🚀 SERVER STARTED: http://localhost:${PORT}`);
    console.log(`   Admin Panel: http://localhost:${PORT}/admin/login`);
    console.log(`   Store:       http://localhost:${PORT}`);
});
