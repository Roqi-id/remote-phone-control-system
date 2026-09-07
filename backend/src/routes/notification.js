const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');

/**
 * @route   GET /api/notification
 * @desc    Get user notifications
 * @access  Private
 */
router.get('/', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/notification/send
 * @desc    Send notification to device
 * @access  Private
 */
router.post('/send', auth, async (req, res) => {
  try {
    const { deviceId, title, message, data } = req.body;

    if (!deviceId || !title || !message) {
      return res.status(400).json({ error: 'Device ID, title, and message are required' });
    }

    const notification = new Notification({
      userId: req.userId,
      deviceId,
      title,
      message,
      data: data || {},
      isRead: false,
      sentAt: new Date()
    });

    await notification.save();

    res.status(201).json({
      message: 'Notification sent',
      notification
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   PATCH /api/notification/:id/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.patch('/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({
      message: 'Notification marked as read',
      notification
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
