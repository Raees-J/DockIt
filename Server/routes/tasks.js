const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  updateTaskStatus
} = require('../controllers/taskController');
const { protect } = require('../middleware/auth');

// @route   GET /api/tasks
// @desc    Get all tasks for authenticated user
// @access  Private
router.get('/', protect, getTasks);

// @route   GET /api/tasks/:id
// @desc    Get task by ID
// @access  Private
router.get('/:id', protect, getTaskById);

// @route   POST /api/tasks
// @desc    Create a new task
// @access  Private
router.post(
  '/',
  protect,
  [
    body('title').trim().notEmpty().withMessage('Task title is required'),
    body('dueDate').notEmpty().withMessage('Due date is required'),
    body('parentProject').notEmpty().withMessage('Parent project is required')
  ],
  createTask
);

// @route   PUT /api/tasks/:id
// @desc    Update a task
// @access  Private
router.put('/:id', protect, updateTask);

// @route   PATCH /api/tasks/:id/status
// @desc    Update task status (for drag-and-drop)
// @access  Private
router.patch('/:id/status', protect, updateTaskStatus);

// @route   DELETE /api/tasks/:id
// @desc    Delete a task
// @access  Private
router.delete('/:id', protect, deleteTask);

module.exports = router;
