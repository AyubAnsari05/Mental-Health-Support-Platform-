const express = require('express');
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const router = express.Router();

// Get user's chats
router.get('/', auth, async (req, res) => {
    try {
        const chats = await Chat.find({ 
            participants: req.user._id,
            isActive: true 
        })
        .populate('participants', 'username profile.firstName profile.lastName profile.avatar')
        .populate('lastMessage')
        .sort({ lastMessageTime: -1 });

        res.json({ chats });
    } catch (error) {
        console.error('Get chats error:', error);
        res.status(500).json({ error: 'Failed to fetch chats' });
    }
});

// Get chat by ID with messages
router.get('/:id', auth, async (req, res) => {
    try {
        const chat = await Chat.findById(req.params.id)
            .populate('participants', 'username profile.firstName profile.lastName profile.avatar');

        if (!chat) {
            return res.status(404).json({ error: 'Chat not found' });
        }

        // Check if user is participant
        if (!chat.participants.some(p => p._id.toString() === req.user._id.toString())) {
            return res.status(403).json({ error: 'Not authorized to access this chat' });
        }

        // Get messages
        const messages = await Message.find({ 
            chat: req.params.id,
            isDeleted: false 
        })
        .populate('sender', 'username profile.firstName profile.lastName profile.avatar')
        .sort({ createdAt: 1 });

        // Mark messages as read
        await Message.updateMany(
            { 
                chat: req.params.id, 
                sender: { $ne: req.user._id },
                isRead: false 
            },
            { isRead: true }
        );

        res.json({ chat, messages });
    } catch (error) {
        console.error('Get chat error:', error);
        res.status(500).json({ error: 'Failed to fetch chat' });
    }
});

// Create new chat
router.post('/', auth, async (req, res) => {
    try {
        const { participantId, counsellorId, chatType = 'student-counsellor' } = req.body;
        
        // Determine the participant ID
        const targetId = participantId || counsellorId;
        
        if (!targetId) {
            return res.status(400).json({ error: 'Participant ID or counsellor ID is required' });
        }

        // Check if participant exists
        const participant = await User.findById(targetId);
        if (!participant) {
            return res.status(404).json({ error: 'Participant not found' });
        }

        // Check if chat already exists
        const existingChat = await Chat.findOne({
            participants: { $all: [req.user._id, targetId] },
            chatType,
            isActive: true
        });

        if (existingChat) {
            return res.json({ 
                success: true,
                message: 'Chat already exists',
                chat: existingChat 
            });
        }

        const chat = new Chat({
            participants: [req.user._id, targetId],
            chatType
        });

        await chat.save();

        res.status(201).json({
            success: true,
            message: 'Chat created successfully',
            chat
        });
    } catch (error) {
        console.error('Create chat error:', error);
        res.status(500).json({ error: 'Failed to create chat' });
    }
});

// Send message
router.post('/:id/messages', auth, async (req, res) => {
    try {
        const { content, messageType = 'text', mediaUrl } = req.body;
        const chatId = req.params.id;

        // Check if chat exists and user is participant
        const chat = await Chat.findById(chatId);
        if (!chat) {
            return res.status(404).json({ error: 'Chat not found' });
        }

        if (!chat.participants.some(p => p.toString() === req.user._id.toString())) {
            return res.status(403).json({ error: 'Not authorized to send message in this chat' });
        }

        const message = new Message({
            chat: chatId,
            sender: req.user._id,
            content,
            messageType,
            mediaUrl
        });

        await message.save();

        // Update chat's last message
        chat.lastMessage = message._id;
        chat.lastMessageTime = new Date();
        await chat.save();

        res.status(201).json({
            message: 'Message sent successfully',
            message: message
        });
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// Edit message
router.put('/messages/:messageId', auth, async (req, res) => {
    try {
        const { content } = req.body;
        const message = await Message.findById(req.params.messageId);

        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }

        // Only sender can edit
        if (message.sender.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Not authorized to edit this message' });
        }

        message.content = content;
        message.isEdited = true;
        message.editedAt = new Date();
        await message.save();

        res.json({
            message: 'Message updated successfully',
            message: message
        });
    } catch (error) {
        console.error('Edit message error:', error);
        res.status(500).json({ error: 'Failed to edit message' });
    }
});

// Delete message
router.delete('/messages/:messageId', auth, async (req, res) => {
    try {
        const message = await Message.findById(req.params.messageId);

        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }

        // Only sender can delete
        if (message.sender.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Not authorized to delete this message' });
        }

        message.isDeleted = true;
        await message.save();

        res.json({ message: 'Message deleted successfully' });
    } catch (error) {
        console.error('Delete message error:', error);
        res.status(500).json({ error: 'Failed to delete message' });
    }
});

// Get unread message count
router.get('/unread/count', auth, async (req, res) => {
    try {
        const unreadCount = await Message.countDocuments({
            chat: { $in: await Chat.find({ participants: req.user._id }).distinct('_id') },
            sender: { $ne: req.user._id },
            isRead: false,
            isDeleted: false
        });

        res.json({ unreadCount });
    } catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({ error: 'Failed to get unread count' });
    }
});

// Mark chat as read
router.post('/:id/read', auth, async (req, res) => {
    try {
        await Message.updateMany(
            { 
                chat: req.params.id, 
                sender: { $ne: req.user._id },
                isRead: false 
            },
            { isRead: true }
        );

        res.json({ message: 'Chat marked as read' });
    } catch (error) {
        console.error('Mark as read error:', error);
        res.status(500).json({ error: 'Failed to mark chat as read' });
    }
});

// Get available counsellors for chat
router.get('/counsellors/available', auth, async (req, res) => {
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
        console.error('Get available counsellors error:', error);
        res.status(500).json({ error: 'Failed to fetch counsellors' });
    }
});

module.exports = router; 