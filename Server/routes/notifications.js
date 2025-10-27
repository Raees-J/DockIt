const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Notification = require('../models/Notification');
const notificationService = require('../services/notificationService');
const jobScheduler = require('../jobs/scheduler');

/**
 * @route   GET /api/notifications
 * @desc    Get all notifications for authenticated user
 * @access  Private
 */
router.get('/', protect, async (req, res) => {
  try {
    const { read, type, limit = 50, skip = 0 } = req.query;
    
    const query = { user: req.user.id };
    
    if (read !== undefined) {
      query.read = read === 'true';
    }
    
    if (type) {
      query.type = type;
    }

    const notifications = await Notification.find(query)
      .populate('metadata.taskId', 'title priority dueDate')
      .populate('metadata.projectId', 'title status')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.getUnreadCount(req.user.id);

    res.json({
      notifications,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: total > (parseInt(skip) + parseInt(limit))
      },
      unreadCount
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/notifications/unread-count
 * @desc    Get unread notification count
 * @access  Private
 */
router.get('/unread-count', protect, async (req, res) => {
  try {
    const count = await Notification.getUnreadCount(req.user.id);
    res.json({ count });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   PATCH /api/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.patch('/:id/read', protect, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    await notification.markAsRead();
    res.json(notification);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   POST /api/notifications/mark-all-read
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.post('/mark-all-read', protect, async (req, res) => {
  try {
    await Notification.markAllAsRead(req.user.id);
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete notification
 * @access  Private
 */
router.delete('/:id', protect, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   POST /api/notifications/test/daily-summary
 * @desc    Test daily summary (manually trigger)
 * @access  Private
 */
router.post('/test/daily-summary', protect, async (req, res) => {
  try {
    const result = await jobScheduler.triggerDailySummary(req.user.id);
    res.json({ 
      message: 'Daily summary sent',
      result 
    });
  } catch (error) {
    console.error('Error sending daily summary:', error);
    res.status(500).json({ message: 'Failed to send daily summary', error: error.message });
  }
});

/**
 * @route   POST /api/notifications/test/task-reminder/:taskId
 * @desc    Test task reminder (manually trigger)
 * @access  Private
 */
router.post('/test/task-reminder/:taskId', protect, async (req, res) => {
  try {
    const result = await jobScheduler.triggerTaskReminder(req.params.taskId);
    res.json({ 
      message: 'Task reminder sent',
      result 
    });
  } catch (error) {
    console.error('Error sending task reminder:', error);
    res.status(500).json({ message: 'Failed to send task reminder', error: error.message });
  }
});

module.exports = router;
