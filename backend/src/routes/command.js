const express = require('express');
const router = express.Router();
const Command = require('../models/Command');
const auth = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

/**
 * @route   POST /api/command/send
 * @desc    Send command to device
 * @access  Private
 */
router.post('/send', auth, async (req, res) => {
  try {
    const { deviceId, command, parameters } = req.body;

    // Validation
    if (!deviceId || !command) {
      return res.status(400).json({ error: 'Device ID and command are required' });
    }

    const validCommands = [
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
    ];

    if (!validCommands.includes(command)) {
      return res.status(400).json({ error: 'Invalid command' });
    }

    const commandRecord = new Command({
      commandId: `cmd_${uuidv4()}`,
      userId: req.userId,
      deviceId,
      command,
      parameters: parameters || {},
      status: 'pending',
      timestamp: new Date()
    });

    await commandRecord.save();

    res.status(201).json({
      message: 'Command sent successfully',
      commandId: commandRecord._id
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/command/history/:deviceId
 * @desc    Get command history for device
 * @access  Private
 */
router.get('/history/:deviceId', auth, async (req, res) => {
  try {
    const commands = await Command.find({
      userId: req.userId,
      deviceId: req.params.deviceId
    }).sort({ timestamp: -1 }).limit(50);

    res.json(commands);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/command/:id
 * @desc    Get command status
 * @access  Private
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const command = await Command.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!command) {
      return res.status(404).json({ error: 'Command not found' });
    }

    res.json(command);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   PATCH /api/command/:id/status
 * @desc    Update command status
 * @access  Private
 */
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status, response } = req.body;

    const validStatuses = ['pending', 'executing', 'completed', 'failed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const command = await Command.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      {
        status,
        response,
        executedAt: status === 'executing' ? new Date() : undefined,
        completedAt: status === 'completed' ? new Date() : undefined
      },
      { new: true }
    );

    if (!command) {
      return res.status(404).json({ error: 'Command not found' });
    }

    res.json({
      message: 'Command status updated',
      command
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
