const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }],
    chatType: {
        type: String,
        enum: ['student-counsellor', 'student-peer', 'group'],
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    },
    lastMessageTime: {
        type: Date,
        default: Date.now
    },
    unreadCount: {
        type: Map,
        of: Number,
        default: new Map()
    }
}, {
    timestamps: true
});

// Index for better query performance
chatSchema.index({ participants: 1 });
chatSchema.index({ chatType: 1, isActive: 1 });

module.exports = mongoose.model('Chat', chatSchema); 