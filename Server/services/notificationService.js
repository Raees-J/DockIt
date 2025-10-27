const nodemailer = require('nodemailer');
const twilio = require('twilio');

// Email configuration using SendGrid or Gmail
const emailTransporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Twilio configuration for SMS
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

class NotificationService {
  /**
   * Send email notification
   */
  async sendEmail({ to, subject, html, text }) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to,
        subject,
        html,
        text
      };

      const info = await emailTransporter.sendMail(mailOptions);
      console.log('Email sent successfully:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Error sending email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send SMS notification
   */
  async sendSMS({ to, message }) {
    if (!twilioClient) {
      console.warn('Twilio not configured, skipping SMS');
      return { success: false, error: 'Twilio not configured' };
    }

    try {
      const result = await twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to
      });

      console.log('SMS sent successfully:', result.sid);
      return { success: true, sid: result.sid };
    } catch (error) {
      console.error('Error sending SMS:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send task reminder notification
   */
  async sendTaskReminder(user, task) {
    const subject = `Reminder: ${task.title} is due soon`;
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .task-card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
            .priority { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
            .priority-high { background: #fee2e2; color: #991b1b; }
            .priority-medium { background: #fed7aa; color: #9a3412; }
            .priority-low { background: #d1fae5; color: #065f46; }
            .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 20px; }
            .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📋 Task Reminder</h1>
              <p>Hi ${user.name}, you have a task due soon!</p>
            </div>
            <div class="content">
              <div class="task-card">
                <h2>${task.title}</h2>
                <p><strong>Due Date:</strong> ${new Date(task.dueDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                ${task.dueTime ? `<p><strong>Due Time:</strong> ${task.dueTime}</p>` : ''}
                <p><strong>Priority:</strong> <span class="priority priority-${task.priority?.toLowerCase()}">${task.priority}</span></p>
                ${task.description ? `<p><strong>Description:</strong> ${task.description}</p>` : ''}
                ${task.project ? `<p><strong>Project:</strong> ${task.project.title || task.project}</p>` : ''}
                <a href="${process.env.APP_URL || 'http://localhost:3000'}/dashboard" class="button">View Task</a>
              </div>
            </div>
            <div class="footer">
              <p>You're receiving this because you have notifications enabled.</p>
              <p>© 2025 Task Manager. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `Task Reminder: ${task.title} is due on ${new Date(task.dueDate).toLocaleDateString()}. Priority: ${task.priority}`;

    // Send email
    const emailResult = await this.sendEmail({
      to: user.email,
      subject,
      html,
      text
    });

    // Send SMS if phone number is available
    let smsResult = null;
    if (user.phone && user.smsNotifications) {
      smsResult = await this.sendSMS({
        to: user.phone,
        message: `Reminder: "${task.title}" is due soon. Check your task manager for details.`
      });
    }

    return { email: emailResult, sms: smsResult };
  }

  /**
   * Send daily summary
   */
  async sendDailySummary(user, tasks, projects) {
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

    const subject = `📊 Your Daily Summary - ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
            .content { background: #f9fafb; padding: 30px; }
            .stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0; }
            .stat-card { background: white; padding: 20px; border-radius: 8px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
            .stat-value { font-size: 36px; font-weight: 700; color: #667eea; }
            .stat-label { font-size: 14px; color: #6b7280; margin-top: 5px; }
            .section { margin: 30px 0; }
            .section-title { font-size: 18px; font-weight: 600; color: #1f2937; margin-bottom: 15px; }
            .task-item { background: white; padding: 15px; border-radius: 6px; margin-bottom: 10px; border-left: 4px solid #667eea; }
            .task-title { font-weight: 600; color: #1f2937; }
            .task-meta { font-size: 13px; color: #6b7280; margin-top: 5px; }
            .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 20px; }
            .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>☀️ Good Morning, ${user.name}!</h1>
              <p>Here's your daily summary</p>
            </div>
            <div class="content">
              <div class="stats">
                <div class="stat-card">
                  <div class="stat-value">${todayTasks.length}</div>
                  <div class="stat-label">Due Today</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value">${upcomingTasks.length}</div>
                  <div class="stat-label">This Week</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value">${tasks.filter(t => t.status === 'Completed').length}</div>
                  <div class="stat-label">Completed</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value">${projects.length}</div>
                  <div class="stat-label">Active Projects</div>
                </div>
              </div>

              ${todayTasks.length > 0 ? `
                <div class="section">
                  <h3 class="section-title">📅 Due Today</h3>
                  ${todayTasks.slice(0, 5).map(task => `
                    <div class="task-item">
                      <div class="task-title">${task.title}</div>
                      <div class="task-meta">${task.priority} Priority ${task.dueTime ? `• ${task.dueTime}` : ''}</div>
                    </div>
                  `).join('')}
                  ${todayTasks.length > 5 ? `<p style="color: #6b7280; font-size: 14px;">+ ${todayTasks.length - 5} more tasks</p>` : ''}
                </div>
              ` : '<div class="section"><p style="color: #6b7280;">🎉 No tasks due today. Enjoy your day!</p></div>'}

              ${upcomingTasks.length > 0 ? `
                <div class="section">
                  <h3 class="section-title">⏰ Upcoming This Week</h3>
                  ${upcomingTasks.slice(0, 3).map(task => `
                    <div class="task-item">
                      <div class="task-title">${task.title}</div>
                      <div class="task-meta">${new Date(task.dueDate).toLocaleDateString()} • ${task.priority} Priority</div>
                    </div>
                  `).join('')}
                </div>
              ` : ''}

              <div style="text-align: center;">
                <a href="${process.env.APP_URL || 'http://localhost:3000'}/dashboard" class="button">Open Task Manager</a>
              </div>
            </div>
            <div class="footer">
              <p>Daily summary sent at ${new Date().toLocaleTimeString()}</p>
              <p>© 2025 Task Manager. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return await this.sendEmail({
      to: user.email,
      subject,
      html,
      text: `Daily Summary: ${todayTasks.length} tasks due today, ${upcomingTasks.length} upcoming this week.`
    });
  }

  /**
   * Send task assignment notification
   */
  async sendTaskAssignment(user, task, assignedBy) {
    const subject = `New Task Assigned: ${task.title}`;
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .task-card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
            .priority { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; }
            .priority-high { background: #fee2e2; color: #991b1b; }
            .priority-medium { background: #fed7aa; color: #9a3412; }
            .priority-low { background: #d1fae5; color: #065f46; }
            .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎯 New Task Assignment</h1>
              <p>${assignedBy.name} has assigned you a new task</p>
            </div>
            <div class="content">
              <div class="task-card">
                <h2>${task.title}</h2>
                ${task.description ? `<p>${task.description}</p>` : ''}
                <p><strong>Due Date:</strong> ${new Date(task.dueDate).toLocaleDateString()}</p>
                <p><strong>Priority:</strong> <span class="priority priority-${task.priority?.toLowerCase()}">${task.priority}</span></p>
                ${task.project ? `<p><strong>Project:</strong> ${task.project.title || task.project}</p>` : ''}
                <a href="${process.env.APP_URL || 'http://localhost:3000'}/dashboard" class="button">View Task</a>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    return await this.sendEmail({
      to: user.email,
      subject,
      html,
      text: `${assignedBy.name} assigned you a task: ${task.title}. Due: ${new Date(task.dueDate).toLocaleDateString()}`
    });
  }

  /**
   * Send project update notification
   */
  async sendProjectUpdate(user, project, updateType, message) {
    const subject = `Project Update: ${project.title || project.name}`;
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .update-card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
            .button { display: inline-block; padding: 12px 24px; background: #f5576c; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📋 Project Update</h1>
              <p>${updateType}</p>
            </div>
            <div class="content">
              <div class="update-card">
                <h2>${project.title || project.name}</h2>
                <p>${message}</p>
                ${project.status ? `<p><strong>Status:</strong> ${project.status}</p>` : ''}
                <a href="${process.env.APP_URL || 'http://localhost:3000'}/projects" class="button">View Project</a>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    return await this.sendEmail({
      to: user.email,
      subject,
      html,
      text: `Project Update: ${project.title || project.name} - ${message}`
    });
  }
}

module.exports = new NotificationService();
