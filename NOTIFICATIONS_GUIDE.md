# Enhanced Notifications and Background Processing System

## Overview

This task manager now includes a comprehensive notification and background processing system powered by:
- **Node-Cron**: Scheduled jobs running on the Node.js server
- **Google Cloud Functions**: Serverless functions for scalable processing
- **Cloud Scheduler**: Managed cron jobs in Google Cloud
- **Pub/Sub**: Message queue for async task processing
- **Nodemailer**: Email notifications
- **Twilio**: SMS notifications (optional)

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Task Manager App                      │
└─────────────────────┬───────────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        │                           │
┌───────▼────────┐         ┌────────▼────────┐
│  Node.js Server │         │  Cloud Functions │
│  (Job Scheduler)│         │  (GCP Serverless)│
└───────┬────────┘         └────────┬─────────┘
        │                           │
   ┌────┴────┐                 ┌────┴────┐
   │ MongoDB │                 │ Pub/Sub  │
   └─────────┘                 └──────────┘
        │                           │
   ┌────┴─────────┬─────────────────┴───────┐
   │              │                          │
┌──▼───┐    ┌────▼────┐              ┌──────▼──────┐
│Email │    │   SMS   │              │Cloud Scheduler│
└──────┘    └─────────┘              └──────────────┘
```

## Features

### 1. Scheduled Notifications

#### Daily Summary (8 AM)
- Sent every morning at 8 AM
- Includes:
  - Tasks due today
  - Tasks due this week
  - Completed tasks count
  - Active projects count
- Beautiful HTML email template

#### Task Reminders (Hourly)
- Checks every hour for upcoming tasks
- Sends reminders 24 hours before due date
- Prevents duplicate reminders
- Includes task details, priority, and due date

#### Overdue Alerts (9 AM)
- Daily check for overdue tasks
- Sends consolidated overdue list
- Grouped by user

### 2. Event-Based Notifications

#### Task Assignment
- Triggered when a task is assigned
- Notifies the assigned user immediately
- Shows who assigned the task

#### Project Updates
- Milestone changes
- Status updates
- Member additions

#### Task Completion
- Notifies project owner
- Updates team members

### 3. Background Processing

Async tasks handled by Cloud Functions:
- **Report Generation**: Generate PDF/CSV reports
- **Data Export**: Export user data
- **Bulk Notifications**: Send notifications to multiple users
- **Data Cleanup**: Archive old completed tasks

## Setup Instructions

### 1. Install Dependencies

```bash
cd server
npm install
```

New packages added:
- `node-cron`: ^3.0.3
- `nodemailer`: ^6.9.7
- `twilio`: ^4.19.0 (optional)
- `@google-cloud/pubsub`: ^4.0.0

### 2. Configure Environment Variables

Update your `.env` file:

```bash
# Email Configuration
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-specific-password
EMAIL_FROM=Task Manager <noreply@taskmanager.com>

# SMS (Optional)
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+1234567890

# Scheduled Jobs
ENABLE_SCHEDULED_JOBS=true

# App URL (for email links)
APP_URL=http://localhost:3000
```

#### Getting Gmail App Password:
1. Go to Google Account settings
2. Security → 2-Step Verification → App passwords
3. Generate new app password
4. Use that password in EMAIL_PASSWORD

### 3. Start the Server

```bash
npm run dev
```

You should see:
```
🕐 Initializing scheduled jobs...
📅 Daily summary job scheduled (8 AM)
⏰ Task reminder job scheduled (hourly)
⚠️ Overdue check job scheduled (9 AM)
✅ All scheduled jobs initialized
```

### 4. Deploy Cloud Functions (Optional)

For production scalability:

```bash
cd cloud-functions
npm install

# Deploy functions
npm run deploy:daily-summary
npm run deploy:task-reminder
npm run deploy:async-processor
```

See `cloud-functions/DEPLOYMENT.md` for detailed instructions.

## API Endpoints

### Get Notifications
```
GET /api/notifications
Query params:
  - read: boolean (filter by read status)
  - type: string (filter by notification type)
  - limit: number (default: 50)
  - skip: number (default: 0)

Response:
{
  "notifications": [...],
  "pagination": {
    "total": 100,
    "limit": 50,
    "skip": 0,
    "hasMore": true
  },
  "unreadCount": 5
}
```

### Get Unread Count
```
GET /api/notifications/unread-count

Response:
{
  "count": 5
}
```

### Mark as Read
```
PATCH /api/notifications/:id/read

Response:
{
  "_id": "...",
  "read": true,
  "readAt": "2025-01-15T10:30:00.000Z"
}
```

### Mark All as Read
```
POST /api/notifications/mark-all-read

Response:
{
  "message": "All notifications marked as read"
}
```

### Delete Notification
```
DELETE /api/notifications/:id

Response:
{
  "message": "Notification deleted"
}
```

### Test Endpoints

#### Test Daily Summary
```
POST /api/notifications/test/daily-summary
Authorization: Bearer <token>

Response:
{
  "message": "Daily summary sent",
  "result": {
    "success": true,
    "messageId": "..."
  }
}
```

#### Test Task Reminder
```
POST /api/notifications/test/task-reminder/:taskId
Authorization: Bearer <token>

Response:
{
  "message": "Task reminder sent",
  "result": {
    "success": true,
    "messageId": "..."
  }
}
```

## User Preferences

Users can customize their notification preferences:

```javascript
// User model includes:
{
  emailNotifications: true,        // Receive email notifications
  smsNotifications: false,          // Receive SMS notifications
  pushNotifications: true,          // Receive push notifications
  phone: "+1234567890",             // Phone number for SMS
  notificationPreferences: {
    taskReminders: true,            // Task due date reminders
    dailySummary: true,             // Daily summary emails
    taskAssignments: true,          // New task assignments
    projectUpdates: true,           // Project changes
    overdueAlerts: true,            // Overdue task alerts
    reminderHoursBefore: 24         // Hours before due date
  }
}
```

## Notification Types

| Type | Description | Channels |
|------|-------------|----------|
| TASK_REMINDER | Task due soon | Email, SMS |
| TASK_ASSIGNED | New task assigned | Email, Push |
| TASK_COMPLETED | Task marked complete | Email |
| TASK_OVERDUE | Task is overdue | Email, SMS |
| DAILY_SUMMARY | Daily activity summary | Email |
| PROJECT_UPDATE | Project changed | Email |
| PROJECT_MILESTONE | Milestone reached | Email, Push |
| COMMENT_ADDED | New comment | Email, Push |
| MENTION | User mentioned | Email, Push |

## Cron Schedule Reference

```
* * * * * - Every minute
0 * * * * - Every hour
0 8 * * * - Every day at 8 AM
0 9 * * * - Every day at 9 AM
0 0 * * * - Every day at midnight
0 0 * * 0 - Every Sunday at midnight
0 0 1 * * - First day of month
```

## Background Task Processing

Trigger async tasks using Pub/Sub:

```javascript
const { PubSub } = require('@google-cloud/pubsub');
const pubsub = new PubSub();

// Trigger report generation
async function generateReport(userId) {
  const topic = pubsub.topic('async-tasks');
  const data = {
    taskType: 'GENERATE_REPORT',
    payload: { 
      userId, 
      reportType: 'monthly',
      format: 'pdf'
    }
  };
  
  await topic.publishMessage({ 
    data: Buffer.from(JSON.stringify(data)) 
  });
}

// Trigger data export
async function exportData(userId) {
  const topic = pubsub.topic('async-tasks');
  const data = {
    taskType: 'EXPORT_DATA',
    payload: { 
      userId, 
      format: 'csv',
      includeArchived: true
    }
  };
  
  await topic.publishMessage({ 
    data: Buffer.from(JSON.stringify(data)) 
  });
}
```

## Email Templates

All emails use responsive HTML templates with:
- Beautiful gradients and colors
- Mobile-friendly design
- Clear call-to-action buttons
- Professional branding
- Unsubscribe links

Templates are in `server/services/notificationService.js`

## Monitoring & Debugging

### View Logs
```bash
# Local server logs
tail -f logs/app.log

# Cloud Function logs
gcloud functions logs read dailySummary --region=us-central1 --limit=50
```

### Test Notifications Manually

```javascript
// In Node.js console or test script
const notificationService = require('./services/notificationService');

// Test email
await notificationService.sendEmail({
  to: 'user@example.com',
  subject: 'Test Email',
  html: '<h1>Test</h1>',
  text: 'Test'
});

// Test SMS
await notificationService.sendSMS({
  to: '+1234567890',
  message: 'Test SMS from Task Manager'
});
```

## Production Considerations

1. **Rate Limiting**: Implement rate limits to prevent email/SMS spam
2. **Unsubscribe**: Add unsubscribe links to all emails
3. **Error Handling**: Log failed notifications for retry
4. **Queue Management**: Use Cloud Tasks for guaranteed delivery
5. **Cost Monitoring**: Monitor GCP and Twilio usage
6. **GDPR Compliance**: Allow users to delete notification history
7. **Email Deliverability**: Use SendGrid or AWS SES for better delivery
8. **Retry Logic**: Implement exponential backoff for failed sends

## Troubleshooting

### Emails not sending
1. Check EMAIL_USER and EMAIL_PASSWORD are correct
2. Enable "Less secure app access" for Gmail (or use app password)
3. Check spam folder
4. Verify email service is configured correctly

### Jobs not running
1. Verify ENABLE_SCHEDULED_JOBS=true
2. Check server logs for initialization messages
3. Ensure server stayed running (not just started and stopped)

### SMS not working
1. Verify Twilio credentials are correct
2. Check phone number format (+1234567890)
3. Verify Twilio account has funds
4. Check user has smsNotifications enabled

## Future Enhancements

- [ ] Push notifications (Web Push API)
- [ ] In-app notification center
- [ ] Notification batching (digest emails)
- [ ] Custom notification templates
- [ ] Notification preferences UI
- [ ] Slack/Teams integration
- [ ] Webhook notifications
- [ ] Rich media in notifications (images, charts)

## Cost Estimates

### Google Cloud Functions (Free Tier)
- 2 million invocations/month free
- 400,000 GB-seconds compute time free
- 200,000 GHz-seconds compute time free
- ~$0 for small to medium apps

### Cloud Scheduler
- 3 jobs free per month
- $0.10 per additional job/month

### Twilio SMS
- $0.0075 per SMS (US)
- $0.0085 per MMS (US)

### Email (Gmail)
- Free up to ~500 emails/day
- Consider SendGrid (100/day free) or AWS SES ($0.10 per 1000 emails) for production

## Support

For questions or issues:
1. Check logs first
2. Review environment variables
3. Test with manual trigger endpoints
4. Check GCP console for Cloud Function errors
5. Review Twilio/SendGrid dashboards
