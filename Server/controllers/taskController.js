const { validationResult } = require('express-validator');
const Task = require('../models/Task');
const Project = require('../models/Project');

// @desc    Get all tasks for authenticated user
// @route   GET /api/tasks
// @access  Private
const getTasks = async (req, res) => {
  try {
    const { projectId, status } = req.query;

    let query = {};

    if (projectId) {
      // If fetching tasks for a specific project, verify user has access to the project
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      const hasAccess = project.creator.toString() === req.user._id.toString() ||
        project.members.some(member => member.toString() === req.user._id.toString());

      if (!hasAccess) {
        return res.status(403).json({ message: 'Not authorized to view tasks for this project' });
      }

      // Return ALL tasks for this project (not just user's assigned tasks)
      query.parentProject = projectId;
    } else {
      // If no specific project, return tasks where user is assigned, created, or member of project
      const userProjects = await Project.find({
        $or: [
          { creator: req.user._id },
          { members: req.user._id }
        ]
      }).select('_id');

      const projectIds = userProjects.map(p => p._id);
      
      query = {
        $or: [
          { assignedTo: req.user._id },
          { createdBy: req.user._id },
          { parentProject: { $in: projectIds } }
        ]
      };
    }

    if (status) {
      query.status = status;
    }

    const tasks = await Task.find(query)
      .populate('parentProject', 'title')
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .sort({ dueDate: 1 });

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get task by ID
// @route   GET /api/tasks/:id
// @access  Private
const getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('parentProject', 'title')
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email');

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user has access to this task through project membership
    const project = await Project.findById(task.parentProject._id);
    if (!project) {
      return res.status(404).json({ message: 'Associated project not found' });
    }

    const hasAccess = project.creator.toString() === req.user._id.toString() ||
      project.members.some(member => member.toString() === req.user._id.toString()) ||
      task.assignedTo._id.toString() === req.user._id.toString() ||
      task.createdBy._id.toString() === req.user._id.toString();

    if (!hasAccess) {
      return res.status(403).json({ message: 'Not authorized to access this task' });
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a new task
// @route   POST /api/tasks
// @access  Private
const createTask = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { title, description, status, dueDate, dueTime, priority, parentProject } = req.body;

    // Verify that the project exists and user has access
    const project = await Project.findById(parentProject);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const hasAccess = project.creator.toString() === req.user._id.toString() ||
      project.members.some(member => member.toString() === req.user._id.toString());

    if (!hasAccess) {
      return res.status(403).json({ message: 'Not authorized to add tasks to this project' });
    }

    const task = await Task.create({
      title,
      description,
      status: status || 'To Do',
      dueDate,
      dueTime,
      priority: priority || 'Medium',
      parentProject,
      assignedTo: req.user._id,
      createdBy: req.user._id
    });

    const populatedTask = await Task.findById(task._id)
      .populate('parentProject', 'title')
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email');

    // Emit socket event for real-time updates
    if (req.io) {
      req.io.to(parentProject).emit('taskCreated', populatedTask);
    }

    res.status(201).json(populatedTask);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a task
// @route   PUT /api/tasks/:id
// @access  Private
const updateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user has permission through project membership
    const project = await Project.findById(task.parentProject);
    if (!project) {
      return res.status(404).json({ message: 'Associated project not found' });
    }

    const hasAccess = project.creator.toString() === req.user._id.toString() ||
      project.members.some(member => member.toString() === req.user._id.toString()) ||
      task.assignedTo.toString() === req.user._id.toString() ||
      task.createdBy.toString() === req.user._id.toString();

    if (!hasAccess) {
      return res.status(403).json({ message: 'Not authorized to update this task' });
    }

    const { title, description, status, dueDate, dueTime, priority } = req.body;

    task.title = title || task.title;
    task.description = description !== undefined ? description : task.description;
    task.status = status || task.status;
    task.dueDate = dueDate || task.dueDate;
    task.dueTime = dueTime !== undefined ? dueTime : task.dueTime;
    task.priority = priority || task.priority;

    const updatedTask = await task.save();

    const populatedTask = await Task.findById(updatedTask._id)
      .populate('parentProject', 'title')
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email');

    // Emit socket event for real-time updates
    if (req.io) {
      req.io.to(task.parentProject.toString()).emit('taskUpdated', populatedTask);
    }

    res.json(populatedTask);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update task status (for drag-and-drop)
// @route   PATCH /api/tasks/:id/status
// @access  Private
const updateTaskStatus = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user has permission through project membership
    const project = await Project.findById(task.parentProject);
    if (!project) {
      return res.status(404).json({ message: 'Associated project not found' });
    }

    const hasAccess = project.creator.toString() === req.user._id.toString() ||
      project.members.some(member => member.toString() === req.user._id.toString()) ||
      task.assignedTo.toString() === req.user._id.toString() ||
      task.createdBy.toString() === req.user._id.toString();

    if (!hasAccess) {
      return res.status(403).json({ message: 'Not authorized to update this task' });
    }

    const { status } = req.body;

    if (!['To Do', 'In Progress', 'Completed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    task.status = status;
    const updatedTask = await task.save();

    const populatedTask = await Task.findById(updatedTask._id)
      .populate('parentProject', 'title')
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email');

    // Emit socket event for real-time updates
    if (req.io) {
      req.io.to(task.parentProject.toString()).emit('taskUpdated', populatedTask);
    }

    res.json(populatedTask);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a task
// @route   DELETE /api/tasks/:id
// @access  Private
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user has permission to delete
    if (task.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this task' });
    }

    await task.deleteOne();

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  updateTaskStatus
};
