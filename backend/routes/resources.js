const express = require('express');
const Resource = require('../models/Resource');
const { auth, requireRole, optionalAuth } = require('../middleware/auth');
const router = express.Router();

// Get all published resources with filtering
router.get('/', optionalAuth, async (req, res) => {
    try {
        const { 
            category, 
            type, 
            search, 
            difficulty, 
            page = 1, 
            limit = 10,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        const query = { isPublished: true };
        
        if (category) query.category = category;
        if (type) query.type = type;
        if (difficulty) query.difficulty = difficulty;
        
        if (search) {
            query.$text = { $search: search };
        }

        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

        const resources = await Resource.find(query)
            .populate('author', 'username profile.firstName profile.lastName')
            .sort(sortOptions)
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

// Get featured resources
router.get('/featured', optionalAuth, async (req, res) => {
    try {
        const resources = await Resource.find({ 
            isPublished: true, 
            isFeatured: true 
        })
        .populate('author', 'username profile.firstName profile.lastName')
        .sort({ createdAt: -1 })
        .limit(6);

        res.json({ resources });
    } catch (error) {
        console.error('Get featured resources error:', error);
        res.status(500).json({ error: 'Failed to fetch featured resources' });
    }
});

// Get resource by ID
router.get('/:id', optionalAuth, async (req, res) => {
    try {
        const resource = await Resource.findById(req.params.id)
            .populate('author', 'username profile.firstName profile.lastName');

        if (!resource) {
            return res.status(404).json({ error: 'Resource not found' });
        }

        if (!resource.isPublished && (!req.user || req.user.role !== 'admin')) {
            return res.status(404).json({ error: 'Resource not found' });
        }

        // Increment views
        resource.views += 1;
        await resource.save();

        res.json({ resource });
    } catch (error) {
        console.error('Get resource error:', error);
        res.status(500).json({ error: 'Failed to fetch resource' });
    }
});

// Create new resource (admin/counsellor only)
router.post('/', auth, requireRole(['admin', 'counsellor']), async (req, res) => {
    try {
        const resource = new Resource({
            ...req.body,
            author: req.user._id
        });

        await resource.save();

        res.status(201).json({
            message: 'Resource created successfully',
            resource
        });
    } catch (error) {
        console.error('Create resource error:', error);
        res.status(500).json({ error: 'Failed to create resource' });
    }
});

// Update resource (admin/counsellor only)
router.put('/:id', auth, requireRole(['admin', 'counsellor']), async (req, res) => {
    try {
        const resource = await Resource.findById(req.params.id);

        if (!resource) {
            return res.status(404).json({ error: 'Resource not found' });
        }

        // Only author or admin can edit
        if (resource.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized to edit this resource' });
        }

        const updatedResource = await Resource.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        res.json({
            message: 'Resource updated successfully',
            resource: updatedResource
        });
    } catch (error) {
        console.error('Update resource error:', error);
        res.status(500).json({ error: 'Failed to update resource' });
    }
});

// Delete resource (admin only)
router.delete('/:id', auth, requireRole(['admin']), async (req, res) => {
    try {
        const resource = await Resource.findByIdAndDelete(req.params.id);

        if (!resource) {
            return res.status(404).json({ error: 'Resource not found' });
        }

        res.json({ message: 'Resource deleted successfully' });
    } catch (error) {
        console.error('Delete resource error:', error);
        res.status(500).json({ error: 'Failed to delete resource' });
    }
});

// Like/unlike resource
router.post('/:id/like', auth, async (req, res) => {
    try {
        const resource = await Resource.findById(req.params.id);

        if (!resource) {
            return res.status(404).json({ error: 'Resource not found' });
        }

        // Toggle like
        const userLiked = resource.likes.includes(req.user._id);
        
        if (userLiked) {
            resource.likes = resource.likes.filter(id => id.toString() !== req.user._id.toString());
        } else {
            resource.likes.push(req.user._id);
        }

        await resource.save();

        res.json({
            message: userLiked ? 'Resource unliked' : 'Resource liked',
            likes: resource.likes.length
        });
    } catch (error) {
        console.error('Like resource error:', error);
        res.status(500).json({ error: 'Failed to like resource' });
    }
});

// Get resource categories
router.get('/categories/list', async (req, res) => {
    try {
        const categories = await Resource.distinct('category');
        res.json({ categories });
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

module.exports = router; 