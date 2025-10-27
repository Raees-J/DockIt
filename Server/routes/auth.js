const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserPreference,
  markFirstTaskCreated,
  searchUsers
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters')
  ],
  registerUser
);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  loginUser
);

// @route   GET /api/auth/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', protect, getUserProfile);

// @route   PUT /api/auth/preference
// @desc    Update UI preference
// @access  Private
router.put('/preference', protect, updateUserPreference);

// @route   PUT /api/auth/first-task
// @desc    Mark first task as created
// @access  Private
router.put('/first-task', protect, markFirstTaskCreated);

// @route   GET /api/auth/search
// @desc    Search users for collaboration
// @access  Private
router.get('/search', protect, searchUsers);

module.exports = router;
