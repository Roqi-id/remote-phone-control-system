const Command = require('../models/Command');
const Device = require('../models/Device');
const Notification = require('../models/Notification');
const { v4: uuidv4 } = require('uuid');

/**
 * Socket.IO event handlers
 * Menangani real-time communication antara server, web dashboard, dan mobile app
 */
module.exports = (io) => {
  // Store user connections
  const userConnections = new Map();

  io.on('connection', (socket) => {
    console.log(`📱 Client connected: ${socket.id}`);

    /**
     * User Login
     * Register user connection untuk tracking
     */
    socket.on('user_login', (data) => {
      try {
        const userId = data.userId;
        
        if (!userConnections.has(userId)) {
          userConnections.set(userId, []);
        }
        userConnections.get(userId).push(socket.id);
        socket.userId = userId;
        socket.join(`user_${userId}`);

        console.log(`✅ User ${userId} connected via ${socket.id}`);
        socket.emit('login_success', { message: 'Connected to server' });
      } catch (error) {
        console.error('Login error:', error);
        socket.emit('error', { message: error.message });
      }
    });

    /**
     * Device Registration
     * Register device dengan socket server
     */
    socket.on('register_device', async (data) => {
      try {
        const { deviceId, userId } = data;

        if (!deviceId || !userId) {
          socket.emit('error', { message: 'Device ID and User ID are required' });
          return;
        }

        socket.deviceId = deviceId;
        socket.userId = userId;
        socket.join(`device_${deviceId}`);
        socket.join(`user_${userId}`);

        // Update device status
        await Device.findOneAndUpdate(
          { deviceId },
          { isOnline: true, lastSeen: new Date() }
        );

        console.log(`📱 Device ${deviceId} registered`);
        
        // Notify all connected clients about device online
        io.to(`user_${userId}`).emit('device_online', {
          deviceId,
          isOnline: true,
          timestamp: new Date()
        });

        socket.emit('device_registered', { message: 'Device registered successfully' });
      } catch (error) {
        console.error('Device registration error:', error);
        socket.emit('error', { message: error.message });
      }
    });

    /**
     * Send Command dari Dashboard ke Device
     */
    socket.on('send_command', async (data) => {
      try {
        const { deviceId, command, parameters, userId } = data;

        if (!deviceId || !command) {
          socket.emit('error', { message: 'Device ID and command are required' });
          return;
        }

        // Create command record
        const commandRecord = new Command({
          commandId: `cmd_${uuidv4()}`,
          userId,
          deviceId,
          command,
          parameters: parameters || {},
          status: 'pending',
          timestamp: new Date()
        });

        await commandRecord.save();

        // Forward command to device
        io.to(`device_${deviceId}`).emit('execute_command', {
          commandId: commandRecord._id,
          command,
          parameters,
          timestamp: new Date()
        });

        console.log(`🔄 Command sent: ${command} to device ${deviceId}`);
        socket.emit('command_sent', { commandId: commandRecord._id });
      } catch (error) {
        console.error('Send command error:', error);
        socket.emit('error', { message: error.message });
      }
    });

    /**
     * Command Execution Update
     * Device melaporkan progress eksekusi command
     */
    socket.on('command_executed', async (data) => {
      try {
        const { commandId, status, response, userId } = data;

        // Update command status
        const command = await Command.findByIdAndUpdate(
          commandId,
          {
            status,
            response,
            executedAt: new Date(),
            completedAt: status === 'completed' ? new Date() : undefined
          },
          { new: true }
        );

        console.log(`✅ Command ${commandId} status: ${status}`);

        // Notify dashboard about command result
        io.to(`user_${userId}`).emit('command_status_update', {
          commandId,
          status,
          response,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('Command execution update error:', error);
        socket.emit('error', { message: error.message });
      }
    });

    /**
     * Send Notification ke Device
     */
    socket.on('send_notification', async (data) => {
      try {
        const { deviceId, title, message, data: notifData, userId } = data;

        if (!deviceId || !title || !message) {
          socket.emit('error', { message: 'Device ID, title, and message are required' });
          return;
        }

        // Save notification
        const notification = new Notification({
          userId,
          deviceId,
          title,
          message,
          data: notifData || {},
          isRead: false,
          sentAt: new Date()
        });

        await notification.save();

        // Send to device
        io.to(`device_${deviceId}`).emit('receive_notification', {
          notificationId: notification._id,
          title,
          message,
          data: notifData
        });

        console.log(`📬 Notification sent to device ${deviceId}`);
        socket.emit('notification_sent', { notificationId: notification._id });
      } catch (error) {
        console.error('Send notification error:', error);
        socket.emit('error', { message: error.message });
      }
    });

    /**
     * Device Status Update
     * Device mengirim status info (battery, location, storage, dll)
     */
    socket.on('device_status_update', async (data) => {
      try {
        const { deviceId, battery, storage, location, userId } = data;

        // Update device info
        const updateData = {};
        if (battery !== undefined) updateData.battery = battery;
        if (storage) updateData.storage = storage;
        if (location) {
          updateData.location = {
            type: 'Point',
            coordinates: [location.longitude, location.latitude]
          };
        }

        await Device.findOneAndUpdate(
          { deviceId },
          { ...updateData, lastSeen: new Date() }
        );

        // Broadcast to all connected clients
        io.to(`user_${userId}`).emit('device_status', {
          deviceId,
          battery,
          storage,
          location,
          timestamp: new Date()
        });

        console.log(`📊 Device ${deviceId} status updated`);
      } catch (error) {
        console.error('Device status update error:', error);
        socket.emit('error', { message: error.message });
      }
    });

    /**
     * Screen Streaming
     * Device mengirim screen frame
     */
    socket.on('screen_frame', (data) => {
      try {
        const { deviceId, frame, userId } = data;

        // Forward to all dashboard clients
        io.to(`user_${userId}`).emit('screen_update', {
          deviceId,
          frame,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('Screen frame error:', error);
      }
    });

    /**
     * Handle Disconnect
     */
    socket.on('disconnect', async () => {
      try {
        console.log(`❌ Client disconnected: ${socket.id}`);

        // Update device status to offline
        if (socket.deviceId) {
          await Device.findOneAndUpdate(
            { deviceId: socket.deviceId },
            { isOnline: false, lastSeen: new Date() }
          );

          // Notify clients
          io.to(`user_${socket.userId}`).emit('device_offline', {
            deviceId: socket.deviceId,
            isOnline: false,
            timestamp: new Date()
          });
        }

        // Remove user connection
        if (socket.userId && userConnections.has(socket.userId)) {
          const connections = userConnections.get(socket.userId);
          const index = connections.indexOf(socket.id);
          if (index > -1) {
            connections.splice(index, 1);
          }
        }
      } catch (error) {
        console.error('Disconnect error:', error);
      }
    });

    /**
     * Error Handling
     */
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  // Periodic device status check
  setInterval(() => {
    console.log(`📊 Active connections: ${io.engine.clientsCount}`);
  }, 60000);
};
