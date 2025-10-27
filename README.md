# MERN Stack Project & Task Manager

A comprehensive, full-stack task and project management application built with the MERN stack, featuring real-time collaboration, Kanban boards, analytics, and modern UI/UX.

## 🚀 Features

### Core Functionality
- **User Authentication** - Secure JWT-based authentication with bcrypt password hashing
- **UI Preference Selection** - Choose between Simple or Complex dashboard layouts
- **First-Time User Onboarding** - Guided flow for creating first project and task
- **Project Management** - Full CRUD operations for projects
- **Task Management** - Complete task lifecycle with status tracking
- **Kanban Board** - Drag-and-drop interface with three status columns (To Do, In Progress, Completed)
- **Interactive Calendar** - Timeline view with weekly task visualization
- **Real-Time Messaging** - Socket.IO powered project-level chat system
- **Analytics Dashboard** - Comprehensive reports with charts and project health metrics
- **Responsive Design** - Mobile-friendly interface

### Technical Highlights
- **React Context API** - Global state management
- **Socket.IO** - Real-time bidirectional communication
- **React Beautiful DnD** - Smooth drag-and-drop functionality
- **Recharts** - Data visualization with charts
- **Date-fns** - Modern date manipulation
- **RESTful API** - Well-structured backend endpoints
- **MongoDB with Mongoose** - Flexible NoSQL database with ODM
- **Express.js Middleware** - Authentication, error handling, and validation

## 📋 Prerequisites

Before running this application, ensure you have:

- **Node.js** (v14 or higher) - [Download](https://nodejs.org/)
- **MongoDB** (v4.4 or higher) - [Download](https://www.mongodb.com/try/download/community)
- **npm** or **yarn** package manager
- **Git** (for cloning the repository)

## 🛠️ Installation & Setup

### 1. Clone or Navigate to the Project

```bash
cd C:\mern-task-manager
```

### 2. Install Backend Dependencies

```bash
cd server
npm install
```

### 3. Install Frontend Dependencies

```bash
cd ../client
npm install
```

Alternatively, install all dependencies at once from the root:

```bash
npm run install-all
```

### 4. Set Up Environment Variables

#### Backend (.env)

Create a `.env` file in the `server` directory:

```bash
cd server
cp .env.example .env
```

Edit `server/.env` with your configuration:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/mern-task-manager
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRE=7d
CLIENT_URL=http://localhost:3000
```

**Important:** Change `JWT_SECRET` to a strong, unique string in production!

#### Frontend (.env)

Create a `.env` file in the `client` directory:

```bash
cd client
cp .env.example .env
```

Content of `client/.env`:

```env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_SOCKET_URL=http://localhost:5000
```

### 5. Start MongoDB

Ensure MongoDB is running on your system:

**Windows:**
```powershell
# If MongoDB is installed as a service, it should already be running
# Otherwise, start it manually:
mongod
```

**macOS/Linux:**
```bash
sudo systemctl start mongod
# or
mongod
```

Verify MongoDB is running:
```bash
mongo --eval "db.version()"
```

### 6. Run the Application

#### Option 1: Run Backend and Frontend Separately

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd client
npm start
```

#### Option 2: Run Concurrently (Recommended)

From the root directory:
```bash
npm run dev
```

This will start both the backend (port 5000) and frontend (port 3000) simultaneously.

### 7. Access the Application

Open your browser and navigate to:
```
http://localhost:3000
```

## 📁 Project Structure

```
mern-task-manager/
├── client/                      # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/          # Reusable components
│   │   │   ├── Layout/          # MainLayout, Sidebar
│   │   │   └── Modals/          # CreateProject, CreateTask modals
│   │   ├── context/             # React Context providers
│   │   │   ├── AuthContext.js
│   │   │   ├── ProjectContext.js
│   │   │   └── TaskContext.js
│   │   ├── pages/               # Page components
│   │   │   ├── Login.js
│   │   │   ├── Register.js
│   │   │   ├── UIPreference.js
│   │   │   ├── FirstTaskGuide.js
│   │   │   ├── Dashboard.js
│   │   │   ├── Projects.js      # Kanban board
│   │   │   ├── Calendar.js
│   │   │   ├── Reports.js
│   │   │   ├── Messages.js      # Real-time chat
│   │   │   └── Settings.js
│   │   ├── utils/               # Utility functions
│   │   │   ├── api.js           # Axios configuration
│   │   │   └── socket.js        # Socket.IO setup
│   │   ├── App.js
│   │   ├── index.js
│   │   └── index.css
│   └── package.json
│
├── server/                      # Express backend
│   ├── config/
│   │   └── db.js                # MongoDB connection
│   ├── controllers/             # Route controllers
│   │   ├── authController.js
│   │   ├── projectController.js
│   │   ├── taskController.js
│   │   ├── messageController.js
│   │   └── reportController.js
│   ├── middleware/              # Custom middleware
│   │   ├── auth.js              # JWT authentication
│   │   └── errorHandler.js
│   ├── models/                  # Mongoose schemas
│   │   ├── User.js
│   │   ├── Project.js
│   │   ├── Task.js
│   │   └── Message.js
│   ├── routes/                  # API routes
│   │   ├── auth.js
│   │   ├── projects.js
│   │   ├── tasks.js
│   │   ├── messages.js
│   │   └── reports.js
│   ├── server.js                # Entry point with Socket.IO
│   └── package.json
│
├── .gitignore
├── package.json
└── README.md
```

## 🔐 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile (Protected)
- `PUT /api/auth/preference` - Update UI preference (Protected)
- `PUT /api/auth/first-task` - Mark first task created (Protected)

### Projects
- `GET /api/projects` - Get all user projects (Protected)
- `GET /api/projects/:id` - Get project by ID (Protected)
- `POST /api/projects` - Create project (Protected)
- `PUT /api/projects/:id` - Update project (Protected)
- `DELETE /api/projects/:id` - Delete project (Protected)

### Tasks
- `GET /api/tasks` - Get all user tasks (Protected)
- `GET /api/tasks/:id` - Get task by ID (Protected)
- `POST /api/tasks` - Create task (Protected)
- `PUT /api/tasks/:id` - Update task (Protected)
- `PATCH /api/tasks/:id/status` - Update task status (Protected)
- `DELETE /api/tasks/:id` - Delete task (Protected)

### Messages
- `GET /api/messages/:projectId` - Get project messages (Protected)
- `POST /api/messages/:projectId` - Send message (Protected)

### Reports
- `GET /api/reports` - Get analytics and reports (Protected)

## 🔌 Socket.IO Events

### Client to Server
- `join-project` - Join a project chat room
- `leave-project` - Leave a project chat room
- `send-message` - Send a message to project room
- `typing` - Notify others user is typing
- `stop-typing` - Notify others user stopped typing

### Server to Client
- `existing-messages` - Load existing messages when joining
- `new-message` - Receive new message in real-time
- `user-typing` - Another user is typing
- `user-stop-typing` - User stopped typing

## 🎯 User Flow

1. **Registration/Login** → User creates account or logs in
2. **UI Preference** → Choose Simple or Complex interface
3. **First Task Guide** → Create first project and task
4. **Dashboard** → View task summary and statistics
5. **Projects** → Manage projects with Kanban board
6. **Calendar** → View tasks in timeline format
7. **Reports** → Analyze productivity metrics
8. **Messages** → Real-time collaboration per project
9. **Settings** → Update preferences and profile

## 🎨 Styling Approach

The application uses custom CSS with CSS variables for theming. Key design principles:

- **Modern & Clean** - Minimalist design with smooth transitions
- **Color Palette** - Primary (Indigo), Success (Green), Warning (Yellow), Danger (Red)
- **Responsive** - Mobile-first approach with breakpoints
- **Accessibility** - Proper contrast ratios and semantic HTML
- **Animations** - Subtle hover effects and transitions

## 🧪 Testing

### Manual Testing Checklist

- [ ] User registration with validation
- [ ] User login and JWT token storage
- [ ] UI preference selection and persistence
- [ ] First task creation flow
- [ ] Project CRUD operations
- [ ] Task CRUD operations
- [ ] Drag-and-drop task status update
- [ ] Calendar task visualization
- [ ] Real-time messaging functionality
- [ ] Reports and analytics display
- [ ] Responsive design on mobile devices

## 🚀 Deployment

### Backend (Heroku/Railway)

1. Set environment variables in your hosting platform
2. Ensure MongoDB connection string is updated
3. Deploy from the `server` directory

### Frontend (Vercel/Netlify)

1. Build the React app: `npm run build`
2. Deploy the `build` folder
3. Update API URLs in environment variables

### Database (MongoDB Atlas)

1. Create a cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Get connection string
3. Update `MONGODB_URI` in server `.env`

## 🐛 Troubleshooting

### MongoDB Connection Issues
```bash
# Check if MongoDB is running
mongo --version

# Start MongoDB service (Windows)
net start MongoDB

# Start MongoDB service (Linux/macOS)
sudo systemctl start mongod
```

### Port Already in Use
```bash
# Kill process on port 5000 (Backend)
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Linux/macOS
lsof -ti:5000 | xargs kill -9
```

### Socket.IO Connection Issues
- Ensure both frontend and backend are running
- Check CORS configuration in `server.js`
- Verify `REACT_APP_SOCKET_URL` matches backend URL

**Built with ❤️ using the MERN Stack**

