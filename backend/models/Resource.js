const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    category: {
        type: String,
        enum: ['stress-management', 'anxiety', 'depression', 'motivation', 'mindfulness', 'self-care', 'academic-pressure', 'relationships', 'crisis-support'],
        required: true
    },
    type: {
        type: String,
        enum: ['article', 'video', 'guide', 'worksheet', 'meditation'],
        required: true
    },
    mediaUrl: {
        type: String,
        default: null
    },
    thumbnail: {
        type: String,
        default: null
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    tags: [{
        type: String,
        trim: true
    }],
    isPublished: {
        type: Boolean,
        default: false
    },
    isFeatured: {
        type: Boolean,
        default: false
    },
    views: {
        type: Number,
        default: 0
    },
    likes: {
        type: Number,
        default: 0
    },
    readingTime: {
        type: Number, // in minutes
        default: 5
    },
    difficulty: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced'],
        default: 'beginner'
    }
}, {
    timestamps: true
});

// Index for better search performance
resourceSchema.index({ title: 'text', description: 'text', tags: 'text' });
resourceSchema.index({ category: 1, isPublished: 1 });

module.exports = mongoose.model('Resource', resourceSchema); 