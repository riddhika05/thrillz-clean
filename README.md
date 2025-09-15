# 🌸 Whisper Walls

> *Drop anonymous love notes across real-world spaces*

**Whisper Walls** is a location-based social platform that allows people to leave anonymous, heartfelt messages tied to specific places. Imagine walking past a café and discovering a beautiful note left by a stranger, or leaving your own message for someone to find. We blend digital intimacy with physical spaces to create meaningful connections.

## 📱 Features

### 🔐 Core Functionality
- **Location-Based Messaging**: Drop anonymous "whispers" tied to specific GPS coordinates
- **Real-Time Discovery**: Find nearby whispers from other users in your area
- **Interactive Map**: Explore whispers on an interactive map with location markers
- **Anonymous Connections**: Connect with others through shared messages without revealing identity initially

### 🎨 User Experience
- **Rich Text Editor**: Customize your whispers with colors, fonts, bold/italic styling
- **Image Support**: Attach photos to your whispers for more expressive messaging  
- **Music Integration**: Background music with mute/unmute controls for ambient experience
- **Smooth Animations**: Petal animations, confetti effects, and smooth transitions

### 🛡️ Safety & Moderation
- **Content Filtering**: Built-in profanity filter with customizable trigger words
- **User Blocking**: Block users to prevent unwanted interactions
- **Reporting System**: Report inappropriate content or users with categorized reasons
- **Privacy Controls**: Anonymous posting with optional profile connections

### 🎯 Gamification
- **Points System**: Earn points for posting whispers and engaging with content
- **Milestone Rewards**: Special bonuses for first whisper, 10 whispers, 50 whispers, etc.
- **Unlock Mechanism**: Spend points (2 pts) to unlock location-locked whispers outside your range
- **Achievement Celebrations**: Animated modals and effects for milestones

### 👤 User Profiles
- **Custom Avatars**: Upload profile pictures or use generated defaults
- **Username Generator**: Unique username generation using adjectives + animals
- **Profile Customization**: Edit profile information, trigger words, and preferences
- **User Discovery**: Search and connect with other users in the community

### 💬 Communication
- **Real-Time Chat**: Private messaging between connected users
- **Comment System**: Comment on whispers to start conversations
- **Follow System**: Follow users whose content you enjoy
- **Social Features**: View user profiles, whisper counts, and points

## 🛠️ Tech Stack

### Frontend
- **React** - Modern UI framework
- **React Router** - Client-side routing
- **Framer Motion** - Smooth animations and transitions
- **Tailwind CSS** - Utility-first styling
- **Leaflet** - Interactive maps
- **Lucide React** - Beautiful icons

### Backend
- **Supabase** - Backend-as-a-Service
  - Authentication & User Management
  - PostgreSQL Database
  - Real-time subscriptions
  - File storage for images
  - Row-level security

### APIs & Services
- **Nominatim (OpenStreetMap)** - Reverse geocoding for location names
- **Overpass API** - Nearby places discovery
- **Browser Geolocation API** - User location detection

## 🗄️ Database Schema

### Core Tables
- **users** - User profiles, points, preferences
- **Whispers** - Location-based messages with GPS coordinates
- **messages** - Real-time chat messages
- **chats** - Chat room management
- **Following** - User follow relationships
- **Blocked** - Blocked user relationships
- **unlocked_whispers** - Tracking of point-unlocked whispers

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd whisper-walls
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up Supabase**
   - Create a new project at [supabase.com](https://supabase.com)
   - Copy your project URL and anon key
   - Set up the database schema (see Database Setup section below)

4. **Environment Variables**
   Create a `.env` file in the root directory:
   ```env
   REACT_APP_SUPABASE_URL=your_supabase_project_url
   REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

5. **Configure Supabase Client**
   Update `src/supabaseClient.js` with your credentials:
   ```javascript
   import { createClient } from '@supabase/supabase-js'

   const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
   const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

   export const supabase = createClient(supabaseUrl, supabaseAnonKey)
   ```

6. **Start the development server**
   ```bash
   npm start
   # or
   yarn start
   ```

   The app will open at `http://localhost:3000`

### Database Setup

Run these SQL commands in your Supabase SQL editor:

```sql
-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE Whispers ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

-- Users table
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  gmail TEXT,
  profilepic TEXT,
  Location TEXT,
  points INTEGER DEFAULT 0,
  trigger_words TEXT[],
  profanity_filter BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Whispers table
CREATE TABLE Whispers (
  id BIGSERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  Image_url TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chats table
CREATE TABLE chats (
  id BIGSERIAL PRIMARY KEY,
  user1 UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user2 UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages table
CREATE TABLE messages (
  id BIGSERIAL PRIMARY KEY,
  chat_id BIGINT REFERENCES chats(id) ON DELETE CASCADE,
  sender UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Following relationships
CREATE TABLE Following (
  id BIGSERIAL PRIMARY KEY,
  follower BIGINT REFERENCES users(id) ON DELETE CASCADE,
  following BIGINT REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Blocked users
CREATE TABLE Blocked (
  id BIGSERIAL PRIMARY KEY,
  blocked_by BIGINT REFERENCES users(id) ON DELETE CASCADE,
  blocked BIGINT REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Unlocked whispers (for point system)
CREATE TABLE unlocked_whispers (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  whisper_id BIGINT REFERENCES Whispers(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Storage Setup

Create the following storage buckets in Supabase:
- `avatars` - For user profile pictures
- `Post_images` - For whisper images

Make sure to set appropriate policies for file uploads and access.

## 📁 Project Structure

```
src/
├── assets/           # Images, icons, and static files
├── components/       # Reusable React components
│   ├── heart.jsx    # Heart/like button component
│   └── loader.jsx   # Loading animation component
├── pages/           # Main application pages
│   ├── Chat.jsx     # Real-time messaging
│   ├── EditProfile.jsx # Profile editing
│   ├── Follow.jsx   # User profiles and following
│   ├── Map.jsx      # Interactive map view
│   ├── Newpost.jsx  # Create new whispers
│   ├── Post.jsx     # Main feed
│   ├── Userss.jsx   # User discovery
│   └── Whisper.jsx  # Individual whisper component
├── styles/          # CSS and animation files
├── utils/           # Utility functions
│   └── contentFilter.js # Content filtering logic
├── supabaseClient.js # Supabase configuration
└── App.js          # Main application component
```

## 🎮 How to Use

1. **Sign Up/Login**: Create an account or sign in
2. **Grant Location**: Allow location access for location-based features
3. **Create Whispers**: Write and post messages tied to your current location
4. **Explore**: Use the map to discover whispers near you
5. **Connect**: Follow users and start conversations
6. **Customize**: Edit your profile, set content filters, and personalize your experience
7. **Earn Points**: Get rewards for posting and engaging with content
8. **Unlock Content**: Spend points to access whispers outside your immediate area

## 🔧 Configuration

### Content Filtering
- Enable/disable profanity filter in profile settings
- Add custom trigger words to filter out unwanted content
- Content similarity checking prevents duplicate trigger words

### Privacy Settings
- Anonymous whisper posting
- Optional profile connections
- Block and report features for safety

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Build to Bond Hackathon** - For the inspiring challenge
- **Supabase** - For the excellent backend platform
- **OpenStreetMap** - For location services
- **React Community** - For the amazing ecosystem

## 🐛 Known Issues

- Location accuracy may vary based on device GPS capabilities
- Some map tiles may load slowly on slower connections
- Real-time features require stable internet connection

## 🗺️ Roadmap

- [ ] Push notifications for new whispers nearby
- [ ] Advanced filtering options (date, category, etc.)
- [ ] Whisper categories and tags
- [ ] Enhanced gamification with badges and leaderboards
- [ ] Dark mode support
- [ ] Mobile app development

---

**Built with ❤️ for meaningful connections in physical spaces**
