# Task Manager - Cloud Functions Deployment Guide

## Overview
This directory contains Google Cloud Functions for handling notifications and background processing.

## Prerequisites

1. **Google Cloud Project**
   ```bash
   gcloud projects create task-manager-project
   gcloud config set project task-manager-project
   ```

2. **Enable Required APIs**
   ```bash
   gcloud services enable cloudfunctions.googleapis.com
   gcloud services enable cloudscheduler.googleapis.com
   gcloud services enable pubsub.googleapis.com
   gcloud services enable cloudbuild.googleapis.com
   ```

3. **Install Dependencies**
   ```bash
   npm install
   ```

## Environment Variables

Create a `.env.yaml` file with the following variables:

```yaml
EMAIL_SERVICE: "gmail"
EMAIL_USER: "your-email@gmail.com"
EMAIL_PASSWORD: "your-app-specific-password"
EMAIL_FROM: "Task Manager <noreply@taskmanager.com>"
API_URL: "https://your-api.com"
API_KEY: "your-api-key"
APP_URL: "https://your-app.com"
TWILIO_ACCOUNT_SID: "your-twilio-sid"
TWILIO_AUTH_TOKEN: "your-twilio-token"
TWILIO_PHONE_NUMBER: "+1234567890"
```

## Deployment

### 1. Deploy Daily Summary Function

```bash
gcloud functions deploy dailySummary \
  --gen2 \
  --runtime=nodejs18 \
  --region=us-central1 \
  --source=. \
  --entry-point=dailySummary \
  --trigger-topic=daily-summary \
  --env-vars-file=.env.yaml \
  --memory=256MB \
  --timeout=300s
```

### 2. Deploy Task Reminder Function

```bash
gcloud functions deploy taskReminder \
  --gen2 \
  --runtime=nodejs18 \
  --region=us-central1 \
  --source=. \
  --entry-point=taskReminder \
  --trigger-topic=task-reminder \
  --env-vars-file=.env.yaml \
  --memory=256MB \
  --timeout=300s
```

### 3. Deploy Async Task Processor

```bash
gcloud functions deploy asyncTaskProcessor \
  --gen2 \
  --runtime=nodejs18 \
  --region=us-central1 \
  --source=. \
  --entry-point=asyncTaskProcessor \
  --trigger-topic=async-tasks \
  --env-vars-file=.env.yaml \
  --memory=512MB \
  --timeout=540s
```

## Cloud Scheduler Setup

### 1. Daily Summary (8 AM every day)

```bash
gcloud scheduler jobs create pubsub daily-summary-job \
  --location=us-central1 \
  --schedule="0 8 * * *" \
  --time-zone="America/New_York" \
  --topic=daily-summary \
  --message-body='{"trigger":"scheduled"}'
```

### 2. Task Reminders (Every hour)

```bash
gcloud scheduler jobs create pubsub task-reminder-job \
  --location=us-central1 \
  --schedule="0 * * * *" \
  --time-zone="America/New_York" \
  --topic=task-reminder \
  --message-body='{"trigger":"scheduled"}'
```

### 3. Overdue Check (9 AM every day)

```bash
gcloud scheduler jobs create pubsub overdue-check-job \
  --location=us-central1 \
  --schedule="0 9 * * *" \
  --time-zone="America/New_York" \
  --topic=task-reminder \
  --message-body='{"trigger":"overdue-check"}'
```

## Pub/Sub Topics

Create the required Pub/Sub topics:

```bash
gcloud pubsub topics create daily-summary
gcloud pubsub topics create task-reminder
gcloud pubsub topics create async-tasks
```

## Trigger Async Tasks from Your App

```javascript
const { PubSub } = require('@google-cloud/pubsub');
const pubsub = new PubSub();

// Example: Trigger report generation
async function triggerReportGeneration(userId) {
  const topic = pubsub.topic('async-tasks');
  const data = {
    taskType: 'GENERATE_REPORT',
    payload: { userId, reportType: 'monthly' }
  };
  
  await topic.publishMessage({ 
    data: Buffer.from(JSON.stringify(data)) 
  });
}

// Example: Trigger data export
async function triggerDataExport(userId) {
  const topic = pubsub.topic('async-tasks');
  const data = {
    taskType: 'EXPORT_DATA',
    payload: { userId, format: 'csv' }
  };
  
  await topic.publishMessage({ 
    data: Buffer.from(JSON.stringify(data)) 
  });
}
```

## Monitoring

View function logs:
```bash
gcloud functions logs read dailySummary --region=us-central1 --limit=50
gcloud functions logs read taskReminder --region=us-central1 --limit=50
gcloud functions logs read asyncTaskProcessor --region=us-central1 --limit=50
```

View scheduler job status:
```bash
gcloud scheduler jobs list --location=us-central1
```

## Testing

Test functions locally:
```bash
npm install @google-cloud/functions-framework
npm start
```

Manually trigger a function:
```bash
gcloud functions call dailySummary \
  --region=us-central1 \
  --data='{"trigger":"manual"}'
```

## Cost Optimization

1. **Adjust Memory**: Start with 256MB and scale up if needed
2. **Set Timeouts**: Prevent runaway functions
3. **Use Regional Deployment**: Choose region closest to your users
4. **Monitor Invocations**: Set up billing alerts

## Security Best Practices

1. **Use Secret Manager** for sensitive credentials:
   ```bash
   echo -n "my-secret-value" | gcloud secrets create email-password --data-file=-
   ```

2. **Restrict IAM Permissions**:
   ```bash
   gcloud functions add-iam-policy-binding dailySummary \
     --member="serviceAccount:your-service-account@project.iam.gserviceaccount.com" \
     --role="roles/cloudfunctions.invoker"
   ```

3. **Enable VPC Connector** for private network access

## Troubleshooting

Common issues:

1. **Function timeout**: Increase timeout or optimize code
2. **Out of memory**: Increase memory allocation
3. **Permission denied**: Check IAM roles
4. **Missing environment variables**: Verify .env.yaml

## Cleanup

Remove all resources:
```bash
gcloud scheduler jobs delete daily-summary-job --location=us-central1
gcloud scheduler jobs delete task-reminder-job --location=us-central1
gcloud functions delete dailySummary --region=us-central1
gcloud functions delete taskReminder --region=us-central1
gcloud functions delete asyncTaskProcessor --region=us-central1
gcloud pubsub topics delete daily-summary
gcloud pubsub topics delete task-reminder
gcloud pubsub topics delete async-tasks
```
