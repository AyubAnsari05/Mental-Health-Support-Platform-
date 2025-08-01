const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const router = express.Router();

// Generate JWT Token
const generateToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE
    });
};

// Register new user
router.post('/register', async (req, res) => {
    try {
        const { username, email, password, role = 'student', profile } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({
            $or: [{ email }, { username }]
        });

        if (existingUser) {
            return res.status(400).json({
                error: 'User with this email or username already exists'
            });
        }

        // Create new user
        const user = new User({
            username,
            email,
            password,
            role,
            profile
        });

        await user.save();

        // Generate token
        const token = generateToken(user._id);

        res.status(201).json({
            message: 'User registered successfully',
            user: user.toJSON(),
            token
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            error: 'Registration failed. Please try again.'
        });
    }
});

// Login user
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user by email
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({
                error: 'Invalid email or password'
            });
        }

        // Check if account is active
        if (!user.isActive) {
            return res.status(401).json({
                error: 'Account is deactivated. Please contact support.'
            });
        }

        // Verify password
        const isPasswordValid = await user.comparePassword(password);

        if (!isPasswordValid) {
            return res.status(401).json({
                error: 'Invalid email or password'
            });
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Generate token
        const token = generateToken(user._id);

        res.json({
            message: 'Login successful',
            user: user.toJSON(),
            token
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            error: 'Login failed. Please try again.'
        });
    }
});

// Get current user profile
router.get('/me', auth, async (req, res) => {
    try {
        res.json({
            user: req.user.toJSON()
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            error: 'Failed to get profile'
        });
    }
});

// Update user profile
router.put('/profile', auth, async (req, res) => {
    try {
        const { profile, preferences } = req.body;
        const updates = {};

        if (profile) {
            updates.profile = { ...req.user.profile, ...profile };
        }

        if (preferences) {
            updates.preferences = { ...req.user.preferences, ...preferences };
        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            updates,
            { new: true, runValidators: true }
        );

        res.json({
            message: 'Profile updated successfully',
            user: user.toJSON()
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            error: 'Failed to update profile'
        });
    }
});

// Change password
router.put('/change-password', auth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        // Verify current password
        const isPasswordValid = await req.user.comparePassword(currentPassword);

        if (!isPasswordValid) {
            return res.status(400).json({
                error: 'Current password is incorrect'
            });
        }

        // Update password
        req.user.password = newPassword;
        await req.user.save();

        res.json({
            message: 'Password changed successfully'
        });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            error: 'Failed to change password'
        });
    }
});

// Logout (client-side token removal)
router.post('/logout', auth, async (req, res) => {
    try {
        res.json({
            message: 'Logged out successfully'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            error: 'Logout failed'
        });
    }
});

// Refresh token
router.post('/refresh', auth, async (req, res) => {
    try {
        const token = generateToken(req.user._id);
        
        res.json({
            token
        });
    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(500).json({
            error: 'Token refresh failed'
        });
    }
});

module.exports = router; 