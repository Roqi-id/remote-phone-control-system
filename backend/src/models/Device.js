const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  deviceName: {
    type: String,
    required: true
  },
  deviceId: {
    type: String,
    unique: true,
    required: true
  },
  deviceType: {
    type: String,
    enum: ['Android', 'iOS', 'Windows', 'Linux', 'MacOS'],
    required: true
  },
  osVersion: {
    type: String,
    default: null
  },
  appVersion: {
    type: String,
    default: null
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  battery: {
    type: Number,
    default: 0
  },
  storage: {
    type: {
      total: Number,
      used: Number,
      free: Number
    },
    default: {}
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Create geospatial index for location
deviceSchema.index({ 'location': '2dsphere' });

module.exports = mongoose.model('Device', deviceSchema);
