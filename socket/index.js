const socketIO = require('socket.io');

const initSocket = (server) => {
  const io = socketIO(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // Track online users: Map<userId, socketId>
  const onlineUsers = new Map();

  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Join room when user authenticates socket connection
    socket.on('setup', (userData) => {
      if (userData && userData.id) {
        socket.join(userData.id);
        onlineUsers.set(userData.id, socket.id);
        socket.emit('connected');
        console.log(`👤 User ${userData.id} is setup and online.`);
        io.emit('user_status', { userId: userData.id, status: 'online' });
      }
    });

    // Real-time Chat: Join Room
    socket.on('join_chat', (room) => {
      socket.join(room);
      console.log(`🚪 User joined chat room: ${room}`);
    });

    // Real-time Chat: Message sending
    socket.on('new_message', (messageReceived) => {
      const chat = messageReceived.chatRoom;
      if (!chat || !chat.users) return console.log('chat.users not defined');

      chat.users.forEach((user) => {
        if (user._id === messageReceived.sender._id) return;
        socket.in(user._id).emit('message_received', messageReceived);
      });
    });

    // Typing Indicators
    socket.on('typing', (room) => socket.in(room).emit('typing', room));
    socket.on('stop_typing', (room) => socket.in(room).emit('stop_typing', room));

    // Call signaling events
    socket.on('initiate_call', (data) => {
      // data: { callerId, callerName, calleeId, channelName, isVideo }
      const calleeSocket = onlineUsers.get(data.calleeId);
      if (calleeSocket) {
        io.to(calleeSocket).emit('incoming_call', data);
      }
    });

    socket.on('answer_call', (data) => {
      // data: { callerId, accept: boolean }
      const callerSocket = onlineUsers.get(data.callerId);
      if (callerSocket) {
        io.to(callerSocket).emit('call_answered', data);
      }
    });

    socket.on('end_call', (data) => {
      // data: { recipientId }
      const recipientSocket = onlineUsers.get(data.recipientId);
      if (recipientSocket) {
        io.to(recipientSocket).emit('call_ended', data);
      }
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
      // Find and remove disconnected user
      for (const [userId, socketId] of onlineUsers.entries()) {
        if (socketId === socket.id) {
          onlineUsers.delete(userId);
          io.emit('user_status', { userId, status: 'offline' });
          console.log(`👤 User ${userId} went offline.`);
          break;
        }
      }
    });
  });

  return io;
};

module.exports = initSocket;
