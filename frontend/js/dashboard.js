// Global variables
let currentUser = null;
let currentSection = 'dashboard';
let moodChart = null;
let currentChatId = null;
let availableCounsellors = [];

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    setupEventListeners();
    loadDashboardData();
});

// Check authentication
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login';
        return;
    }

    // Verify token with backend
    fetch('/api/auth/me', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Authentication failed');
        }
        return response.json();
    })
    .then(data => {
        currentUser = data.user;
        updateUserInfo();
        setupRoleBasedAccess();
        loadAvailableCounsellors();
    })
    .catch(error => {
        console.error('Auth error:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
    });
}

// Update user information in UI
function updateUserInfo() {
    if (!currentUser) return;

    const userName = currentUser.profile?.firstName && currentUser.profile?.lastName 
        ? `${currentUser.profile.firstName} ${currentUser.profile.lastName}`
        : currentUser.username;

    document.querySelector('.user-name').textContent = userName;
    document.querySelector('.user-role').textContent = currentUser.role;
    document.querySelector('.header-username').textContent = userName;
}

// Setup role-based access control
function setupRoleBasedAccess() {
    if (!currentUser) return;

    const sidebar = document.querySelector('.nav-menu');
    const allNavItems = sidebar.querySelectorAll('.nav-item');
    
    if (currentUser.role === 'counsellor') {
        // Counsellors only see chat section
        allNavItems.forEach(item => {
            const link = item.querySelector('.nav-link');
            const section = link.getAttribute('href').substring(1);
            
            if (section === 'chat') {
                item.style.display = 'block';
                link.innerHTML = '<i class="fas fa-comment-dots"></i><span>Student Support</span>';
            } else {
                item.style.display = 'none';
            }
        });
        
        // Update page title for counsellors
        document.getElementById('page-title').textContent = 'Student Support';
        
        // Hide admin section
        document.querySelector('.admin-only').style.display = 'none';
        
        // Navigate to chat section by default
        navigateToSection('chat');
    } else if (currentUser.role === 'admin') {
        // Admins see all sections
        allNavItems.forEach(item => item.style.display = 'block');
        document.querySelector('.admin-only').style.display = 'block';
    } else {
        // Students see all sections except admin
        allNavItems.forEach(item => {
            const link = item.querySelector('.nav-link');
            const section = link.getAttribute('href').substring(1);
            
            if (section === 'admin') {
                item.style.display = 'none';
            } else {
                item.style.display = 'block';
            }
        });
        document.querySelector('.admin-only').style.display = 'none';
    }
}

// Load available counsellors for students
function loadAvailableCounsellors() {
    if (currentUser && currentUser.role === 'student') {
        const token = localStorage.getItem('token');
        fetch('/api/users/counsellors', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(response => response.json())
        .then(data => {
            availableCounsellors = data.counsellors || [];
        })
        .catch(error => console.error('Error loading counsellors:', error));
    }
}

// Setup event listeners
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.getAttribute('href').substring(1);
            navigateToSection(section);
        });
    });

    // Quick mood tracking
    document.querySelectorAll('.mood-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const mood = this.getAttribute('data-mood');
            quickMoodTrack(mood);
        });
    });

    // Modal events
    setupModalEvents();

    // Form submissions
    setupFormSubmissions();

    // Intensity slider
    const intensitySlider = document.getElementById('mood-intensity');
    const intensityValue = document.getElementById('intensity-value');
    if (intensitySlider && intensityValue) {
        intensitySlider.addEventListener('input', function() {
            intensityValue.textContent = this.value;
        });
    }

    // Setup message sending for chat
    setupMessageSending();
}

// Navigation
function navigateToSection(section) {
    // Update navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector(`[href="#${section}"]`).classList.add('active');

    // Update content
    document.querySelectorAll('.section').forEach(s => {
        s.classList.remove('active');
    });
    document.getElementById(`${section}-section`).classList.add('active');

    // Update page title
    document.getElementById('page-title').textContent = section.charAt(0).toUpperCase() + section.slice(1);

    currentSection = section;

    // Load section-specific data
    switch(section) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'resources':
            loadResources();
            break;
        case 'journal':
            loadJournalEntries();
            break;
        case 'forum':
            loadForumPosts();
            break;
        case 'chat':
            loadChats();
            break;
        case 'mood':
            loadMoodData();
            break;
        case 'admin':
            loadAdminData();
            break;
    }
}

// Load dashboard data
function loadDashboardData() {
    // Load user stats
    loadUserStats();
    
    // Load recent activity
    loadRecentActivity();
    
    // Load featured resources
    loadFeaturedResources();
}

// Load user statistics
function loadUserStats() {
    const token = localStorage.getItem('token');
    
    // Load journal count
    fetch('/api/journal/my-entries?limit=1', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(response => response.json())
    .then(data => {
        document.getElementById('journal-count').textContent = data.total || 0;
    })
    .catch(error => console.error('Error loading journal count:', error));

    // Load mood streak
    fetch('/api/mood?limit=30', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(response => response.json())
    .then(data => {
        // Calculate streak (simplified)
        const streak = calculateMoodStreak(data.entries);
        document.getElementById('mood-streak').textContent = streak;
    })
    .catch(error => console.error('Error loading mood streak:', error));

    // Load resources read count
    fetch('/api/resources?limit=1', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(response => response.json())
    .then(data => {
        document.getElementById('resources-read').textContent = data.total || 0;
    })
    .catch(error => console.error('Error loading resources count:', error));
}

// Calculate mood streak
function calculateMoodStreak(entries) {
    if (!entries || entries.length === 0) return 0;
    
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < entries.length; i++) {
        const entryDate = new Date(entries[i].createdAt);
        entryDate.setHours(0, 0, 0, 0);
        
        const diffDays = Math.floor((today - entryDate) / (1000 * 60 * 60 * 24));
        
        if (diffDays === streak) {
            streak++;
        } else {
            break;
        }
    }
    
    return streak;
}

// Load recent activity
function loadRecentActivity() {
    const activityList = document.getElementById('recent-activity');
    activityList.innerHTML = '<div class="activity-item"><i class="fas fa-info-circle"></i><span>Loading recent activity...</span></div>';

    // This would typically fetch from a combined activity endpoint
    // For now, we'll show a placeholder
    setTimeout(() => {
        activityList.innerHTML = `
            <div class="activity-item">
                <i class="fas fa-pen"></i>
                <span>You wrote a journal entry</span>
            </div>
            <div class="activity-item">
                <i class="fas fa-chart-line"></i>
                <span>You logged your mood</span>
            </div>
            <div class="activity-item">
                <i class="fas fa-book"></i>
                <span>You read a resource</span>
            </div>
        `;
    }, 1000);
}

// Load featured resources
function loadFeaturedResources() {
    fetch('/api/resources/featured')
    .then(response => response.json())
    .then(data => {
        // Update featured resources if needed
        console.log('Featured resources loaded:', data.resources);
    })
    .catch(error => console.error('Error loading featured resources:', error));
}

// Quick mood tracking
function quickMoodTrack(mood) {
    const token = localStorage.getItem('token');
    
    fetch('/api/mood', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            mood: mood,
            intensity: 5,
            activities: [],
            notes: 'Quick mood check'
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.message) {
            showNotification('Mood logged successfully!', 'success');
            loadUserStats(); // Refresh stats
        }
    })
    .catch(error => {
        console.error('Error logging mood:', error);
        showNotification('Failed to log mood', 'error');
    });
}

// Modal functions
function setupModalEvents() {
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });
}

function showJournalModal() {
    document.getElementById('journal-modal').style.display = 'block';
}

function showForumModal() {
    document.getElementById('forum-modal').style.display = 'block';
}

function showMoodModal() {
    document.getElementById('mood-modal').style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Form submissions
function setupFormSubmissions() {
    // Journal form
    const journalForm = document.getElementById('journal-form');
    if (journalForm) {
        journalForm.addEventListener('submit', function(e) {
            e.preventDefault();
            submitJournalEntry();
        });
    }

    // Forum form
    const forumForm = document.getElementById('forum-form');
    if (forumForm) {
        forumForm.addEventListener('submit', function(e) {
            e.preventDefault();
            submitForumPost();
        });
    }

    // Mood form
    const moodForm = document.getElementById('mood-form');
    if (moodForm) {
        moodForm.addEventListener('submit', function(e) {
            e.preventDefault();
            submitMoodEntry();
        });
    }
}

// Submit journal entry
function submitJournalEntry() {
    const token = localStorage.getItem('token');
    const formData = {
        content: document.getElementById('journal-content').value,
        mood: document.getElementById('journal-mood').value,
        isAnonymous: document.getElementById('journal-anonymous').checked,
        isPublic: document.getElementById('journal-public').checked
    };

    fetch('/api/journal', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.message) {
            showNotification('Journal entry posted successfully!', 'success');
            closeModal('journal-modal');
            document.getElementById('journal-form').reset();
            loadJournalEntries();
        }
    })
    .catch(error => {
        console.error('Error posting journal entry:', error);
        showNotification('Failed to post journal entry', 'error');
    });
}

// Submit forum post
function submitForumPost() {
    const token = localStorage.getItem('token');
    const formData = {
        title: document.getElementById('forum-title').value,
        description: document.getElementById('forum-description').value,
        category: document.getElementById('forum-category').value,
        isAnonymous: document.getElementById('forum-anonymous').checked
    };

    fetch('/api/forum', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.message) {
            showNotification('Forum post created successfully!', 'success');
            closeModal('forum-modal');
            document.getElementById('forum-form').reset();
            loadForumPosts();
        }
    })
    .catch(error => {
        console.error('Error creating forum post:', error);
        showNotification('Failed to create forum post', 'error');
    });
}

// Submit mood entry
function submitMoodEntry() {
    const token = localStorage.getItem('token');
    const activities = Array.from(document.querySelectorAll('#mood-activities input:checked'))
        .map(input => input.value);

    const formData = {
        mood: document.getElementById('mood-type').value,
        intensity: parseInt(document.getElementById('mood-intensity').value),
        activities: activities,
        notes: document.getElementById('mood-notes').value
    };

    fetch('/api/mood', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.message) {
            showNotification('Mood logged successfully!', 'success');
            closeModal('mood-modal');
            document.getElementById('mood-form').reset();
            loadMoodData();
        }
    })
    .catch(error => {
        console.error('Error logging mood:', error);
        showNotification('Failed to log mood', 'error');
    });
}

// Load resources
function loadResources() {
    const container = document.getElementById('resources-container');
    container.innerHTML = '<div class="text-center">Loading resources...</div>';

    const category = document.getElementById('category-filter').value;
    const search = document.getElementById('search-resources').value;

    let url = '/api/resources';
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (search) params.append('search', search);
    if (params.toString()) url += '?' + params.toString();

    fetch(url)
    .then(response => response.json())
    .then(data => {
        displayResources(data.resources);
    })
    .catch(error => {
        console.error('Error loading resources:', error);
        container.innerHTML = '<div class="text-center">Error loading resources</div>';
    });
}

// Display resources
function displayResources(resources) {
    const container = document.getElementById('resources-container');
    
    if (!resources || resources.length === 0) {
        container.innerHTML = '<div class="text-center">No resources found</div>';
        return;
    }

    const resourcesHTML = resources.map(resource => `
        <div class="card resource-card">
            <div class="resource-header">
                <h3>${resource.title}</h3>
                <span class="resource-category">${resource.category}</span>
            </div>
            <p>${resource.description}</p>
            <div class="resource-meta">
                <span><i class="fas fa-eye"></i> ${resource.views}</span>
                <span><i class="fas fa-heart"></i> ${resource.likes}</span>
                <span><i class="fas fa-clock"></i> ${resource.readingTime} min</span>
            </div>
            <button class="btn primary" onclick="viewResource('${resource._id}')">Read More</button>
        </div>
    `).join('');

    container.innerHTML = resourcesHTML;
}

// Load journal entries
function loadJournalEntries() {
    const container = document.getElementById('journal-container');
    container.innerHTML = '<div class="text-center">Loading journal entries...</div>';

    const token = localStorage.getItem('token');
    fetch('/api/journal/my-entries', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(response => response.json())
    .then(data => {
        displayJournalEntries(data.entries);
    })
    .catch(error => {
        console.error('Error loading journal entries:', error);
        container.innerHTML = '<div class="text-center">Error loading journal entries</div>';
    });
}

// Display journal entries
function displayJournalEntries(entries) {
    const container = document.getElementById('journal-container');
    
    if (!entries || entries.length === 0) {
        container.innerHTML = '<div class="text-center">No journal entries yet</div>';
        return;
    }

    const entriesHTML = entries.map(entry => `
        <div class="card journal-entry">
            <div class="entry-header">
                <span class="mood-emoji">${getMoodEmoji(entry.mood)}</span>
                <span class="entry-date">${new Date(entry.createdAt).toLocaleDateString()}</span>
            </div>
            <p>${entry.content}</p>
            <div class="entry-actions">
                <button class="btn small" onclick="editJournalEntry('${entry._id}')">Edit</button>
                <button class="btn small secondary" onclick="deleteJournalEntry('${entry._id}')">Delete</button>
            </div>
        </div>
    `).join('');

    container.innerHTML = entriesHTML;
}

// Load forum posts
function loadForumPosts() {
    const container = document.getElementById('forum-container');
    container.innerHTML = '<div class="text-center">Loading forum posts...</div>';

    fetch('/api/forum')
    .then(response => response.json())
    .then(data => {
        displayForumPosts(data.posts);
    })
    .catch(error => {
        console.error('Error loading forum posts:', error);
        container.innerHTML = '<div class="text-center">Error loading forum posts</div>';
    });
}

// Display forum posts
function displayForumPosts(posts) {
    const container = document.getElementById('forum-container');
    
    if (!posts || posts.length === 0) {
        container.innerHTML = '<div class="text-center">No forum posts yet</div>';
        return;
    }

    const postsHTML = posts.map(post => `
        <div class="card forum-post">
            <div class="post-header">
                <h3>${post.title}</h3>
                <span class="post-category">${post.category}</span>
            </div>
            <p>${post.description}</p>
            <div class="post-meta">
                <span><i class="fas fa-eye"></i> ${post.views}</span>
                <span><i class="fas fa-thumbs-up"></i> ${post.upvotes.length}</span>
                <span><i class="fas fa-comment"></i> ${post.replies?.length || 0}</span>
                <span class="post-date">${new Date(post.createdAt).toLocaleDateString()}</span>
            </div>
            <button class="btn primary" onclick="viewForumPost('${post._id}')">View Discussion</button>
        </div>
    `).join('');

    container.innerHTML = postsHTML;
}

// Load chats
function loadChats() {
    const token = localStorage.getItem('token');
    const chatList = document.getElementById('chat-list');
    
    chatList.innerHTML = '<div class="text-center">Loading chats...</div>';

    fetch('/api/chat', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(response => response.json())
    .then(data => {
        displayChats(data.chats);
    })
    .catch(error => {
        console.error('Error loading chats:', error);
        chatList.innerHTML = '<div class="text-center">Error loading chats</div>';
    });
}

// Display chats
function displayChats(chats) {
    const chatList = document.getElementById('chat-list');
    
    if (!chats || chats.length === 0) {
        if (currentUser.role === 'counsellor') {
            chatList.innerHTML = '<div class="text-center">No student conversations yet</div>';
        } else {
            chatList.innerHTML = '<div class="text-center">No conversations yet</div>';
        }
        return;
    }

    const chatsHTML = chats.map(chat => `
        <div class="chat-item" onclick="loadChat('${chat._id}')">
            <div class="chat-info">
                <h4>${getChatTitle(chat)}</h4>
                <p>${chat.lastMessage?.content || 'No messages yet'}</p>
            </div>
            <span class="chat-time">${formatTime(chat.lastMessageTime)}</span>
        </div>
    `).join('');

    chatList.innerHTML = chatsHTML;
}

// Load mood data
function loadMoodData() {
    const token = localStorage.getItem('token');
    
    // Load today's mood
    fetch('/api/mood/today', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(response => response.json())
    .then(data => {
        displayTodayMood(data.entry);
    })
    .catch(error => console.error('Error loading today\'s mood:', error));

    // Load mood statistics
    fetch('/api/mood/stats/overview', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(response => response.json())
    .then(data => {
        displayMoodStats(data.stats);
        createMoodChart(data.intensityTrend);
    })
    .catch(error => console.error('Error loading mood stats:', error));

    // Load mood history
    fetch('/api/mood', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(response => response.json())
    .then(data => {
        displayMoodHistory(data.entries);
    })
    .catch(error => console.error('Error loading mood history:', error));
}

// Display today's mood
function displayTodayMood(entry) {
    const todayMood = document.getElementById('today-mood');
    
    if (entry) {
        todayMood.innerHTML = `
            <div class="mood-display">
                <span class="mood-emoji-large">${getMoodEmoji(entry.mood)}</span>
                <div class="mood-details">
                    <h4>${entry.mood}</h4>
                    <p>Intensity: ${entry.intensity}/10</p>
                </div>
            </div>
        `;
    } else {
        todayMood.innerHTML = '<span>No mood logged today</span>';
    }
}

// Display mood statistics
function displayMoodStats(stats) {
    const moodStats = document.getElementById('mood-stats');
    
    if (!stats || stats.length === 0) {
        moodStats.innerHTML = '<p>No mood data available</p>';
        return;
    }

    const statsHTML = stats.map(stat => `
        <div class="stat-item">
            <span class="stat-number">${stat.count}</span>
            <span class="stat-label">${stat._id}</span>
        </div>
    `).join('');

    moodStats.innerHTML = statsHTML;
}

// Create mood chart
function createMoodChart(trendData) {
    const ctx = document.getElementById('mood-chart');
    if (!ctx) return;

    if (moodChart) {
        moodChart.destroy();
    }

    const labels = trendData.map(item => item._id);
    const data = trendData.map(item => item.avgIntensity);

    moodChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Average Mood Intensity',
                data: data,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 10
                }
            }
        }
    });
}

// Display mood history
function displayMoodHistory(entries) {
    const moodEntries = document.getElementById('mood-entries');
    
    if (!entries || entries.length === 0) {
        moodEntries.innerHTML = '<p>No mood history available</p>';
        return;
    }

    const entriesHTML = entries.map(entry => `
        <div class="mood-entry">
            <div class="mood-entry-header">
                <span class="mood-emoji">${getMoodEmoji(entry.mood)}</span>
                <span class="entry-date">${new Date(entry.createdAt).toLocaleDateString()}</span>
            </div>
            <div class="mood-entry-details">
                <p><strong>Mood:</strong> ${entry.mood}</p>
                <p><strong>Intensity:</strong> ${entry.intensity}/10</p>
                ${entry.notes ? `<p><strong>Notes:</strong> ${entry.notes}</p>` : ''}
            </div>
        </div>
    `).join('');

    moodEntries.innerHTML = entriesHTML;
}

// Load admin data
function loadAdminData() {
    if (currentUser?.role !== 'admin') return;

    const token = localStorage.getItem('token');
    
    fetch('/api/admin/dashboard', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(response => response.json())
    .then(data => {
        displayAdminData(data);
    })
    .catch(error => console.error('Error loading admin data:', error));
}

// Display admin data
function displayAdminData(data) {
    // Update admin statistics
    if (data.userStats) {
        const totalUsers = data.userStats.reduce((sum, stat) => sum + stat.count, 0);
        const activeUsers = data.userStats.reduce((sum, stat) => sum + stat.activeCount, 0);
        
        document.getElementById('total-users').textContent = totalUsers;
        document.getElementById('active-users').textContent = activeUsers;
    }

    if (data.flaggedContent) {
        document.getElementById('flagged-journals').textContent = data.flaggedContent.journals;
        document.getElementById('flagged-forums').textContent = data.flaggedContent.forums;
    }

    if (data.resourceStats) {
        const totalResources = data.resourceStats.reduce((sum, stat) => sum + stat.count, 0);
        const totalViews = data.resourceStats.reduce((sum, stat) => sum + stat.totalViews, 0);
        
        document.getElementById('total-resources').textContent = totalResources;
        document.getElementById('total-views').textContent = totalViews;
    }
}

// Utility functions
function getMoodEmoji(mood) {
    const emojiMap = {
        'very-happy': '😊',
        'happy': '🙂',
        'neutral': '😐',
        'sad': '😔',
        'very-sad': '😢',
        'anxious': '😰',
        'stressed': '😤',
        'excited': '🤩',
        'calm': '😌',
        'angry': '😠',
        'frustrated': '😤'
    };
    return emojiMap[mood] || '😐';
}

function getChatTitle(chat) {
    if (chat.participants && chat.participants.length > 0) {
        const otherParticipants = chat.participants.filter(p => p._id !== currentUser._id);
        if (otherParticipants.length > 0) {
            return otherParticipants[0].profile?.firstName 
                ? `${otherParticipants[0].profile.firstName} ${otherParticipants[0].profile.lastName}`
                : otherParticipants[0].username;
        }
    }
    return 'Unknown User';
}

function formatTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
        return 'Today';
    } else if (diffDays === 1) {
        return 'Yesterday';
    } else {
        return date.toLocaleDateString();
    }
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 6px;
        color: white;
        z-index: 10000;
        background: ${type === 'success' ? '#48bb78' : type === 'error' ? '#f56565' : '#4299e1'};
    `;

    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Navigation helper
function navigateTo(section) {
    navigateToSection(section);
}

// Logout function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
}

// Placeholder functions for future implementation
function viewResource(id) {
    showNotification('Resource viewer coming soon!', 'info');
}

function editJournalEntry(id) {
    showNotification('Edit functionality coming soon!', 'info');
}

function deleteJournalEntry(id) {
    if (confirm('Are you sure you want to delete this entry?')) {
        const token = localStorage.getItem('token');
        fetch(`/api/journal/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(response => response.json())
        .then(data => {
            showNotification('Entry deleted successfully!', 'success');
            loadJournalEntries();
        })
        .catch(error => {
            console.error('Error deleting entry:', error);
            showNotification('Failed to delete entry', 'error');
        });
    }
}

function viewForumPost(id) {
    showNotification('Forum post viewer coming soon!', 'info');
}

function loadChat(id) {
    currentChatId = id;
    const token = localStorage.getItem('token');
    
    // Show chat messages area
    document.getElementById('chat-placeholder').style.display = 'none';
    document.getElementById('chat-messages').style.display = 'block';
    
    // Load chat details and messages
    fetch(`/api/chat/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            displayChat(data.chat);
            loadChatMessages(id);
        } else {
            showNotification(data.error || 'Failed to load chat', 'error');
        }
    })
    .catch(error => {
        console.error('Error loading chat:', error);
        showNotification('Failed to load chat', 'error');
    });
}

function displayChat(chat) {
    const chatTitle = document.getElementById('chat-title');
    chatTitle.textContent = getChatTitle(chat);
}

function loadChatMessages(chatId) {
    const token = localStorage.getItem('token');
    const messagesContainer = document.getElementById('messages-container');
    
    messagesContainer.innerHTML = '<div class="text-center">Loading messages...</div>';
    
    fetch(`/api/chat/${chatId}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(response => response.json())
    .then(data => {
        displayChatMessages(data.messages);
    })
    .catch(error => {
        console.error('Error loading messages:', error);
        messagesContainer.innerHTML = '<div class="text-center">Error loading messages</div>';
    });
}

function displayChatMessages(messages) {
    const messagesContainer = document.getElementById('messages-container');
    
    if (!messages || messages.length === 0) {
        messagesContainer.innerHTML = '<div class="text-center">No messages yet</div>';
        return;
    }
    
    const messagesHTML = messages.map(message => `
        <div class="message ${message.sender === currentUser._id ? 'sent' : 'received'}">
            <div class="message-content">
                <p>${message.content}</p>
                <span class="message-time">${formatTime(message.createdAt)}</span>
            </div>
        </div>
    `).join('');
    
    messagesContainer.innerHTML = messagesHTML;
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Setup message sending
function setupMessageSending() {
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-message-btn');
    
    if (messageInput && sendButton) {
        sendButton.addEventListener('click', sendMessage);
        messageInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }
}

function sendMessage() {
    if (!currentChatId) return;
    
    const messageInput = document.getElementById('message-input');
    const message = messageInput.value.trim();
    
    if (!message) return;
    
    const token = localStorage.getItem('token');
    
    fetch(`/api/chat/${currentChatId}/messages`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: message })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            messageInput.value = '';
            loadChatMessages(currentChatId);
            loadChats(); // Refresh chat list to update last message
        } else {
            showNotification(data.error || 'Failed to send message', 'error');
        }
    })
    .catch(error => {
        console.error('Error sending message:', error);
        showNotification('Failed to send message', 'error');
    });
}

function showNewChatModal() {
    if (currentUser.role === 'student') {
        showCounsellorSelectionModal();
    } else {
        showNotification('Counsellors cannot initiate new chats', 'info');
    }
}

function showCounsellorSelectionModal() {
    // Create modal for counsellor selection
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'counsellor-modal';
    
    const counsellorsHTML = availableCounsellors.length > 0 
        ? availableCounsellors.map(counsellor => `
            <div class="counsellor-item" onclick="startChatWithCounsellor('${counsellor._id}')">
                <div class="counsellor-info">
                    <h4>${counsellor.profile?.firstName || counsellor.username}</h4>
                    <p>${counsellor.profile?.specialization || 'General Counsellor'}</p>
                </div>
                <button class="btn small primary">Start Chat</button>
            </div>
        `).join('')
        : '<div class="text-center">No counsellors available at the moment</div>';
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Select a Counsellor</h3>
                <span class="close" onclick="closeModal('counsellor-modal')">&times;</span>
            </div>
            <div class="counsellors-list">
                ${counsellorsHTML}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'block';
}

function startChatWithCounsellor(counsellorId) {
    const token = localStorage.getItem('token');
    
    fetch('/api/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            counsellorId: counsellorId,
            type: 'student-counsellor'
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            closeModal('counsellor-modal');
            showNotification('Chat started successfully!', 'success');
            loadChats();
            loadChat(data.chat._id);
        } else {
            showNotification(data.error || 'Failed to start chat', 'error');
        }
    })
    .catch(error => {
        console.error('Error starting chat:', error);
        showNotification('Failed to start chat', 'error');
    });
}

function loadUserManagement() {
    showNotification('User management coming soon!', 'info');
}

function loadModeration() {
    showNotification('Content moderation coming soon!', 'info');
}

function loadAnalytics() {
    showNotification('Analytics coming soon!', 'info');
} 