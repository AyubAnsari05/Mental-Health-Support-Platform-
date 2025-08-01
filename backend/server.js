const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: './config.env' });

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mental_health_platform', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const resourceRoutes = require('./routes/resources');
const journalRoutes = require('./routes/journal');
const forumRoutes = require('./routes/forum');
const chatRoutes = require('./routes/chat');
const moodRoutes = require('./routes/mood');
const adminRoutes = require('./routes/admin');

// Serve frontend routes first
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/views/index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/views/login.html'));
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/views/signup.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/views/dashboard.html'));
});

app.get('/database-viewer', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/views/database-viewer.html'));
});

// Use API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/journal', journalRoutes);
app.use('/api/forum', forumRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/mood', moodRoutes);
app.use('/api/admin', adminRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler for API routes only
app.use('/api', (req, res) => {
    res.status(404).json({ error: 'API route not found' });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;
