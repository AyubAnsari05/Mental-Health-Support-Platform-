const mongoose = require('mongoose');

const forumReplySchema = new mongoose.Schema({
    forum: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Forum',
        required: true
    },
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
    isAnonymous: {
        type: Boolean,
        default: true
    },
    parentReply: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ForumReply',
        default: null
    },
    upvotes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    downvotes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
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
forumReplySchema.index({ forum: 1, createdAt: 1 });
forumReplySchema.index({ author: 1, createdAt: -1 });
forumReplySchema.index({ parentReply: 1 });

module.exports = mongoose.model('ForumReply', forumReplySchema); 