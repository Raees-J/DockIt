require('dotenv').config({ path: __dirname + '/.env' });
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const { setSocketInstance, attachSocket } = require('./middleware/socket');
const Message = require('./models/Message');
const DirectMessage = require('./models/DirectMessage');
const Project = require('./models/Project');
const jobScheduler = require('./jobs/scheduler');

// Connect to database
connectDB();

const app = express();
const server = http.createServer(app);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Set socket instance for controllers
setSocketInstance(io);

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(attachSocket); // Attach socket to req object

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/direct-messages', require('./routes/directMessages'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/uploads', require('./routes/uploads'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/notifications', require('./routes/notifications'));

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'MERN Task Manager API' });
});

// Error handler middleware (must be last)
app.use(errorHandler);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Join project room
  socket.on('join-project', async (projectId) => {
    try {
      socket.join(projectId);
      console.log(`Socket ${socket.id} joined project room: ${projectId}`);
      
      // Send existing messages when joining
      const messages = await Message.find({ project: projectId })
        .populate('sender', 'name email')
        .sort({ timestamp: 1 });
      
      socket.emit('existing-messages', messages);
    } catch (error) {
      console.error('Error joining project room:', error);
      socket.emit('error', { message: 'Failed to join project room' });
    }
  });

  // Leave project room
  socket.on('leave-project', (projectId) => {
    socket.leave(projectId);
    console.log(`Socket ${socket.id} left project room: ${projectId}`);
  });

  // Handle new message
  socket.on('send-message', async (data) => {
    try {
      const { projectId, content, userId } = data;

      // Verify project exists and user has access
      const project = await Project.findById(projectId);
      if (!project) {
        socket.emit('error', { message: 'Project not found' });
        return;
      }

      // Create and save the message
      const message = await Message.create({
        content,
        sender: userId,
        project: projectId
      });

      const populatedMessage = await Message.findById(message._id)
        .populate('sender', 'name email');

      // Broadcast message to all users in the project room
      io.to(projectId).emit('new-message', populatedMessage);
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Handle typing indicator
  socket.on('typing', (data) => {
    const { projectId, userName } = data;
    socket.to(projectId).emit('user-typing', { userName });
  });

  socket.on('stop-typing', (data) => {
    const { projectId } = data;
    socket.to(projectId).emit('user-stop-typing');
  });

  // Handle direct messages
  socket.on('join-dm', (userId) => {
    socket.join(`user-${userId}`);
    console.log(`Socket ${socket.id} joined user room: user-${userId}`);
  });

  socket.on('send-direct-message', async (data) => {
    try {
      const { senderId, recipientId, content } = data;

      const message = await DirectMessage.create({
        sender: senderId,
        recipient: recipientId,
        content
      });

      const populatedMessage = await DirectMessage.findById(message._id)
        .populate('sender', 'name email')
        .populate('recipient', 'name email');

      // Send to both sender and recipient
      io.to(`user-${senderId}`).emit('new-direct-message', populatedMessage);
      io.to(`user-${recipientId}`).emit('new-direct-message', populatedMessage);
    } catch (error) {
      console.error('Error sending direct message:', error);
      socket.emit('error', { message: 'Failed to send direct message' });
    }
  });

  socket.on('dm-typing', (data) => {
    const { recipientId, senderName } = data;
    io.to(`user-${recipientId}`).emit('dm-user-typing', { senderName });
  });

  socket.on('dm-stop-typing', (data) => {
    const { recipientId } = data;
    io.to(`user-${recipientId}`).emit('dm-user-stop-typing');
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  // Initialize scheduled jobs
  if (process.env.ENABLE_SCHEDULED_JOBS !== 'false') {
    jobScheduler.initializeJobs();
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  jobScheduler.stopAllJobs();
  server.close(() => {
    console.log('HTTP server closed');
  });
});
