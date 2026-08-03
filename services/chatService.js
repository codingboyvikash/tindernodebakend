const ChatRoom = require('../models/ChatRoom');
const Message = require('../models/Message');
const Match = require('../models/Match');
const Profile = require('../models/Profile');
const AppError = require('../utils/appError');

exports.getMatchesAndChats = async (userId) => {
  // 1. Fetch matches
  const matches = await Match.find({ users: userId }).populate('users', 'email');

  const formattedMatches = [];
  
  // Make sure each match has a chatRoom, create if missing
  for (const match of matches) {
    if (!match.users || !Array.isArray(match.users)) continue;
    const otherUser = match.users.find((u) => u && u._id && u._id.toString() !== userId.toString());
    if (!otherUser) continue;

    const otherProfile = await Profile.findOne({ user: otherUser._id }).select('displayName photos bio isOnline lastSeen');
    if (!otherProfile) continue;

    let chatRoom = match.chatRoom;
    if (!chatRoom) {
      // Create new chat room
      chatRoom = new ChatRoom({
        users: [userId, otherUser._id],
      });
      await chatRoom.save();
      
      // Update match document
      match.chatRoom = chatRoom._id;
      await match.save();
    }

    formattedMatches.push({
      matchId: match._id,
      chatRoomId: chatRoom._id || chatRoom,
      profile: otherProfile,
    });
  }

  // 2. Fetch active chat rooms populated with latest message
  const chatRooms = await ChatRoom.find({ users: userId })
    .populate('latestMessage')
    .sort({ updatedAt: -1 });

  const formattedChats = [];
  for (const room of chatRooms) {
    const otherUserId = room.users.find((id) => id.toString() !== userId.toString());
    if (!otherUserId) continue;

    const otherProfile = await Profile.findOne({ user: otherUserId }).select('displayName photos bio isOnline lastSeen');
    if (!otherProfile) continue;

    formattedChats.push({
      chatRoomId: room._id,
      profile: otherProfile,
      latestMessage: room.latestMessage,
      updatedAt: room.updatedAt,
    });
  }

  return {
    matches: formattedMatches,
    chats: formattedChats,
  };
};

exports.getMessages = async (chatId, userId, page = 1, limit = 50) => {
  const room = await ChatRoom.findById(chatId);
  if (!room || !room.users.includes(userId)) {
    throw new AppError('You are not authorized to view messages in this chat room', 403);
  }

  const skip = (page - 1) * limit;

  // Mark unread messages sent by others in this room as seen
  await Message.updateMany(
    { chatRoom: chatId, sender: { $ne: userId }, seenBy: { $ne: userId } },
    { $addToSet: { seenBy: userId } }
  );

  const messages = await Message.find({
    chatRoom: chatId,
    isDeletedFor: { $ne: userId }, // Skip messages deleted for this user
  })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('replyTo', 'content sender')
    .populate('sender', 'email');

  return messages;
};

exports.sendMessage = async (userId, chatId, content, attachments = [], replyTo = null) => {
  const room = await ChatRoom.findById(chatId);
  if (!room || !room.users.includes(userId)) {
    throw new AppError('You are not authorized to send messages in this chat room', 403);
  }

  const message = new Message({
    chatRoom: chatId,
    sender: userId,
    content,
    attachments,
    replyTo,
    seenBy: [userId],
    deliveredTo: [userId],
  });

  await message.save();

  // Update room latestMessage reference
  room.latestMessage = message._id;
  await room.save();

  return await message.populate([
    { path: 'replyTo', select: 'content sender' },
    { path: 'sender', select: 'email' }
  ]);
};

exports.deleteMessage = async (userId, messageId, action) => {
  const message = await Message.findById(messageId);
  if (!message) {
    throw new AppError('Message not found', 404);
  }

  if (action === 'everyone') {
    if (message.sender.toString() !== userId.toString()) {
      throw new AppError('You can only delete your own messages for everyone', 403);
    }
    message.isDeletedForEveryone = true;
    message.content = 'This message was deleted';
    message.attachments = [];
    await message.save();
  } else if (action === 'me') {
    message.isDeletedFor.push(userId);
    await message.save();
  } else {
    throw new AppError('Invalid delete action, specify "me" or "everyone"', 400);
  }

  return message;
};
