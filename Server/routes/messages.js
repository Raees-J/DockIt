const express = require('express');
const router = express.Router();
const {
  getMessages,
  sendMessage
} = require('../controllers/messageController');
const { protect } = require('../middleware/auth');

// @route   GET /api/messages/:projectId
// @desc    Get all messages for a project
// @access  Private
router.get('/:projectId', protect, getMessages);

// @route   POST /api/messages/:projectId
// @desc    Send a message to a project chat
// @access  Private
router.post('/:projectId', protect, sendMessage);

module.exports = router;
