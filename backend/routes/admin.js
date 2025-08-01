const express = require('express');
const User = require('../models/User');
const Resource = require('../models/Resource');
const Journal = require('../models/Journal');
const Forum = require('../models/Forum');
const Mood = require('../models/Mood');
const { auth, requireRole } = require('../middleware/auth');
const mongoose = require('mongoose');
const router = express.Router();

// All admin routes require admin role
router.use(auth, requireRole(['admin']));

// Get admin dashboard overview
router.get('/dashboard', async (req, res) => {
    try {
        // User statistics
        const userStats = await User.aggregate([
            {
                $group: {
                    _id: '$role',
                    count: { $sum: 1 },
                    activeCount: { $sum: { $cond: ['$isActive', 1, 0] } },
                    verifiedCount: { $sum: { $cond: ['$isVerified', 1, 0] } }
                }
            }
        ]);

        // Resource statistics
        const resourceStats = await Resource.aggregate([
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 },
                    totalViews: { $sum: '$views' },
                    totalLikes: { $sum: '$likes' }
                }
            }
        ]);

        // Journal statistics
        const journalStats = await Journal.aggregate([
            {
                $group: {
                    _id: '$mood',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Forum statistics
        const forumStats = await Forum.aggregate([
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 },
                    totalViews: { $sum: '$views' }
                }
            }
        ]);

        // Recent activity
        const recentUsers = await User.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select('username email role createdAt');

        const recentResources = await Resource.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select('title category createdAt');

        const flaggedContent = await Promise.all([
            Journal.countDocuments({ isFlagged: true }),
            Forum.countDocuments({ isFlagged: true })
        ]);

        res.json({
            userStats,
            resourceStats,
            journalStats,
            forumStats,
            recentUsers,
            recentResources,
            flaggedContent: {
                journals: flaggedContent[0],
                forums: flaggedContent[1]
            }
        });
    } catch (error) {
        console.error('Get admin dashboard error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
});

// Get flagged content for moderation
router.get('/moderation/flagged', async (req, res) => {
    try {
        const { type, page = 1, limit = 20 } = req.query;

        let flaggedItems = [];
        let total = 0;

        if (!type || type === 'journal') {
            const flaggedJournals = await Journal.find({ isFlagged: true })
                .populate('author', 'username email')
                .sort({ createdAt: -1 })
                .limit(limit * 1)
                .skip((page - 1) * limit);

            flaggedItems = flaggedItems.concat(flaggedJournals.map(item => ({
                ...item.toObject(),
                type: 'journal'
            })));
        }

        if (!type || type === 'forum') {
            const flaggedForums = await Forum.find({ isFlagged: true })
                .populate('author', 'username email')
                .sort({ createdAt: -1 })
                .limit(limit * 1)
                .skip((page - 1) * limit);

            flaggedItems = flaggedItems.concat(flaggedForums.map(item => ({
                ...item.toObject(),
                type: 'forum'
            })));
        }

        total = await Promise.all([
            Journal.countDocuments({ isFlagged: true }),
            Forum.countDocuments({ isFlagged: true })
        ]).then(counts => counts.reduce((sum, count) => sum + count, 0));

        res.json({
            flaggedItems,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        console.error('Get flagged content error:', error);
        res.status(500).json({ error: 'Failed to fetch flagged content' });
    }
});

// Moderate flagged content
router.put('/moderation/:type/:id', async (req, res) => {
    try {
        const { type, id } = req.params;
        const { action, reason } = req.body; // action: 'approve', 'reject', 'delete'

        let model;
        if (type === 'journal') {
            model = Journal;
        } else if (type === 'forum') {
            model = Forum;
        } else {
            return res.status(400).json({ error: 'Invalid content type' });
        }

        const item = await model.findById(id);
        if (!item) {
            return res.status(404).json({ error: 'Content not found' });
        }

        switch (action) {
            case 'approve':
                item.isFlagged = false;
                item.flagReason = null;
                item.isModerated = true;
                break;
            case 'reject':
                item.isModerated = true;
                break;
            case 'delete':
                await model.findByIdAndDelete(id);
                return res.json({ message: 'Content deleted successfully' });
            default:
                return res.status(400).json({ error: 'Invalid action' });
        }

        await item.save();

        res.json({
            message: `Content ${action}d successfully`,
            item
        });
    } catch (error) {
        console.error('Moderate content error:', error);
        res.status(500).json({ error: 'Failed to moderate content' });
    }
});

// Get user management data
router.get('/users', async (req, res) => {
    try {
        const { role, isActive, page = 1, limit = 20 } = req.query;
        
        const query = {};
        if (role) query.role = role;
        if (isActive !== undefined) query.isActive = isActive === 'true';

        const users = await User.find(query)
            .select('-password')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();

        const total = await User.countDocuments(query);

        res.json({
            users,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Update user (admin)
router.put('/users/:id', async (req, res) => {
    try {
        const { isActive, isVerified, role } = req.body;
        const updates = {};

        if (isActive !== undefined) updates.isActive = isActive;
        if (isVerified !== undefined) updates.isVerified = isVerified;
        if (role) updates.role = role;

        const user = await User.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            message: 'User updated successfully',
            user
        });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

// Get resource management data
router.get('/resources', async (req, res) => {
    try {
        const { category, isPublished, page = 1, limit = 20 } = req.query;
        
        const query = {};
        if (category) query.category = category;
        if (isPublished !== undefined) query.isPublished = isPublished === 'true';

        const resources = await Resource.find(query)
            .populate('author', 'username profile.firstName profile.lastName')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();

        const total = await Resource.countDocuments(query);

        res.json({
            resources,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        console.error('Get resources error:', error);
        res.status(500).json({ error: 'Failed to fetch resources' });
    }
});

// Update resource (admin)
router.put('/resources/:id', async (req, res) => {
    try {
        const { isPublished, isFeatured } = req.body;
        const updates = {};

        if (isPublished !== undefined) updates.isPublished = isPublished;
        if (isFeatured !== undefined) updates.isFeatured = isFeatured;

        const resource = await Resource.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true, runValidators: true }
        );

        if (!resource) {
            return res.status(404).json({ error: 'Resource not found' });
        }

        res.json({
            message: 'Resource updated successfully',
            resource
        });
    } catch (error) {
        console.error('Update resource error:', error);
        res.status(500).json({ error: 'Failed to update resource' });
    }
});

// Get analytics data
router.get('/analytics', async (req, res) => {
    try {
        const { period = 'month' } = req.query;
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

        // User registration trends
        const userTrends = await User.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Resource view trends
        const resourceViews = await Resource.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
                    },
                    totalViews: { $sum: '$views' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Mood trends
        const moodTrends = await Mood.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
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

        res.json({
            userTrends,
            resourceViews,
            moodTrends,
            period
        });
    } catch (error) {
        console.error('Get analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

// Route to view all database data (for admin debugging)
router.get('/database', auth, requireRole('admin'), async (req, res) => {
    try {
        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();
        
        const data = {};
        
        for (const collection of collections) {
            const collectionName = collection.name;
            const documents = await db.collection(collectionName).find({}).toArray();
            data[collectionName] = documents;
        }
        
        res.json({
            success: true,
            message: 'Database data retrieved successfully',
            data: data,
            collections: collections.map(c => c.name)
        });
    } catch (error) {
        console.error('Error fetching database data:', error);
        res.status(500).json({ error: 'Failed to fetch database data' });
    }
});

module.exports = router; 