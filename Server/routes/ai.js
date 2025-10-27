const express = require('express');
const { generateTaskSuggestions, analyzeProjectProgress, enhanceTaskDescription } = require('../services/googleAI');
const { logUserActivity } = require('../services/googleFirestore');
const Project = require('../models/Project');
const Task = require('../models/Task');
const { protect } = require('../middleware/auth');
const router = express.Router();

// Generate task suggestions for a project
router.post('/suggest-tasks', protect, async (req, res) => {
  try {
    const { projectId, projectTitle, projectDescription } = req.body;

    if (!projectTitle || !projectDescription) {
      return res.status(400).json({ 
        success: false, 
        message: 'Project title and description are required' 
      });
    }

    const suggestions = await generateTaskSuggestions(projectTitle, projectDescription);

    // Log AI usage
    await logUserActivity(req.user.id, 'ai_task_suggestions', {
      projectId,
      suggestionsCount: suggestions.tasks?.length || 0,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      suggestions: suggestions.tasks || [],
      message: 'Task suggestions generated successfully'
    });
  } catch (error) {
    console.error('Task suggestions error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error generating task suggestions',
      error: error.message 
    });
  }
});

// Analyze project progress
router.get('/analyze-project/:projectId', protect, async (req, res) => {
  try {
    const { projectId } = req.params;

    // Verify user has access to this project
    const project = await Project.findOne({ 
      _id: projectId, 
      $or: [
        { owner: req.user.id },
        { 'collaborators.user': req.user.id }
      ]
    });

    if (!project) {
      return res.status(404).json({ 
        success: false, 
        message: 'Project not found or access denied' 
      });
    }

    // Get all tasks for this project
    const tasks = await Task.find({ project: projectId });
    
    const analysis = await analyzeProjectProgress(project, tasks);

    // Log AI usage
    await logUserActivity(req.user.id, 'ai_project_analysis', {
      projectId,
      taskCount: tasks.length,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      analysis,
      projectStats: {
        totalTasks: tasks.length,
        completed: tasks.filter(t => t.status === 'Completed').length,
        inProgress: tasks.filter(t => t.status === 'In Progress').length,
        todo: tasks.filter(t => t.status === 'To Do').length
      }
    });
  } catch (error) {
    console.error('Project analysis error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error analyzing project',
      error: error.message 
    });
  }
});

// Enhance task description with AI
router.post('/enhance-task-description', protect, async (req, res) => {
  try {
    const { taskTitle, projectContext } = req.body;

    if (!taskTitle) {
      return res.status(400).json({ 
        success: false, 
        message: 'Task title is required' 
      });
    }

    const enhancedDescription = await enhanceTaskDescription(taskTitle, projectContext || '');

    // Log AI usage
    await logUserActivity(req.user.id, 'ai_task_enhancement', {
      taskTitle,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      enhancedDescription,
      message: 'Task description enhanced successfully'
    });
  } catch (error) {
    console.error('Task enhancement error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error enhancing task description',
      error: error.message 
    });
  }
});

// Get AI usage analytics
router.get('/usage-stats', protect, async (req, res) => {
  try {
    const { getUserActivityInsights } = require('../services/googleFirestore');
    
    const insights = await getUserActivityInsights(req.user.id, 30);
    
    if (insights) {
      // Filter AI-related activities
      const aiActivities = ['ai_task_suggestions', 'ai_project_analysis', 'ai_task_enhancement'];
      const aiStats = {};
      
      aiActivities.forEach(activity => {
        aiStats[activity] = insights.activityBreakdown[activity] || 0;
      });

      res.json({
        success: true,
        aiUsageStats: aiStats,
        totalAIRequests: Object.values(aiStats).reduce((sum, count) => sum + count, 0),
        timeRange: insights.timeRange
      });
    } else {
      res.json({
        success: true,
        aiUsageStats: {},
        totalAIRequests: 0,
        message: 'No usage data available'
      });
    }
  } catch (error) {
    console.error('AI usage stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error retrieving usage stats',
      error: error.message 
    });
  }
});

module.exports = router;