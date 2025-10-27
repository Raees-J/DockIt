const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: [
      'TASK_REMINDER',
      'TASK_ASSIGNED',
      'TASK_COMPLETED',
      'TASK_OVERDUE',
      'DAILY_SUMMARY',
      'PROJECT_UPDATE',
      'PROJECT_MILESTONE',
      'COMMENT_ADDED',
      'MENTION'
    ],
    required: true
  },
  channel: {
    type: String,
    enum: ['EMAIL', 'SMS', 'PUSH', 'IN_APP'],
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'SENT', 'FAILED', 'BOUNCED'],
    default: 'PENDING'
  },
  subject: String,
  message: {
    type: String,
    required: true
  },
  metadata: {
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task'
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project'
    },
    messageId: String,
    errorMessage: String
  },
  sentAt: Date,
  readAt: Date,
  read: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for efficient queries
notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, read: 1 });
notificationSchema.index({ type: 1, status: 1 });

// Virtual for time since notification
notificationSchema.virtual('timeSince').get(function() {
  const now = new Date();
  const created = this.createdAt;
  const diffMs = now - created;
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return created.toLocaleDateString();
});

// Method to mark as read
notificationSchema.methods.markAsRead = async function() {
  this.read = true;
  this.readAt = new Date();
  return await this.save();
};

// Static method to get unread count
notificationSchema.statics.getUnreadCount = async function(userId) {
  return await this.countDocuments({ user: userId, read: false });
};

// Static method to mark all as read
notificationSchema.statics.markAllAsRead = async function(userId) {
  return await this.updateMany(
    { user: userId, read: false },
    { $set: { read: true, readAt: new Date() } }
  );
};

module.exports = mongoose.model('Notification', notificationSchema);
