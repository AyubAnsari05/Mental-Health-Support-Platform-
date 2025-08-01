const express = require('express');
const Journal = require('../models/Journal');
const { auth, optionalAuth } = require('../middleware/auth');
const router = express.Router();

// Get public journal entries (feelings wall)
router.get('/public', optionalAuth, async (req, res) => {
    try {
        const { 
            mood, 
            page = 1, 
            limit = 20,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        const query = { isPublic: true, isModerated: false };
        
        if (mood) query.mood = mood;

        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

        const entries = await Journal.find(query)
            .populate('author', 'username profile.firstName profile.lastName')
            .sort(sortOptions)
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();

        const total = await Journal.countDocuments(query);

        res.json({
            entries,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        console.error('Get public entries error:', error);
        res.status(500).json({ error: 'Failed to fetch entries' });
    }
});

// Get user's own journal entries
router.get('/my-entries', auth, async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 20,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

        const entries = await Journal.find({ author: req.user._id })
            .sort(sortOptions)
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();

        const total = await Journal.countDocuments({ author: req.user._id });

        res.json({
            entries,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        console.error('Get my entries error:', error);
        res.status(500).json({ error: 'Failed to fetch entries' });
    }
});

// Create new journal entry
router.post('/', auth, async (req, res) => {
    try {
        const { content, mood, isAnonymous = true, isPublic = true, tags } = req.body;

        const entry = new Journal({
            author: req.user._id,
            content,
            mood,
            isAnonymous,
            isPublic,
            tags
        });

        await entry.save();

        res.status(201).json({
            message: 'Journal entry created successfully',
            entry
        });
    } catch (error) {
        console.error('Create entry error:', error);
        res.status(500).json({ error: 'Failed to create entry' });
    }
});

// Update journal entry
router.put('/:id', auth, async (req, res) => {
    try {
        const entry = await Journal.findById(req.params.id);

        if (!entry) {
            return res.status(404).json({ error: 'Entry not found' });
        }

        // Only author can edit
        if (entry.author.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Not authorized to edit this entry' });
        }

        const updatedEntry = await Journal.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        res.json({
            message: 'Entry updated successfully',
            entry: updatedEntry
        });
    } catch (error) {
        console.error('Update entry error:', error);
        res.status(500).json({ error: 'Failed to update entry' });
    }
});

// Delete journal entry
router.delete('/:id', auth, async (req, res) => {
    try {
        const entry = await Journal.findById(req.params.id);

        if (!entry) {
            return res.status(404).json({ error: 'Entry not found' });
        }

        // Only author can delete
        if (entry.author.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Not authorized to delete this entry' });
        }

        await Journal.findByIdAndDelete(req.params.id);

        res.json({ message: 'Entry deleted successfully' });
    } catch (error) {
        console.error('Delete entry error:', error);
        res.status(500).json({ error: 'Failed to delete entry' });
    }
});

// Add reaction to entry
router.post('/:id/react', auth, async (req, res) => {
    try {
        const { reactionType } = req.body;
        const entry = await Journal.findById(req.params.id);

        if (!entry) {
            return res.status(404).json({ error: 'Entry not found' });
        }

        // Check if user already reacted
        const existingReaction = entry.reactions.find(
            r => r.user.toString() === req.user._id.toString() && r.type === reactionType
        );

        if (existingReaction) {
            // Remove reaction
            entry.reactions = entry.reactions.filter(
                r => !(r.user.toString() === req.user._id.toString() && r.type === reactionType)
            );
        } else {
            // Add reaction
            entry.reactions.push({
                user: req.user._id,
                type: reactionType
            });
        }

        await entry.save();

        res.json({
            message: existingReaction ? 'Reaction removed' : 'Reaction added',
            reactions: entry.reactions
        });
    } catch (error) {
        console.error('React to entry error:', error);
        res.status(500).json({ error: 'Failed to react to entry' });
    }
});

// Add comment to entry
router.post('/:id/comment', auth, async (req, res) => {
    try {
        const { content, isAnonymous = true } = req.body;
        const entry = await Journal.findById(req.params.id);

        if (!entry) {
            return res.status(404).json({ error: 'Entry not found' });
        }

        entry.comments.push({
            user: req.user._id,
            content,
            isAnonymous
        });

        await entry.save();

        res.json({
            message: 'Comment added successfully',
            comment: entry.comments[entry.comments.length - 1]
        });
    } catch (error) {
        console.error('Add comment error:', error);
        res.status(500).json({ error: 'Failed to add comment' });
    }
});

// Flag entry for moderation
router.post('/:id/flag', auth, async (req, res) => {
    try {
        const { reason } = req.body;
        const entry = await Journal.findById(req.params.id);

        if (!entry) {
            return res.status(404).json({ error: 'Entry not found' });
        }

        entry.isFlagged = true;
        entry.flagReason = reason;
        await entry.save();

        res.json({ message: 'Entry flagged for moderation' });
    } catch (error) {
        console.error('Flag entry error:', error);
        res.status(500).json({ error: 'Failed to flag entry' });
    }
});

// Get mood statistics
router.get('/stats/mood', auth, async (req, res) => {
    try {
        const stats = await Journal.aggregate([
            { $match: { author: req.user._id } },
            { $group: { _id: '$mood', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        res.json({ stats });
    } catch (error) {
        console.error('Get mood stats error:', error);
        res.status(500).json({ error: 'Failed to fetch mood statistics' });
    }
});

module.exports = router; 