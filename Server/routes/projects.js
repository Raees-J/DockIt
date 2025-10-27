const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject
} = require('../controllers/projectController');
const { protect } = require('../middleware/auth');

// @route   GET /api/projects
// @desc    Get all projects for authenticated user
// @access  Private
router.get('/', protect, getProjects);

// @route   GET /api/projects/:id
// @desc    Get project by ID
// @access  Private
router.get('/:id', protect, getProjectById);

// @route   POST /api/projects
// @desc    Create a new project
// @access  Private
router.post(
  '/',
  protect,
  [
    body('title').trim().notEmpty().withMessage('Project title is required'),
    body('description').trim().notEmpty().withMessage('Project description is required')
  ],
  createProject
);

// @route   PUT /api/projects/:id
// @desc    Update a project
// @access  Private
router.put('/:id', protect, updateProject);

// @route   DELETE /api/projects/:id
// @desc    Delete a project
// @access  Private
router.delete('/:id', protect, deleteProject);

module.exports = router;
