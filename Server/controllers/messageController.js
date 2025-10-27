const Message = require('../models/Message');
const Project = require('../models/Project');

// @desc    Get all messages for a project
// @route   GET /api/messages/:projectId
// @access  Private
const getMessages = async (req, res) => {
  try {
    const { projectId } = req.params;

    // Verify that the project exists and user has access
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const hasAccess = project.creator.toString() === req.user._id.toString() ||
      project.members.some(member => member.toString() === req.user._id.toString());

    if (!hasAccess) {
      return res.status(403).json({ message: 'Not authorized to access this project chat' });
    }

    const messages = await Message.find({ project: projectId })
      .populate('sender', 'name email')
      .sort({ timestamp: 1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Send a message to a project chat
// @route   POST /api/messages/:projectId
// @access  Private
const sendMessage = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { content } = req.body;

    if (!content || content.trim() === '') {
      return res.status(400).json({ message: 'Message content is required' });
    }

    // Verify that the project exists and user has access
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const hasAccess = project.creator.toString() === req.user._id.toString() ||
      project.members.some(member => member.toString() === req.user._id.toString());

    if (!hasAccess) {
      return res.status(403).json({ message: 'Not authorized to send messages to this project' });
    }

    const message = await Message.create({
      content,
      sender: req.user._id,
      project: projectId
    });

    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'name email');

    res.status(201).json(populatedMessage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getMessages,
  sendMessage
};
