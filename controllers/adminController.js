const User = require('../models/User');
const Profile = require('../models/Profile');
const Match = require('../models/Match');
const Like = require('../models/Like');
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
    
    const premiumUsersCount = profiles.filter((p) => p.isPremium).length;
    const verifiedUsersCount = profiles.filter((p) => p.verifiedBadge).length;

    res.status(200).json({
      status: 'success',
      data: {
        totalUsers,
        premiumUsersCount,
        verifiedUsersCount,
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
      // Fallback: create empty profile if missing
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
    await Like.deleteMany({ $or: [{ fromUser: id }, { toUser: id }] });
    await Match.deleteMany({ users: id });

    res.status(200).json({
      status: 'success',
      message: 'User deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
