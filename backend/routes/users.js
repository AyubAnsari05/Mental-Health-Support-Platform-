const express = require('express');
const User = require('../models/User');
const { auth, requireRole } = require('../middleware/auth');
const router = express.Router();

// Get all users (admin only)
router.get('/', auth, requireRole(['admin']), async (req, res) => {
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

// Get counsellors
router.get('/counsellors', async (req, res) => {
    try {
        const counsellors = await User.find({ 
            role: 'counsellor', 
            isActive: true,
            isVerified: true 
        })
        .select('username profile.firstName profile.lastName profile.bio profile.avatar')
        .sort({ 'profile.firstName': 1 });

        res.json({ counsellors });
    } catch (error) {
        console.error('Get counsellors error:', error);
        res.status(500).json({ error: 'Failed to fetch counsellors' });
    }
});

// Get user by ID
router.get('/:id', auth, async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Only show full profile to self or admin
        if (req.user._id.toString() !== req.params.id && req.user.role !== 'admin') {
            // Show limited profile for other users
            const limitedProfile = {
                _id: user._id,
                username: user.username,
                profile: {
                    firstName: user.profile.firstName,
                    lastName: user.profile.lastName,
                    avatar: user.profile.avatar,
                    bio: user.profile.bio
                },
                role: user.role,
                isVerified: user.isVerified
            };
            return res.json({ user: limitedProfile });
        }

        res.json({ user });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

// Update user (admin only)
router.put('/:id', auth, requireRole(['admin']), async (req, res) => {
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

// Delete user (admin only)
router.delete('/:id', auth, requireRole(['admin']), async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// Get user statistics (admin only)
router.get('/stats/overview', auth, requireRole(['admin']), async (req, res) => {
    try {
        const stats = await User.aggregate([
            {
                $group: {
                    _id: '$role',
                    count: { $sum: 1 },
                    activeCount: {
                        $sum: { $cond: ['$isActive', 1, 0] }
                    },
                    verifiedCount: {
                        $sum: { $cond: ['$isVerified', 1, 0] }
                    }
                }
            }
        ]);

        const totalUsers = await User.countDocuments();
        const activeUsers = await User.countDocuments({ isActive: true });

        res.json({
            stats,
            totalUsers,
            activeUsers
        });
    } catch (error) {
        console.error('Get user stats error:', error);
        res.status(500).json({ error: 'Failed to fetch user statistics' });
    }
});

module.exports = router; 