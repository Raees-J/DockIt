const { validationResult } = require('express-validator');
const Project = require('../models/Project');
const Task = require('../models/Task');
const User = require('../models/User');

// @desc    Get all projects for authenticated user
// @route   GET /api/projects
// @access  Private
const getProjects = async (req, res) => {
  try {
    const projects = await Project.find({
      $or: [
        { creator: req.user._id },
        { members: req.user._id }
      ]
    })
      .populate('creator', 'name email')
      .populate('members', 'name email')
      .sort({ createdAt: -1 });

    // Get task count for each project
    const projectsWithTaskCount = await Promise.all(
      projects.map(async (project) => {
        const taskCount = await Task.countDocuments({ parentProject: project._id });
        const completedCount = await Task.countDocuments({ 
          parentProject: project._id, 
          status: 'Completed' 
        });
        
        return {
          ...project.toObject(),
          taskCount,
          completedCount,
          completionPercentage: taskCount > 0 ? Math.round((completedCount / taskCount) * 100) : 0
        };
      })
    );

    res.json(projectsWithTaskCount);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get project by ID
// @route   GET /api/projects/:id
// @access  Private
const getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('creator', 'name email')
      .populate('members', 'name email');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user has access to this project
    const hasAccess = project.creator._id.toString() === req.user._id.toString() ||
      project.members.some(member => member._id.toString() === req.user._id.toString());

    if (!hasAccess) {
      return res.status(403).json({ message: 'Not authorized to access this project' });
    }

    // Get tasks for this project
    const tasks = await Task.find({ parentProject: project._id })
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .sort({ dueDate: 1 });

    res.json({
      ...project.toObject(),
      tasks
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a new project
// @route   POST /api/projects
// @access  Private
const createProject = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { title, description, status, milestoneDate, collaborators = [] } = req.body;

    // Start with creator as the first member
    const memberIds = [req.user._id];
    
    // Add collaborators if provided (validate they exist)
    if (collaborators.length > 0) {
      const validCollaborators = await User.find({
        _id: { $in: collaborators }
      }).select('_id');
      
      // Add valid collaborator IDs (excluding duplicates)
      validCollaborators.forEach(collab => {
        if (!memberIds.includes(collab._id.toString())) {
          memberIds.push(collab._id);
        }
      });
    }

    const project = await Project.create({
      title,
      description,
      status: status || 'Active',
      milestoneDate,
      creator: req.user._id,
      members: memberIds
    });

    const populatedProject = await Project.findById(project._id)
      .populate('creator', 'name email')
      .populate('members', 'name email');

    // Emit socket event for real-time updates to all project members
    if (req.io) {
      memberIds.forEach(memberId => {
        req.io.emit('projectCreated', populatedProject);
      });
    }

    res.status(201).json(populatedProject);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a project
// @route   PUT /api/projects/:id
// @access  Private
const updateProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user is the creator
    if (project.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this project' });
    }

    const { title, description, status, milestoneDate } = req.body;

    project.title = title || project.title;
    project.description = description || project.description;
    project.status = status || project.status;
    project.milestoneDate = milestoneDate !== undefined ? milestoneDate : project.milestoneDate;

    const updatedProject = await project.save();

    const populatedProject = await Project.findById(updatedProject._id)
      .populate('creator', 'name email')
      .populate('members', 'name email');

    res.json(populatedProject);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a project
// @route   DELETE /api/projects/:id
// @access  Private
const deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user is the creator
    if (project.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this project' });
    }

    // Delete all tasks associated with this project
    await Task.deleteMany({ parentProject: project._id });

    // Emit socket event for real-time updates
    if (req.io) {
      req.io.to(project._id.toString()).emit('projectDeleted', project._id);
    }

    await project.deleteOne();

    res.json({ message: 'Project and associated tasks deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject
};
