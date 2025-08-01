const express = require('express');
const Mood = require('../models/Mood');
const { auth } = require('../middleware/auth');
const router = express.Router();

// Get user's mood entries
router.get('/', auth, async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 30,
            startDate,
            endDate,
            mood
        } = req.query;

        const query = { user: req.user._id };
        
        if (startDate && endDate) {
            query.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }
        
        if (mood) query.mood = mood;

        const entries = await Mood.find(query)
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();

        const total = await Mood.countDocuments(query);

        res.json({
            entries,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        console.error('Get mood entries error:', error);
        res.status(500).json({ error: 'Failed to fetch mood entries' });
    }
});

// Get today's mood entry
router.get('/today', auth, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const entry = await Mood.findOne({
            user: req.user._id,
            createdAt: {
                $gte: today,
                $lt: tomorrow
            }
        });

        res.json({ entry });
    } catch (error) {
        console.error('Get today mood error:', error);
        res.status(500).json({ error: 'Failed to fetch today\'s mood' });
    }
});

// Create new mood entry
router.post('/', auth, async (req, res) => {
    try {
        const { 
            mood, 
            intensity = 5, 
            activities, 
            notes, 
            sleepHours, 
            stressLevel, 
            energyLevel, 
            isPrivate = true,
            tags 
        } = req.body;

        // Check if entry already exists for today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const existingEntry = await Mood.findOne({
            user: req.user._id,
            createdAt: {
                $gte: today,
                $lt: tomorrow
            }
        });

        if (existingEntry) {
            return res.status(400).json({ 
                error: 'Mood entry already exists for today',
                entry: existingEntry 
            });
        }

        const entry = new Mood({
            user: req.user._id,
            mood,
            intensity,
            activities,
            notes,
            sleepHours,
            stressLevel,
            energyLevel,
            isPrivate,
            tags
        });

        await entry.save();

        res.status(201).json({
            message: 'Mood entry created successfully',
            entry
        });
    } catch (error) {
        console.error('Create mood entry error:', error);
        res.status(500).json({ error: 'Failed to create mood entry' });
    }
});

// Update mood entry
router.put('/:id', auth, async (req, res) => {
    try {
        const entry = await Mood.findById(req.params.id);

        if (!entry) {
            return res.status(404).json({ error: 'Mood entry not found' });
        }

        // Only owner can edit
        if (entry.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Not authorized to edit this entry' });
        }

        const updatedEntry = await Mood.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        res.json({
            message: 'Mood entry updated successfully',
            entry: updatedEntry
        });
    } catch (error) {
        console.error('Update mood entry error:', error);
        res.status(500).json({ error: 'Failed to update mood entry' });
    }
});

// Delete mood entry
router.delete('/:id', auth, async (req, res) => {
    try {
        const entry = await Mood.findById(req.params.id);

        if (!entry) {
            return res.status(404).json({ error: 'Mood entry not found' });
        }

        // Only owner can delete
        if (entry.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Not authorized to delete this entry' });
        }

        await Mood.findByIdAndDelete(req.params.id);

        res.json({ message: 'Mood entry deleted successfully' });
    } catch (error) {
        console.error('Delete mood entry error:', error);
        res.status(500).json({ error: 'Failed to delete mood entry' });
    }
});

// Get mood statistics
router.get('/stats/overview', auth, async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));

        const stats = await Mood.aggregate([
            { 
                $match: { 
                    user: req.user._id,
                    createdAt: { $gte: startDate }
                } 
            },
            { 
                $group: { 
                    _id: '$mood', 
                    count: { $sum: 1 },
                    avgIntensity: { $avg: '$intensity' },
                    avgStressLevel: { $avg: '$stressLevel' },
                    avgEnergyLevel: { $avg: '$energyLevel' },
                    avgSleepHours: { $avg: '$sleepHours' }
                } 
            },
            { $sort: { count: -1 } }
        ]);

        // Get average mood intensity over time
        const intensityTrend = await Mood.aggregate([
            { 
                $match: { 
                    user: req.user._id,
                    createdAt: { $gte: startDate }
                } 
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
                    },
                    avgIntensity: { $avg: '$intensity' },
                    avgStressLevel: { $avg: '$stressLevel' },
                    avgEnergyLevel: { $avg: '$energyLevel' }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.json({
            stats,
            intensityTrend,
            totalEntries: stats.reduce((sum, stat) => sum + stat.count, 0)
        });
    } catch (error) {
        console.error('Get mood stats error:', error);
        res.status(500).json({ error: 'Failed to fetch mood statistics' });
    }
});

// Get mood trends
router.get('/stats/trends', auth, async (req, res) => {
    try {
        const { period = 'week' } = req.query;
        let days;
        
        switch (period) {
            case 'week':
                days = 7;
                break;
            case 'month':
                days = 30;
                break;
            case 'quarter':
                days = 90;
                break;
            default:
                days = 30;
        }

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const trends = await Mood.aggregate([
            { 
                $match: { 
                    user: req.user._id,
                    createdAt: { $gte: startDate }
                } 
            },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                        mood: "$mood"
                    },
                    count: { $sum: 1 },
                    avgIntensity: { $avg: '$intensity' }
                }
            },
            { $sort: { '_id.date': 1 } }
        ]);

        res.json({ trends });
    } catch (error) {
        console.error('Get mood trends error:', error);
        res.status(500).json({ error: 'Failed to fetch mood trends' });
    }
});

// Get activity statistics
router.get('/stats/activities', auth, async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));

        const activityStats = await Mood.aggregate([
            { 
                $match: { 
                    user: req.user._id,
                    createdAt: { $gte: startDate }
                } 
            },
            { $unwind: '$activities' },
            { 
                $group: { 
                    _id: '$activities', 
                    count: { $sum: 1 },
                    avgMoodIntensity: { $avg: '$intensity' }
                } 
            },
            { $sort: { count: -1 } }
        ]);

        res.json({ activityStats });
    } catch (error) {
        console.error('Get activity stats error:', error);
        res.status(500).json({ error: 'Failed to fetch activity statistics' });
    }
});

module.exports = router; 