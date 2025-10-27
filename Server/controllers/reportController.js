const Task = require('../models/Task');
const Project = require('../models/Project');

// @desc    Get analytics and reports for authenticated user
// @route   GET /api/reports
// @access  Private
const getReports = async (req, res) => {
  try {
    // Get all tasks for the user
    const allTasks = await Task.find({ assignedTo: req.user._id });
    const totalTasks = allTasks.length;

    // Calculate task status breakdown
    const toDoTasks = allTasks.filter(task => task.status === 'To Do').length;
    const inProgressTasks = allTasks.filter(task => task.status === 'In Progress').length;
    const completedTasks = allTasks.filter(task => task.status === 'Completed').length;

    // Calculate overall completion rate
    const completionRate = totalTasks > 0 
      ? Math.round((completedTasks / totalTasks) * 100) 
      : 0;

    // Task status breakdown percentages
    const statusBreakdown = {
      toDo: {
        count: toDoTasks,
        percentage: totalTasks > 0 ? Math.round((toDoTasks / totalTasks) * 100) : 0
      },
      inProgress: {
        count: inProgressTasks,
        percentage: totalTasks > 0 ? Math.round((inProgressTasks / totalTasks) * 100) : 0
      },
      completed: {
        count: completedTasks,
        percentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
      }
    };

    // Get all user's projects
    const projects = await Project.find({
      $or: [
        { creator: req.user._id },
        { members: req.user._id }
      ]
    });

    // Calculate project health metrics
    const projectHealth = await Promise.all(
      projects.map(async (project) => {
        const projectTasks = await Task.find({ parentProject: project._id });
        const projectTaskCount = projectTasks.length;
        const projectCompletedCount = projectTasks.filter(
          task => task.status === 'Completed'
        ).length;

        const completionPercentage = projectTaskCount > 0 
          ? Math.round((projectCompletedCount / projectTaskCount) * 100) 
          : 0;

        // Find upcoming deadlines (tasks due in the next 7 days)
        const now = new Date();
        const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        
        const upcomingDeadlines = projectTasks.filter(task => {
          const dueDate = new Date(task.dueDate);
          return dueDate >= now && dueDate <= sevenDaysFromNow && task.status !== 'Completed';
        }).length;

        // Determine health status
        let healthStatus = 'good';
        if (completionPercentage < 30) {
          healthStatus = 'critical';
        } else if (completionPercentage < 60) {
          healthStatus = 'warning';
        }

        return {
          projectId: project._id,
          projectTitle: project.title,
          totalTasks: projectTaskCount,
          completedTasks: projectCompletedCount,
          completionPercentage,
          upcomingDeadlines,
          healthStatus,
          milestoneDate: project.milestoneDate
        };
      })
    );

    // Get tasks by priority
    const priorityBreakdown = {
      high: allTasks.filter(task => task.priority === 'High').length,
      medium: allTasks.filter(task => task.priority === 'Medium').length,
      low: allTasks.filter(task => task.priority === 'Low').length
    };

    // Get overdue tasks
    const now = new Date();
    const overdueTasks = allTasks.filter(task => {
      return new Date(task.dueDate) < now && task.status !== 'Completed';
    }).length;

    res.json({
      overview: {
        totalTasks,
        completedTasks,
        completionRate,
        overdueTasks
      },
      statusBreakdown,
      priorityBreakdown,
      projectHealth
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getReports
};
