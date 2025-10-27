const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, email, password } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        uiPreference: user.uiPreference,
        hasCreatedFirstTask: user.hasCreatedFirstTask,
        token: generateToken(user._id)
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { email, password } = req.body;

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        uiPreference: user.uiPreference,
        hasCreatedFirstTask: user.hasCreatedFirstTask,
        token: generateToken(user._id)
      });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        uiPreference: user.uiPreference,
        hasCreatedFirstTask: user.hasCreatedFirstTask
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update UI preference
// @route   PUT /api/auth/preference
// @access  Private
const updateUserPreference = async (req, res) => {
  try {
    const { uiPreference } = req.body;

    if (!['simple', 'complex'].includes(uiPreference)) {
      return res.status(400).json({ message: 'Invalid UI preference' });
    }

    const user = await User.findById(req.user._id);

    if (user) {
      user.uiPreference = uiPreference;
      await user.save();

      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        uiPreference: user.uiPreference,
        hasCreatedFirstTask: user.hasCreatedFirstTask
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark first task as created
// @route   PUT /api/auth/first-task
// @access  Private
const markFirstTaskCreated = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (user) {
      user.hasCreatedFirstTask = true;
      await user.save();

      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        uiPreference: user.uiPreference,
        hasCreatedFirstTask: user.hasCreatedFirstTask
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Search users for collaboration
// @route   GET /api/auth/search
// @access  Private
const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' });
    }

    const users = await User.find({
      _id: { $ne: req.user._id }, // Exclude current user
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } }
      ]
    })
      .select('_id name email')
      .limit(10);

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserPreference,
  markFirstTaskCreated,
  searchUsers
};
