const DirectMessage = require('../models/DirectMessage');
const User = require('../models/User');

// @desc    Get conversation with a specific user
// @route   GET /api/direct-messages/:userId
// @access  Private
const getConversation = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    // Verify the other user exists
    const otherUser = await User.findById(userId);
    if (!otherUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get all messages between the two users
    const messages = await DirectMessage.find({
      $or: [
        { sender: currentUserId, recipient: userId },
        { sender: userId, recipient: currentUserId }
      ]
    })
      .populate('sender', 'name email')
      .populate('recipient', 'name email')
      .sort({ timestamp: 1 });

    // Mark messages as read
    await DirectMessage.updateMany(
      { sender: userId, recipient: currentUserId, read: false },
      { read: true }
    );

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Send a direct message
// @route   POST /api/direct-messages/:userId
// @access  Private
const sendDirectMessage = async (req, res) => {
  try {
    const { userId } = req.params;
    const { content } = req.body;
    const currentUserId = req.user._id;

    if (!content || content.trim() === '') {
      return res.status(400).json({ message: 'Message content is required' });
    }

    // Verify the recipient exists
    const recipient = await User.findById(userId);
    if (!recipient) {
      return res.status(404).json({ message: 'Recipient not found' });
    }

    const message = await DirectMessage.create({
      sender: currentUserId,
      recipient: userId,
      content: content.trim()
    });

    const populatedMessage = await DirectMessage.findById(message._id)
      .populate('sender', 'name email')
      .populate('recipient', 'name email');

    res.status(201).json(populatedMessage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all conversations (list of users you've chatted with)
// @route   GET /api/direct-messages/conversations/list
// @access  Private
const getConversationsList = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    // Get all unique users that have exchanged messages with current user
    const conversations = await DirectMessage.aggregate([
      {
        $match: {
          $or: [
            { sender: currentUserId },
            { recipient: currentUserId }
          ]
        }
      },
      {
        $sort: { timestamp: -1 }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$sender', currentUserId] },
              '$recipient',
              '$sender'
            ]
          },
          lastMessage: { $first: '$content' },
          lastMessageTime: { $first: '$timestamp' },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$recipient', currentUserId] },
                    { $eq: ['$read', false] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $sort: { lastMessageTime: -1 }
      }
    ]);

    // Populate user details
    const populatedConversations = await User.populate(conversations, {
      path: '_id',
      select: 'name email'
    });

    res.json(populatedConversations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getConversation,
  sendDirectMessage,
  getConversationsList
};
