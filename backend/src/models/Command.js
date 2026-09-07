const mongoose = require('mongoose');

const commandSchema = new mongoose.Schema({
  commandId: {
    type: String,
    unique: true,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  deviceId: {
    type: String,
    required: true
  },
  command: {
    type: String,
    enum: [
      'lock_screen',
      'unlock_screen',
      'take_screenshot',
      'open_app',
      'close_app',
      'restart',
      'shutdown',
      'get_location',
      'send_sms',
      'make_call',
      'play_sound',
      'vibrate',
      'get_battery',
      'get_storage',
      'get_contacts',
      'get_call_logs'
    ],
    required: true
  },
  parameters: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  status: {
    type: String,
    enum: ['pending', 'executing', 'completed', 'failed'],
    default: 'pending'
  },
  response: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  error: {
    type: String,
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  executedAt: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('Command', commandSchema);
