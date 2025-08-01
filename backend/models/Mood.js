const mongoose = require('mongoose');

const moodSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    mood: {
        type: String,
        enum: ['very-happy', 'happy', 'neutral', 'sad', 'very-sad', 'anxious', 'stressed', 'excited', 'calm', 'angry', 'frustrated'],
        required: true
    },
    intensity: {
        type: Number,
        min: 1,
        max: 10,
        default: 5
    },
    activities: [{
        type: String,
        enum: ['exercise', 'meditation', 'socializing', 'studying', 'sleeping', 'eating', 'hobby', 'work', 'other']
    }],
    notes: {
        type: String,
        maxlength: 500
    },
    sleepHours: {
        type: Number,
        min: 0,
        max: 24
    },
    stressLevel: {
        type: Number,
        min: 1,
        max: 10
    },
    energyLevel: {
        type: Number,
        min: 1,
        max: 10
    },
    isPrivate: {
        type: Boolean,
        default: true
    },
    tags: [{
        type: String,
        trim: true
    }]
}, {
    timestamps: true
});

// Index for better query performance
moodSchema.index({ user: 1, createdAt: -1 });
moodSchema.index({ mood: 1, createdAt: -1 });
moodSchema.index({ user: 1, mood: 1, createdAt: -1 });

module.exports = mongoose.model('Mood', moodSchema); 