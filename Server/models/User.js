const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  uiPreference: {
    type: String,
    enum: ['simple', 'complex'],
    default: null
  },
  hasCreatedFirstTask: {
    type: Boolean,
    default: false
  },
  // Notification preferences
  emailNotifications: {
    type: Boolean,
    default: true
  },
  smsNotifications: {
    type: Boolean,
    default: false
  },
  pushNotifications: {
    type: Boolean,
    default: true
  },
  phone: {
    type: String,
    trim: true
  },
  notificationPreferences: {
    taskReminders: {
      type: Boolean,
      default: true
    },
    dailySummary: {
      type: Boolean,
      default: true
    },
    taskAssignments: {
      type: Boolean,
      default: true
    },
    projectUpdates: {
      type: Boolean,
      default: true
    },
    overdueAlerts: {
      type: Boolean,
      default: true
    },
    reminderHoursBefore: {
      type: Number,
      default: 24, // Hours before due date to send reminder
      min: 1,
      max: 168 // 1 week
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare passwords
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
