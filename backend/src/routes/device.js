const express = require('express');
const router = express.Router();
const Device = require('../models/Device');
const auth = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

/**
 * @route   GET /api/device
 * @desc    Get all devices for user
 * @access  Private
 */
router.get('/', auth, async (req, res) => {
  try {
    const devices = await Device.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json(devices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/device/:id
 * @desc    Get device by ID
 * @access  Private
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const device = await Device.findOne({ _id: req.params.id, userId: req.userId });
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    res.json(device);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/device/register
 * @desc    Register new device
 * @access  Private
 */
router.post('/register', auth, async (req, res) => {
  try {
    const { deviceName, deviceType } = req.body;

    // Validation
    if (!deviceName || !deviceType) {
      return res.status(400).json({ error: 'Device name and type are required' });
    }

    const validTypes = ['Android', 'iOS', 'Windows', 'Linux', 'MacOS'];
    if (!validTypes.includes(deviceType)) {
      return res.status(400).json({ error: 'Invalid device type' });
    }

    const device = new Device({
      userId: req.userId,
      deviceName,
      deviceId: `device_${uuidv4()}`,
      deviceType,
      isOnline: false,
      lastSeen: new Date()
    });

    await device.save();

    res.status(201).json({
      message: 'Device registered successfully',
      device
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   PATCH /api/device/:id/status
 * @desc    Update device online status
 * @access  Private
 */
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { isOnline } = req.body;

    const device = await Device.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { isOnline, lastSeen: new Date() },
      { new: true }
    );

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    res.json({
      message: 'Device status updated',
      device
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   PUT /api/device/:id
 * @desc    Update device details
 * @access  Private
 */
router.put('/:id', auth, async (req, res) => {
  try {
    const { deviceName, deviceType } = req.body;

    const device = await Device.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { deviceName, deviceType },
      { new: true, runValidators: true }
    );

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    res.json({
      message: 'Device updated successfully',
      device
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   DELETE /api/device/:id
 * @desc    Delete device
 * @access  Private
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const device = await Device.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId
    });

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    res.json({ message: 'Device deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
