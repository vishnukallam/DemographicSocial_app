const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    googleId: {
        type: String,
        unique: true,
        sparse: true // Allows null/undefined values to not conflict
    },
    displayName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: function () { return !this.googleId; } // Required if not a google user
    },
    profilePhoto: {
        type: String
    },
    bio: {
        type: String,
        default: ''
    },
    interests: {
        type: [String],
        default: []
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number],
            default: [0, 0] // [longitude, latitude]
        }
    },
    lastLogin: {
        type: Date,
        default: Date.now
    },
    isActive: {
        type: Boolean,
        default: true
    },
    friends: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    blockedUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    userType: {
        type: String,
        enum: ['user', 'ghost', 'admin'],
        default: 'user'
    },
    authMethod: {
        type: String,
        enum: ['local', 'google'],
        default: 'local'
    },
    moderationStrikes: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

// Pre-save hook to normalize interests
userSchema.pre('save', async function () {
    if (this.isModified('interests') && this.interests && this.interests.length > 0) {
        // Normalize strings: trim whitespace
        this.interests = this.interests.map(i => i.trim());
    }
});

// Index for geospatial queries
userSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('User', userSchema);
