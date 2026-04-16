const mongoose = require('mongoose');

const friendRequestSchema = new mongoose.Schema({
    from: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    fromName: {
        type: String,
        required: false
    },
    to: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    toName: {
        type: String,
        required: false
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected'],
        default: 'pending'
    }
}, { timestamps: true });

// Prevent duplicate requests between the same pair
friendRequestSchema.index({ from: 1, to: 1 }, { unique: true });

// Fast lookup for incoming requests
friendRequestSchema.index({ to: 1, status: 1 });

module.exports = mongoose.model('FriendRequest', friendRequestSchema);
