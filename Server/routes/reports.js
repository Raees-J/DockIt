const express = require('express');
const router = express.Router();
const {
  getReports
} = require('../controllers/reportController');
const { protect } = require('../middleware/auth');

// @route   GET /api/reports
// @desc    Get analytics and reports for authenticated user
// @access  Private
router.get('/', protect, getReports);

module.exports = router;
