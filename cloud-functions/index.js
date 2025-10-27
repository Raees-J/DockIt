const functions = require('@google-cloud/functions-framework');
const { PubSub } = require('@google-cloud/pubsub');
const axios = require('axios');
const nodemailer = require('nodemailer');

const pubsub = new PubSub();

// Email transporter
const emailTransporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

/**
 * Cloud Function: Daily Summary
 * Triggered by Cloud Scheduler via Pub/Sub topic "daily-summary"
 * Runs daily at 8 AM to send summary emails to all users
 */
functions.cloudEvent('dailySummary', async (cloudEvent) => {
  console.log('📊 Daily Summary Cloud Function triggered');
  
  try {
    const API_URL = process.env.API_URL || 'http://localhost:5000';
    
    // Fetch all users with email notifications enabled
    const usersResponse = await axios.get(`${API_URL}/api/users?emailNotifications=true`, {
      headers: {
        'Authorization': `Bearer ${process.env.API_KEY}`
      }
    });

    const users = usersResponse.data;
    const results = [];

    for (const user of users) {
      try {
        // Fetch user's tasks
        const tasksResponse = await axios.get(`${API_URL}/api/tasks?assignedTo=${user._id}&status[ne]=Completed`, {
          headers: {
            'Authorization': `Bearer ${process.env.API_KEY}`
          }
        });

        // Fetch user's projects
        const projectsResponse = await axios.get(`${API_URL}/api/projects?userId=${user._id}`, {
          headers: {
            'Authorization': `Bearer ${process.env.API_KEY}`
          }
        });

        const tasks = tasksResponse.data;
        const projects = projectsResponse.data;

        // Send daily summary email
        const emailResult = await sendDailySummaryEmail(user, tasks, projects);
        results.push({ userId: user._id, success: true, messageId: emailResult.messageId });

        console.log(`✅ Daily summary sent to ${user.email}`);
      } catch (error) {
        console.error(`❌ Error processing user ${user._id}:`, error.message);
        results.push({ userId: user._id, success: false, error: error.message });
      }
    }

    console.log(`📊 Daily summary complete: ${results.filter(r => r.success).length}/${results.length} successful`);
    return { success: true, results };
  } catch (error) {
    console.error('❌ Daily summary function error:', error);
    throw error;
  }
});

/**
 * Cloud Function: Task Reminder
 * Triggered by Cloud Scheduler via Pub/Sub topic "task-reminder"
 * Runs hourly to check for upcoming task deadlines
 */
functions.cloudEvent('taskReminder', async (cloudEvent) => {
  console.log('⏰ Task Reminder Cloud Function triggered');
  
  try {
    const API_URL = process.env.API_URL || 'http://localhost:5000';
    
    // Calculate time window (next 24 hours)
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Fetch tasks due in the next 24 hours
    const tasksResponse = await axios.get(`${API_URL}/api/tasks`, {
      params: {
        dueDate_gte: now.toISOString(),
        dueDate_lte: tomorrow.toISOString(),
        'status[ne]': 'Completed',
        'reminderSent[ne]': true
      },
      headers: {
        'Authorization': `Bearer ${process.env.API_KEY}`
      }
    });

    const tasks = tasksResponse.data;
    const results = [];

    for (const task of tasks) {
      try {
        if (task.assignedTo) {
          // Send reminder email
          await sendTaskReminderEmail(task.assignedTo, task);
          
          // Mark reminder as sent
          await axios.patch(`${API_URL}/api/tasks/${task._id}`, 
            { reminderSent: true },
            {
              headers: {
                'Authorization': `Bearer ${process.env.API_KEY}`
              }
            }
          );

          results.push({ taskId: task._id, success: true });
          console.log(`✅ Reminder sent for task: ${task.title}`);
        }
      } catch (error) {
        console.error(`❌ Error processing task ${task._id}:`, error.message);
        results.push({ taskId: task._id, success: false, error: error.message });
      }
    }

    console.log(`⏰ Task reminders complete: ${results.filter(r => r.success).length}/${results.length} successful`);
    return { success: true, results };
  } catch (error) {
    console.error('❌ Task reminder function error:', error);
    throw error;
  }
});

/**
 * Cloud Function: Async Task Processor
 * Triggered by Pub/Sub topic "async-tasks"
 * Handles background tasks like report generation, data exports, etc.
 */
functions.cloudEvent('asyncTaskProcessor', async (cloudEvent) => {
  console.log('⚙️ Async Task Processor triggered');
  
  try {
    const data = cloudEvent.data 
      ? JSON.parse(Buffer.from(cloudEvent.data, 'base64').toString())
      : {};

    const { taskType, payload } = data;

    console.log(`Processing async task: ${taskType}`);

    switch (taskType) {
      case 'GENERATE_REPORT':
        await generateReport(payload);
        break;
      
      case 'EXPORT_DATA':
        await exportData(payload);
        break;
      
      case 'BULK_NOTIFICATION':
        await sendBulkNotifications(payload);
        break;
      
      case 'DATA_CLEANUP':
        await performDataCleanup(payload);
        break;
      
      default:
        console.warn(`Unknown task type: ${taskType}`);
    }

    console.log(`✅ Async task completed: ${taskType}`);
    return { success: true, taskType };
  } catch (error) {
    console.error('❌ Async task processor error:', error);
    throw error;
  }
});

/**
 * Helper: Send daily summary email
 */
async function sendDailySummaryEmail(user, tasks, projects) {
  const todayTasks = tasks.filter(task => {
    const dueDate = new Date(task.dueDate);
    const today = new Date();
    return dueDate.toDateString() === today.toDateString();
  });

  const upcomingTasks = tasks.filter(task => {
    const dueDate = new Date(task.dueDate);
    const today = new Date();
    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    return dueDate > today && dueDate <= weekFromNow;
  });

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
          .stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0; }
          .stat-card { background: white; padding: 20px; border-radius: 8px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
          .stat-value { font-size: 36px; font-weight: 700; color: #667eea; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>☀️ Good Morning, ${user.name}!</h1>
            <p>Here's your daily summary</p>
          </div>
          <div style="background: #f9fafb; padding: 30px;">
            <div class="stats">
              <div class="stat-card">
                <div class="stat-value">${todayTasks.length}</div>
                <div style="font-size: 14px; color: #6b7280;">Due Today</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${upcomingTasks.length}</div>
                <div style="font-size: 14px; color: #6b7280;">This Week</div>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  return await emailTransporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: user.email,
    subject: `📊 Your Daily Summary - ${new Date().toLocaleDateString()}`,
    html
  });
}

/**
 * Helper: Send task reminder email
 */
async function sendTaskReminderEmail(user, task) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; }
          .task-card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📋 Task Reminder</h1>
            <p>Hi ${user.name}, you have a task due soon!</p>
          </div>
          <div class="task-card">
            <h2>${task.title}</h2>
            <p><strong>Due:</strong> ${new Date(task.dueDate).toLocaleDateString()}</p>
            <p><strong>Priority:</strong> ${task.priority}</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return await emailTransporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: user.email,
    subject: `Reminder: ${task.title} is due soon`,
    html
  });
}

/**
 * Async task handlers
 */
async function generateReport(payload) {
  console.log('Generating report:', payload);
  // Implement report generation logic
}

async function exportData(payload) {
  console.log('Exporting data:', payload);
  // Implement data export logic
}

async function sendBulkNotifications(payload) {
  console.log('Sending bulk notifications:', payload);
  // Implement bulk notification logic
}

async function performDataCleanup(payload) {
  console.log('Performing data cleanup:', payload);
  // Implement data cleanup logic
}

module.exports = {
  dailySummary: functions.cloudEvent('dailySummary'),
  taskReminder: functions.cloudEvent('taskReminder'),
  asyncTaskProcessor: functions.cloudEvent('asyncTaskProcessor')
};
