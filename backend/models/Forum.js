const mongoose = require('mongoose');

const forumSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    description: {
        type: String,
        required: true,
        maxlength: 1000
    },
    category: {
        type: String,
        enum: ['general', 'academic-stress', 'relationships', 'anxiety', 'depression', 'self-care', 'motivation', 'crisis-support'],
        required: true
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    isAnonymous: {
        type: Boolean,
        default: true
    },
    isPinned: {
        type: Boolean,
        default: false
    },
    isLocked: {
        type: Boolean,
        default: false
    },
    views: {
        type: Number,
        default: 0
    },
    upvotes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    downvotes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    tags: [{
        type: String,
        trim: true
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
forumSchema.index({ category: 1, createdAt: -1 });
forumSchema.index({ author: 1, createdAt: -1 });
forumSchema.index({ isPinned: 1, createdAt: -1 });

module.exports = mongoose.model('Forum', forumSchema); 