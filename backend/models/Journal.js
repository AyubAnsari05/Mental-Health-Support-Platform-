const mongoose = require('mongoose');

const journalSchema = new mongoose.Schema({
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        required: true,
        maxlength: 2000
    },
    mood: {
        type: String,
        enum: ['very-happy', 'happy', 'neutral', 'sad', 'very-sad', 'anxious', 'stressed', 'excited', 'calm'],
        required: true
    },
    isAnonymous: {
        type: Boolean,
        default: true
    },
    isPublic: {
        type: Boolean,
        default: true
    },
    tags: [{
        type: String,
        trim: true
    }],
    reactions: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        type: {
            type: String,
            enum: ['heart', 'hug', 'support', 'understand'],
            required: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    comments: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        content: {
            type: String,
            required: true,
            maxlength: 500
        },
        isAnonymous: {
            type: Boolean,
            default: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    isFlagged: {
        type: Boolean,
        default: false
    },
    flagReason: {
        type: String,
        enum: ['inappropriate', 'spam', 'harassment', 'other'],
        default: null
    },
    isModerated: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Index for better query performance
journalSchema.index({ author: 1, createdAt: -1 });
journalSchema.index({ isPublic: 1, isAnonymous: 1, createdAt: -1 });
journalSchema.index({ mood: 1, isPublic: 1 });

module.exports = mongoose.model('Journal', journalSchema); 