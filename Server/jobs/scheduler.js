const cron = require('node-cron');
const Task = require('../models/Task');
const User = require('../models/User');
const Project = require('../models/Project');
const notificationService = require('../services/notificationService');

class JobScheduler {
  constructor() {
    this.jobs = [];
  }

  /**
   * Initialize all scheduled jobs
   */
  initializeJobs() {
    console.log('🕐 Initializing scheduled jobs...');

    // Daily summary at 8 AM
    this.scheduleDailySummary();

    // Check for due tasks every hour
    this.scheduleTaskReminders();

    // Check for overdue tasks daily at 9 AM
    this.scheduleOverdueCheck();

    console.log('✅ All scheduled jobs initialized');
  }

  /**
   * Send daily summary to all users at 8 AM
   * Cron: 0 8 * * * (Every day at 8:00 AM)
   */
  scheduleDailySummary() {
    const job = cron.schedule('0 8 * * *', async () => {
      console.log('📊 Running daily summary job...');
      
      try {
        const users = await User.find({ emailNotifications: true });
        
        for (const user of users) {
          const tasks = await Task.find({ 
            assignedTo: user._id,
            status: { $ne: 'Completed' }
          }).populate('project');

          const projects = await Project.find({
            $or: [
              { owner: user._id },
              { members: user._id }
            ]
          });

          await notificationService.sendDailySummary(user, tasks, projects);
        }

        console.log(`✅ Daily summary sent to ${users.length} users`);
      } catch (error) {
        console.error('❌ Error in daily summary job:', error);
      }
    });

    this.jobs.push(job);
    console.log('📅 Daily summary job scheduled (8 AM)');
  }

  /**
   * Check for tasks due in the next 24 hours and send reminders
   * Cron: 0 * * * * (Every hour)
   */
  scheduleTaskReminders() {
    const job = cron.schedule('0 * * * *', async () => {
      console.log('⏰ Checking for upcoming task reminders...');
      
      try {
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        // Find tasks due in the next 24 hours that haven't been reminded
        const tasks = await Task.find({
          dueDate: { 
            $gte: now,
            $lte: tomorrow
          },
          status: { $ne: 'Completed' },
          reminderSent: { $ne: true }
        }).populate('assignedTo').populate('project');

        for (const task of tasks) {
          if (task.assignedTo) {
            await notificationService.sendTaskReminder(task.assignedTo, task);
            
            // Mark reminder as sent
            task.reminderSent = true;
            await task.save();
          }
        }

        console.log(`✅ Sent ${tasks.length} task reminders`);
      } catch (error) {
        console.error('❌ Error in task reminder job:', error);
      }
    });

    this.jobs.push(job);
    console.log('⏰ Task reminder job scheduled (hourly)');
  }

  /**
   * Check for overdue tasks daily at 9 AM
   * Cron: 0 9 * * * (Every day at 9:00 AM)
   */
  scheduleOverdueCheck() {
    const job = cron.schedule('0 9 * * *', async () => {
      console.log('⚠️ Checking for overdue tasks...');
      
      try {
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        // Find overdue tasks
        const overdueTasks = await Task.find({
          dueDate: { $lt: now },
          status: { $ne: 'Completed' }
        }).populate('assignedTo').populate('project');

        const userOverdueTasks = {};

        // Group tasks by user
        for (const task of overdueTasks) {
          if (task.assignedTo) {
            const userId = task.assignedTo._id.toString();
            if (!userOverdueTasks[userId]) {
              userOverdueTasks[userId] = {
                user: task.assignedTo,
                tasks: []
              };
            }
            userOverdueTasks[userId].tasks.push(task);
          }
        }

        // Send overdue notification to each user
        for (const userId in userOverdueTasks) {
          const { user, tasks } = userOverdueTasks[userId];
          
          const subject = `⚠️ You have ${tasks.length} overdue task${tasks.length > 1 ? 's' : ''}`;
          const html = `
            <!DOCTYPE html>
            <html>
              <head>
                <style>
                  body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
                  .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
                  .task-item { background: white; padding: 15px; border-radius: 6px; margin-bottom: 10px; border-left: 4px solid #ef4444; }
                  .button { display: inline-block; padding: 12px 24px; background: #ef4444; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>⚠️ Overdue Tasks Alert</h1>
                    <p>Hi ${user.name}, you have ${tasks.length} overdue task${tasks.length > 1 ? 's' : ''}</p>
                  </div>
                  <div class="content">
                    ${tasks.slice(0, 5).map(task => `
                      <div class="task-item">
                        <strong>${task.title}</strong><br>
                        <span style="color: #6b7280; font-size: 13px;">
                          Due: ${new Date(task.dueDate).toLocaleDateString()} • ${task.priority} Priority
                        </span>
                      </div>
                    `).join('')}
                    ${tasks.length > 5 ? `<p style="color: #6b7280;">+ ${tasks.length - 5} more overdue tasks</p>` : ''}
                    <div style="text-align: center; margin-top: 20px;">
                      <a href="${process.env.APP_URL || 'http://localhost:3000'}/dashboard" class="button">View All Tasks</a>
                    </div>
                  </div>
                </div>
              </body>
            </html>
          `;

          await notificationService.sendEmail({
            to: user.email,
            subject,
            html,
            text: `You have ${tasks.length} overdue tasks. Please check your task manager.`
          });
        }

        console.log(`✅ Sent overdue notifications to ${Object.keys(userOverdueTasks).length} users`);
      } catch (error) {
        console.error('❌ Error in overdue check job:', error);
      }
    });

    this.jobs.push(job);
    console.log('⚠️ Overdue check job scheduled (9 AM)');
  }

  /**
   * Stop all scheduled jobs
   */
  stopAllJobs() {
    this.jobs.forEach(job => job.stop());
    console.log('🛑 All scheduled jobs stopped');
  }

  /**
   * Manually trigger daily summary (for testing)
   */
  async triggerDailySummary(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const tasks = await Task.find({ 
        assignedTo: user._id,
        status: { $ne: 'Completed' }
      }).populate('project');

      const projects = await Project.find({
        $or: [
          { owner: user._id },
          { members: user._id }
        ]
      });

      return await notificationService.sendDailySummary(user, tasks, projects);
    } catch (error) {
      console.error('Error triggering daily summary:', error);
      throw error;
    }
  }

  /**
   * Manually trigger task reminder (for testing)
   */
  async triggerTaskReminder(taskId) {
    try {
      const task = await Task.findById(taskId).populate('assignedTo').populate('project');
      if (!task) {
        throw new Error('Task not found');
      }

      if (!task.assignedTo) {
        throw new Error('Task has no assigned user');
      }

      return await notificationService.sendTaskReminder(task.assignedTo, task);
    } catch (error) {
      console.error('Error triggering task reminder:', error);
      throw error;
    }
  }
}

module.exports = new JobScheduler();
