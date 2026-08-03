const User = require('../models/User');
const Profile = require('../models/Profile');
const Match = require('../models/Match');
const Like = require('../models/Like');
const ChatRoom = require('../models/ChatRoom');
const Message = require('../models/Message');
const Subscription = require('../models/Subscription');
const AppError = require('../utils/appError');

// Get all users with their profile details
exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 }).lean();
    
    // Fetch profiles for all users
    const usersWithProfiles = await Promise.all(
      users.map(async (u) => {
        const profile = await Profile.findOne({ user: u._id }).lean();
        return {
          id: u._id.toString(),
          email: u.email,
          displayName: profile?.displayName || u.name || u.email.split('@')[0],
          role: u.role || 'user',
          isVerifiedAccount: u.isVerified === 'verified',
          verifiedBadge: profile?.verifiedBadge || false,
          isPremium: profile?.isPremium || false,
          premiumType: profile?.premiumType || 'free',
          photos: profile?.photos || [],
          gender: profile?.gender || 'N/A',
          locationName: profile?.locationName || '',
          createdAt: u.createdAt ? new Date(u.createdAt).toISOString().split('T')[0] : 'N/A',
        };
      })
    );

    res.status(200).json({
      status: 'success',
      results: usersWithProfiles.length,
      data: {
        users: usersWithProfiles,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get Dashboard Metrics & Overview Stats
exports.getDashboardStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const profiles = await Profile.find().lean();
    const totalMatches = await Match.countDocuments();
    const totalMessages = await Message.countDocuments();
    
    const premiumUsersCount = profiles.filter((p) => p.isPremium).length;
    const verifiedUsersCount = profiles.filter((p) => p.verifiedBadge).length;

    res.status(200).json({
      status: 'success',
      data: {
        totalUsers,
        premiumUsersCount,
        verifiedUsersCount,
        totalMatches,
        totalMessages,
        totalRevenue: premiumUsersCount * 29.99, // Estimated revenue
      },
    });
  } catch (error) {
    next(error);
  }
};

// Toggle Verified Badge
exports.toggleVerifyUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    let profile = await Profile.findOne({ user: id });
    
    if (!profile) {
      profile = new Profile({
        user: id,
        displayName: 'User',
        birthDate: new Date('2000-01-01'),
        gender: 'male',
        interestedIn: 'everyone',
        location: { type: 'Point', coordinates: [0, 0] },
      });
    }

    profile.verifiedBadge = !profile.verifiedBadge;
    await profile.save();

    res.status(200).json({
      status: 'success',
      data: {
        verifiedBadge: profile.verifiedBadge,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Toggle Premium Status & Type
exports.togglePremiumUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { premiumType = 'gold' } = req.body;

    let profile = await Profile.findOne({ user: id });
    if (!profile) {
      profile = new Profile({
        user: id,
        displayName: 'User',
        birthDate: new Date('2000-01-01'),
        gender: 'male',
        interestedIn: 'everyone',
        location: { type: 'Point', coordinates: [0, 0] },
      });
    }

    const nextPremiumState = !profile.isPremium;
    profile.isPremium = nextPremiumState;
    profile.premiumType = nextPremiumState ? premiumType : 'free';
    await profile.save();

    res.status(200).json({
      status: 'success',
      data: {
        isPremium: profile.isPremium,
        premiumType: profile.premiumType,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Change User Role ('admin' vs 'user')
exports.changeUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    user.role = user.role === 'admin' ? 'user' : 'admin';
    await user.save();

    res.status(200).json({
      status: 'success',
      data: {
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Delete / Ban User Account
exports.deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    await User.findByIdAndDelete(id);
    await Profile.findOneAndDelete({ user: id });
    await Like.deleteMany({ $or: [{ liker: id }, { liked: id }] });
    await Match.deleteMany({ users: id });

    res.status(200).json({
      status: 'success',
      message: 'User deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Get All Matches & Swipes History
exports.getAllMatches = async (req, res, next) => {
  try {
    const matches = await Match.find().sort({ createdAt: -1 }).lean();
    
    const formattedMatches = await Promise.all(
      matches.map(async (m) => {
        const u1 = m.users[0];
        const u2 = m.users[1];
        const p1 = await Profile.findOne({ user: u1 }).select('displayName photos').lean();
        const p2 = await Profile.findOne({ user: u2 }).select('displayName photos').lean();
        return {
          id: m._id.toString(),
          user1: {
            id: u1 ? u1.toString() : '',
            name: p1?.displayName || 'User 1',
            photo: p1?.photos?.[0] || '',
          },
          user2: {
            id: u2 ? u2.toString() : '',
            name: p2?.displayName || 'User 2',
            photo: p2?.photos?.[0] || '',
          },
          chatRoomId: m.chatRoom ? m.chatRoom.toString() : '',
          createdAt: m.createdAt ? new Date(m.createdAt).toLocaleString() : 'N/A',
        };
      })
    );

    const likes = await Like.find().sort({ createdAt: -1 }).limit(100).lean();
    const formattedLikes = await Promise.all(
      likes.map(async (l) => {
        const pLiker = await Profile.findOne({ user: l.liker }).select('displayName photos').lean();
        const pLiked = await Profile.findOne({ user: l.liked }).select('displayName photos').lean();
        return {
          id: l._id.toString(),
          liker: {
            id: l.liker ? l.liker.toString() : '',
            name: pLiker?.displayName || 'User',
            photo: pLiker?.photos?.[0] || '',
          },
          liked: {
            id: l.liked ? l.liked.toString() : '',
            name: pLiked?.displayName || 'User',
            photo: pLiked?.photos?.[0] || '',
          },
          type: l.type, // 'like', 'dislike', 'superlike'
          createdAt: l.createdAt ? new Date(l.createdAt).toLocaleString() : 'N/A',
        };
      })
    );

    res.status(200).json({
      status: 'success',
      data: {
        matches: formattedMatches,
        swipes: formattedLikes,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get All Chat Threads
exports.getAllChats = async (req, res, next) => {
  try {
    const rooms = await ChatRoom.find().sort({ updatedAt: -1 }).lean();

    const formattedRooms = await Promise.all(
      rooms.map(async (room) => {
        const u1 = room.users[0];
        const u2 = room.users[1];
        const p1 = await Profile.findOne({ user: u1 }).select('displayName photos').lean();
        const p2 = await Profile.findOne({ user: u2 }).select('displayName photos').lean();
        const totalMessages = await Message.countDocuments({ chatRoom: room._id });
        const lastMsg = await Message.findOne({ chatRoom: room._id }).sort({ createdAt: -1 }).lean();

        return {
          id: room._id.toString(),
          user1: {
            id: u1 ? u1.toString() : '',
            name: p1?.displayName || 'User 1',
            photo: p1?.photos?.[0] || '',
          },
          user2: {
            id: u2 ? u2.toString() : '',
            name: p2?.displayName || 'User 2',
            photo: p2?.photos?.[0] || '',
          },
          totalMessages,
          lastMessage: lastMsg ? {
            content: lastMsg.content || (lastMsg.attachments?.length ? '📷 Attachment' : ''),
            sender: lastMsg.sender?.toString(),
            createdAt: lastMsg.createdAt ? new Date(lastMsg.createdAt).toLocaleString() : 'N/A',
          } : null,
          updatedAt: room.updatedAt ? new Date(room.updatedAt).toLocaleString() : 'N/A',
        };
      })
    );

    res.status(200).json({
      status: 'success',
      results: formattedRooms.length,
      data: {
        chats: formattedRooms,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get Messages inside a Chat Thread
exports.getChatMessages = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const messages = await Message.find({ chatRoom: chatId }).sort({ createdAt: 1 }).lean();

    const formattedMessages = await Promise.all(
      messages.map(async (m) => {
        const senderProfile = await Profile.findOne({ user: m.sender }).select('displayName photos').lean();
        return {
          id: m._id.toString(),
          senderId: m.sender ? m.sender.toString() : '',
          senderName: senderProfile?.displayName || 'User',
          senderPhoto: senderProfile?.photos?.[0] || '',
          content: m.content || '',
          attachments: m.attachments || [],
          createdAt: m.createdAt ? new Date(m.createdAt).toLocaleString() : 'N/A',
        };
      })
    );

    res.status(200).json({
      status: 'success',
      results: formattedMessages.length,
      data: {
        messages: formattedMessages,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get Full Database Collections Overview
exports.getDatabaseOverview = async (req, res, next) => {
  try {
    const usersCount = await User.countDocuments();
    const profilesCount = await Profile.countDocuments();
    const matchesCount = await Match.countDocuments();
    const likesCount = await Like.countDocuments();
    const chatRoomsCount = await ChatRoom.countDocuments();
    const messagesCount = await Message.countDocuments();
    const subscriptionsCount = await Subscription.countDocuments();

    // Sample recent documents from each collection
    const sampleUsers = await User.find().limit(5).select('-password').lean();
    const sampleProfiles = await Profile.find().limit(5).lean();
    const sampleMatches = await Match.find().limit(5).lean();
    const sampleLikes = await Like.find().limit(5).lean();
    const sampleChats = await ChatRoom.find().limit(5).lean();
    const sampleMessages = await Message.find().limit(5).lean();

    res.status(200).json({
      status: 'success',
      data: {
        counts: {
          users: usersCount,
          profiles: profilesCount,
          matches: matchesCount,
          likes: likesCount,
          chatRooms: chatRoomsCount,
          messages: messagesCount,
          subscriptions: subscriptionsCount,
        },
        samples: {
          users: sampleUsers,
          profiles: sampleProfiles,
          matches: sampleMatches,
          likes: sampleLikes,
          chatRooms: sampleChats,
          messages: sampleMessages,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
