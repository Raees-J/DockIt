const express = require('express');
const router = express.Router();
const {
  getConversation,
  sendDirectMessage,
  getConversationsList
} = require('../controllers/directMessageController');
const { protect } = require('../middleware/auth');

// @route   GET /api/direct-messages/conversations/list
// @desc    Get all conversations
// @access  Private
router.get('/conversations/list', protect, getConversationsList);

// @route   GET /api/direct-messages/:userId
// @desc    Get conversation with a specific user
// @access  Private
router.get('/:userId', protect, getConversation);

// @route   POST /api/direct-messages/:userId
// @desc    Send a direct message
// @access  Private
router.post('/:userId', protect, sendDirectMessage);

module.exports = router;
