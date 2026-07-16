const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('../config/db');
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

// --- RENDER PAGES ---
router.get('/login', (req, res) => res.render('auth/login', { title: 'Login' }));
router.get('/register', (req, res) => res.render('auth/register', { title: 'Register' }));
router.get('/forgot-password', (req, res) => res.render('auth/forgot-password', { title: 'Reset Password' }));

// --- POST LOGIC ---

// 1. Registration Logic
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.execute(
            'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
            [name, email, hashedPassword]
        );
        res.redirect('/auth/login');
    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).send('Error creating account.');
    }
});

// 2. Login Logic
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
        if (rows.length === 0) return res.send('User not found.');

        const user = rows[0];
        const match = await bcrypt.compare(password, user.password_hash);
        
        if (match) {
            req.session.userId = user.id; 
            req.session.userName = user.name;
            res.redirect('/');
        } else {
            res.send('Incorrect password.');
        }
    } catch (error) {
        res.status(500).send('Login error.');
    }
});

// 3. Forgot Password Logic (Placeholder)
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    try {
        // 1. Check if user exists
        const [users] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            // Good practice: don't reveal if the email exists to prevent user enumeration
            return res.send('If an account exists, a reset link has been sent.');
        }

        // 2. Generate a secure token
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now

        // 3. Save to database
        await pool.execute(
            'INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)',
            [email, token, expiresAt]
        );

        // 4. Send Email
        const resetLink = `http://localhost:4090/auth/reset-password?token=${token}`;
        await resend.emails.send({
            from: 'noreply@unashamed.co.ke', // Ensure this matches your verified domain
            to: email,
            subject: 'Reset your Unashamed Password',
            html: `<p>Click here to reset your password: <a href="${resetLink}">Reset Password</a></p>
                   <p>This link expires in 1 hour.</p>`
        });

        res.send('If an account exists, a reset link has been sent.');
    } catch (error) {
        console.error('Forgot Password Error:', error);
        res.status(500).send('An error occurred.');
    }
});
module.exports = router;