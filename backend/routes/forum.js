const express = require('express');
const Forum = require('../models/Forum');
const ForumReply = require('../models/ForumReply');
const { auth, optionalAuth } = require('../middleware/auth');
const router = express.Router();

// Get all forum posts
router.get('/', optionalAuth, async (req, res) => {
    try {
        const { 
            category, 
            search, 
            page = 1, 
            limit = 20,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        const query = { isModerated: false };
        
        if (category) query.category = category;
        
        if (search) {
            query.$text = { $search: search };
        }

        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

        const posts = await Forum.find(query)
            .populate('author', 'username profile.firstName profile.lastName')
            .sort(sortOptions)
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();

        const total = await Forum.countDocuments(query);

        res.json({
            posts,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        console.error('Get forum posts error:', error);
        res.status(500).json({ error: 'Failed to fetch forum posts' });
    }
});

// Get pinned posts
router.get('/pinned', optionalAuth, async (req, res) => {
    try {
        const pinnedPosts = await Forum.find({ 
            isPinned: true, 
            isModerated: false 
        })
        .populate('author', 'username profile.firstName profile.lastName')
        .sort({ createdAt: -1 })
        .limit(5);

        res.json({ posts: pinnedPosts });
    } catch (error) {
        console.error('Get pinned posts error:', error);
        res.status(500).json({ error: 'Failed to fetch pinned posts' });
    }
});

// Get forum post by ID with replies
router.get('/:id', optionalAuth, async (req, res) => {
    try {
        const post = await Forum.findById(req.params.id)
            .populate('author', 'username profile.firstName profile.lastName');

        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        // Increment views
        post.views += 1;
        await post.save();

        // Get replies
        const replies = await ForumReply.find({ forum: req.params.id })
            .populate('author', 'username profile.firstName profile.lastName')
            .populate('parentReply')
            .sort({ createdAt: 1 });

        res.json({ post, replies });
    } catch (error) {
        console.error('Get forum post error:', error);
        res.status(500).json({ error: 'Failed to fetch forum post' });
    }
});

// Create new forum post
router.post('/', auth, async (req, res) => {
    try {
        const { title, description, category, isAnonymous = true, tags } = req.body;

        const post = new Forum({
            title,
            description,
            category,
            author: req.user._id,
            isAnonymous,
            tags
        });

        await post.save();

        res.status(201).json({
            message: 'Forum post created successfully',
            post
        });
    } catch (error) {
        console.error('Create forum post error:', error);
        res.status(500).json({ error: 'Failed to create forum post' });
    }
});

// Update forum post
router.put('/:id', auth, async (req, res) => {
    try {
        const post = await Forum.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        // Only author can edit
        if (post.author.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Not authorized to edit this post' });
        }

        const updatedPost = await Forum.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        res.json({
            message: 'Post updated successfully',
            post: updatedPost
        });
    } catch (error) {
        console.error('Update forum post error:', error);
        res.status(500).json({ error: 'Failed to update forum post' });
    }
});

// Delete forum post
router.delete('/:id', auth, async (req, res) => {
    try {
        const post = await Forum.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        // Only author or admin can delete
        if (post.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized to delete this post' });
        }

        // Delete all replies first
        await ForumReply.deleteMany({ forum: req.params.id });
        
        // Delete the post
        await Forum.findByIdAndDelete(req.params.id);

        res.json({ message: 'Post deleted successfully' });
    } catch (error) {
        console.error('Delete forum post error:', error);
        res.status(500).json({ error: 'Failed to delete forum post' });
    }
});

// Add reply to forum post
router.post('/:id/reply', auth, async (req, res) => {
    try {
        const { content, isAnonymous = true, parentReply } = req.body;

        const reply = new ForumReply({
            forum: req.params.id,
            author: req.user._id,
            content,
            isAnonymous,
            parentReply
        });

        await reply.save();

        res.status(201).json({
            message: 'Reply added successfully',
            reply
        });
    } catch (error) {
        console.error('Add reply error:', error);
        res.status(500).json({ error: 'Failed to add reply' });
    }
});

// Vote on forum post
router.post('/:id/vote', auth, async (req, res) => {
    try {
        const { voteType } = req.body; // 'upvote' or 'downvote'
        const post = await Forum.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        const userId = req.user._id.toString();

        if (voteType === 'upvote') {
            // Remove from downvotes if exists
            post.downvotes = post.downvotes.filter(id => id.toString() !== userId);
            
            // Toggle upvote
            const hasUpvoted = post.upvotes.some(id => id.toString() === userId);
            if (hasUpvoted) {
                post.upvotes = post.upvotes.filter(id => id.toString() !== userId);
            } else {
                post.upvotes.push(req.user._id);
            }
        } else if (voteType === 'downvote') {
            // Remove from upvotes if exists
            post.upvotes = post.upvotes.filter(id => id.toString() !== userId);
            
            // Toggle downvote
            const hasDownvoted = post.downvotes.some(id => id.toString() === userId);
            if (hasDownvoted) {
                post.downvotes = post.downvotes.filter(id => id.toString() !== userId);
            } else {
                post.downvotes.push(req.user._id);
            }
        }

        await post.save();

        res.json({
            message: 'Vote recorded',
            upvotes: post.upvotes.length,
            downvotes: post.downvotes.length
        });
    } catch (error) {
        console.error('Vote error:', error);
        res.status(500).json({ error: 'Failed to record vote' });
    }
});

// Flag forum post
router.post('/:id/flag', auth, async (req, res) => {
    try {
        const { reason } = req.body;
        const post = await Forum.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        post.isFlagged = true;
        post.flagReason = reason;
        await post.save();

        res.json({ message: 'Post flagged for moderation' });
    } catch (error) {
        console.error('Flag post error:', error);
        res.status(500).json({ error: 'Failed to flag post' });
    }
});

// Get forum categories
router.get('/categories/list', async (req, res) => {
    try {
        const categories = await Forum.distinct('category');
        res.json({ categories });
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

module.exports = router; 