const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const passport = require('passport'); // Import Passport
const User = require('../models/User');
const { validateInterests } = require('../utils/moderation');

// --- Google Auth Routes ---

// 1. Initiate Google Login
router.get('/google', (req, res, next) => {
    const action = req.query.action || 'login';
    passport.authenticate('google', {
        scope: ['profile', 'email'],
        state: action
    })(req, res, next);
});

// 2. Callback with Verbose Error Handling
router.get('/google/callback', (req, res, next) => {
    passport.authenticate('google', { session: false }, (err, user, info) => {
        const clientUrl = (process.env.CLIENT_URL || "http://localhost:5173").replace(/\/$/, "");
        const action = req.query.state || 'login';

        if (err) {
            console.error("Google OAuth Error (Passport):", err);
            // Redirect to login with error details for user visibility if needed, or simple error page
            return res.redirect(`${clientUrl}/login?error=auth_failed&details=${encodeURIComponent(err.message)}`);
        }
        if (!user) {
            console.error("Google OAuth Failed: No user returned");
            const errorMessage = info && info.message ? info.message : 'no_user';
            const redirectPath = action === 'register' ? '/register' : '/login';
            return res.redirect(`${clientUrl}${redirectPath}?error=${encodeURIComponent(errorMessage)}`);
        }

        // Successful authentication
        try {
            // If registering but user already exists with Google account → redirect to login with message
            if (action === 'register' && info && info.isNew === false) {
                return res.redirect(`${clientUrl}/login?error=${encodeURIComponent('You already have an account with us. Please login to continue.')}`);
            }

            const token = jwt.sign(
                { id: user._id },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );

            // If it's a new user, send to setup
            if (info && info.isNew) {
                return res.redirect(`${clientUrl}/setup?token=${token}`);
            }

            // Redirect to Frontend with token
            res.redirect(`${clientUrl}/?token=${token}`);
        } catch (jwtError) {
            console.error("JWT Generation Error:", jwtError);
            res.status(500).send("Internal Authentication Error");
        }
    })(req, res, next);
});


// Register
router.post('/register', async (req, res) => {

    try {
        const { displayName, email, password, interests } = req.body;

        if (!displayName || !email || !password) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }

        // Sanitize Interests if provided
        let safeInterests = [];
        if (interests && Array.isArray(interests)) {
            safeInterests = interests
                .map(i => (typeof i === 'string' ? i.trim() : ''))
                .filter(Boolean)
                .slice(0, 20);
        }

        // Check for existing user
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already in use' });
        }

        // Hash Password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create User
        const newUser = new User({
            displayName,
            email,
            password: hashedPassword,
            bio: '',
            interests: safeInterests,
            profilePhoto: null
        });

        await newUser.save();

        // Issue JWT for immediate login
        const token = jwt.sign(
            { id: newUser._id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            token,
            user: {
                id: newUser._id,
                displayName: newUser.displayName,
                email: newUser.email,
                bio: newUser.bio,
                interests: newUser.interests,
                location: newUser.location,
                profilePhoto: null,
                initials: getInitials(newUser.displayName)
            }
        });

    } catch (err) {
        console.error('Registration Error:', err);
        res.status(500).json({ error: 'Server error during registration', details: err.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Please provide email and password' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        // Update Last Login
        user.lastLogin = Date.now();
        await user.save();

        // Issue JWT
        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: {
                id: user._id,
                displayName: user.displayName,
                email: user.email,
                bio: user.bio,
                interests: user.interests,
                location: user.location,
                profilePhoto: user.profilePhoto,
                initials: getInitials(user.displayName)
            }
        });

    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ error: 'Server error during login', details: err.message });
    }
});

// Forgot Password (Returns raw temporary password for display)
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email required' });

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (!user.password && user.googleId) {
            return res.status(400).json({ error: 'This email is linked to Google. Please log in with Google.' });
        }

        // Generate strong random password
        const tempPassword = crypto.randomBytes(8).toString('hex'); // 16 chars

        // Hash and Save
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(tempPassword, salt);
        await user.save();

        // Return raw password for frontend display
        res.json({ message: 'Temporary password generated', tempPassword });

    } catch (err) {
        console.error('Forgot Password Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Helper
const getInitials = (name) => {
    const parts = (name || '').split(' ').filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

module.exports = router;
