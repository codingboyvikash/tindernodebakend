const chatService = require('../services/chatService');
const { cloudinary, isCloudinaryConfigured } = require('../config/cloudinary');
const fs = require('fs');
const AppError = require('../utils/appError');

exports.getMatchesAndChats = async (req, res, next) => {
  try {
    const data = await chatService.getMatchesAndChats(req.user._id);
    res.status(200).json({
      status: 'success',
      data,
    });
  } catch (error) {
    next(error);
  }
};

exports.getMessages = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    const messages = await chatService.getMessages(chatId, req.user._id, page, limit);
    res.status(200).json({
      status: 'success',
      results: messages.length,
      data: messages,
    });
  } catch (error) {
    next(error);
  }
};

exports.sendMessage = async (req, res, next) => {
  try {
    const { chatId, content, replyTo } = req.body;
    
    if (!chatId) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return next(new AppError('chatId is required', 400));
    }

    const attachments = [];

    // Handle uploaded file attachment if present
    if (req.file) {
      const file = req.file;
      let fileUrl = '';
      const isAudio = file.mimetype.startsWith('audio/') || file.originalname.endsWith('.m4a') || file.originalname.endsWith('.mp3');
      const attachmentType = isAudio ? 'audio' : 'image';

      if (isCloudinaryConfigured) {
        try {
          const resourceType = isAudio ? 'video' : 'image'; // Cloudinary uploads audio files under resource_type 'video'
          const result = await cloudinary.uploader.upload(file.path, {
            folder: 'tinder_attachments',
            resource_type: resourceType,
          });
          fileUrl = result.secure_url;
          if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        } catch (err) {
          if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
          return next(new AppError(`Attachment Upload Error: ${err.message}`, 500));
        }
      } else {
        fileUrl = `/uploads/${file.filename}`;
      }

      attachments.push({
        type: attachmentType,
        url: fileUrl,
      });
    }

    if (!content && attachments.length === 0) {
      return next(new AppError('Message content or attachment is required', 400));
    }

    const message = await chatService.sendMessage(req.user._id, chatId, content, attachments, replyTo);

    // Broadcast message via Socket.IO if instance is linked to Express app
    const io = req.app.get('io');
    if (io) {
      io.to(chatId).emit('message_received', message);
    }

    res.status(201).json({
      status: 'success',
      data: message,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteMessage = async (req, res, next) => {
  try {
    const { messageId, action } = req.body;
    if (!messageId || !action) {
      return next(new AppError('Please provide messageId and delete action (me/everyone)', 400));
    }

    const message = await chatService.deleteMessage(req.user._id, messageId, action);
    res.status(200).json({
      status: 'success',
      data: message,
    });
  } catch (error) {
    next(error);
  }
};
