# Mental Health Support Platform

A comprehensive full-stack web application designed to provide mental health support for students, featuring anonymous journaling, peer support forums, professional counselling, and mood tracking.

## 🌟 Features

### Core Modules

1. **User Authentication**
   - Secure sign up/login for students, counsellors, and admins
   - JWT-based authentication
   - Role-based access control

2. **Resource Hub**
   - Curated mental health articles, videos, and guides
   - Categories: stress management, anxiety, motivation, etc.
   - Admin content management system

3. **Anonymous Journaling/Feelings Wall**
   - Students can write about their mood and experiences
   - Anonymous posts on shared dashboard
   - Positive-only reactions and comments

4. **Peer Support Forum**
   - Create/join group discussions on various topics
   - Community-led moderation features
   - Upvote/downvote system

5. **Chat with Counsellors**
   - Private, confidential chat interface
   - Real-time messaging
   - Optional chatbot support

6. **Mood Tracker Dashboard**
   - Daily mood logs with emoji sliders
   - Visualize mood trends over time
   - Activity and stress level tracking

7. **Admin Dashboard**
   - User and content management
   - Moderation tools for flagged content
   - Analytics and engagement metrics

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB Atlas account
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Mental_health
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Set up environment variables**
   - Copy `config.env.example` to `config.env`
   - Update MongoDB connection string and JWT secret

4. **Start the backend server**
   ```bash
   npm run dev
   ```

5. **Open the frontend**
   - Navigate to `frontend/views/index.html` in your browser
   - Or serve the frontend using a local server

## 🛠️ Technology Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **Socket.io** - Real-time communication

### Frontend
- **HTML5** - Structure
- **CSS3** - Styling
- **JavaScript** - Interactivity
- **Chart.js** - Data visualization

## 📁 Project Structure

```
Mental_health/
├── backend/
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   ├── middleware/      # Authentication middleware
│   ├── server.js        # Main server file
│   └── package.json     # Backend dependencies
├── frontend/
│   ├── views/           # HTML pages
│   ├── css/            # Stylesheets
│   ├── js/             # JavaScript files
│   └── images/         # Static assets
└── README.md
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile

### Resources
- `GET /api/resources` - Get all resources
- `POST /api/resources` - Create resource (admin/counsellor)
- `GET /api/resources/:id` - Get specific resource

### Journal
- `GET /api/journal/public` - Get public entries
- `POST /api/journal` - Create journal entry
- `GET /api/journal/my-entries` - Get user's entries

### Forum
- `GET /api/forum` - Get forum posts
- `POST /api/forum` - Create forum post
- `POST /api/forum/:id/reply` - Add reply

### Chat
- `GET /api/chat` - Get user's chats
- `POST /api/chat` - Create new chat
- `POST /api/chat/:id/messages` - Send message

### Mood Tracking
- `GET /api/mood` - Get mood entries
- `POST /api/mood` - Create mood entry
- `GET /api/mood/stats/overview` - Get mood statistics

### Admin
- `GET /api/admin/dashboard` - Admin dashboard
- `GET /api/admin/moderation/flagged` - Get flagged content
- `PUT /api/admin/moderation/:type/:id` - Moderate content

## 🔐 Environment Variables

Create a `config.env` file in the backend directory:

```env
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=7d
PORT=3000
NODE_ENV=development
```

## 🎯 Usage

1. **For Students:**
   - Register/login to access the platform
   - Browse mental health resources
   - Share feelings anonymously on the feelings wall
   - Participate in peer support forums
   - Chat with verified counsellors
   - Track daily mood and mental health

2. **For Counsellors:**
   - Access student chat requests
   - Provide professional support
   - Create and manage resources
   - Monitor student engagement

3. **For Admins:**
   - Manage users and content
   - Moderate flagged posts
   - View analytics and engagement metrics
   - Oversee platform operations

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control
- Input validation and sanitization
- CORS protection
- Rate limiting

## 📊 Database Models

- **User** - User accounts and profiles
- **Resource** - Mental health articles and guides
- **Journal** - Anonymous journal entries
- **Forum** - Discussion posts
- **ForumReply** - Forum replies
- **Chat** - Chat sessions
- **Message** - Chat messages
- **Mood** - Mood tracking entries

## 🚀 Deployment

### Backend Deployment
1. Set up environment variables
2. Install dependencies: `npm install`
3. Start server: `npm start`

### Frontend Deployment
- Serve static files from `frontend/` directory
- Configure API endpoints to point to backend

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team

## 🔮 Future Enhancements

1. **Emergency Helpline Integration**
2. **AI-Powered Emotion Detection**
3. **Mindfulness & Meditation Toolkit**
4. **Customizable Self-Care Planner**
5. **Gamification for Positivity**
6. **Offline Access Mode**
7. **Language Localization**
8. **Mood-Based UI Themes**
9. **Event Calendar**
10. **Anonymous Buddy Match**

---

**Built with ❤️ for mental health support** 