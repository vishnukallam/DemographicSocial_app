const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
    roomId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    // Keep raw ObjectIds for query capabilities
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    // Store human-readable details at the root level to minimize populates
    participantDetails: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        displayName: { type: String },
        profilePhoto: { type: String }
    }],
    messages: [{
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        senderName: {
            type: String,
            required: true
        },
        receiver: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        content: {
            type: String,
            required: true
        },
        // WhatsApp style message status (sent/delivered/read)
        status: {
            type: String,
            enum: ['sent', 'delivered', 'read'],
            default: 'sent'
        },
        readAt: {
            type: Date,
            default: null
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    lastMessageAt: {
        type: Date,
        default: Date.now,
        index: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Conversation', conversationSchema);
