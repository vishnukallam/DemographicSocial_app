const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Although we are using stateless JWTs, passport requires serialization functions for session support if typically used. 
// However, we are explicitely NOT using sessions (session: false) in the route.
// But some passport implementations still check for these if initialization isn't careful.
// Safe to add them just in case, though they might not be used.
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    User.findById(id).then(user => {
        done(null, user);
    });
});

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    // Google Console Env Variable Check (User named it CALLBACK_URL)
    callbackURL: process.env.GOOGLE_CALLBACK_URL || process.env.CALLBACK_URL || "/api/auth/google/callback",
    proxy: true,
    passReqToCallback: true
}, async (req, accessToken, refreshToken, profile, done) => {
    try {
        const action = req.query.state || 'login';
        const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;

        if (action === 'login') {
            // Must have googleId to login via Google
            const existingUser = await User.findOne({ googleId: profile.id });
            if (existingUser) {
                return done(null, existingUser);
            }
            // Cannot login if Google account not registered
            return done(null, false, { message: 'Account not found. Please register first or use your email and password.' });

        } else if (action === 'register') {
            // 1. Check if user exists with googleId
            const existingUser = await User.findOne({ googleId: profile.id });
            if (existingUser) {
                return done(null, existingUser, { isNew: false });
            }

            // 2. Check if user exists with same email (normal registration)
            if (email) {
                const existingEmailUser = await User.findOne({ email });
                if (existingEmailUser) {
                    return done(null, false, { message: 'Email already registered. Please login with your email and password.' });
                }
            }

            // 3. Create New User
            const newUser = new User({
                googleId: profile.id,
                displayName: profile.displayName,
                email: email,
                profilePhoto: profile.photos && profile.photos[0] ? profile.photos[0].value : '',
                bio: "New to the community!"
            });

            await newUser.save();
            return done(null, newUser, { isNew: true });
        }
    } catch (err) {
        console.error("Google Auth Error:", err);
        done(err, null);
    }
}));

module.exports = passport;
