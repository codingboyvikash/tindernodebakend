const Subscription = require('../models/Subscription');
const Profile = require('../models/Profile');
const AppError = require('../utils/appError');

exports.subscribe = async (userId, planName, durationInDays = 30) => {
  const allowedPlans = ['free', 'plus', 'gold', 'platinum'];
  if (!allowedPlans.includes(planName)) {
    throw new AppError('Invalid subscription plan name', 400);
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + durationInDays);

  const transactionId = 'txn_' + Math.random().toString(36).substr(2, 9);

  // 1. Create or update Subscription record
  const subscription = await Subscription.findOneAndUpdate(
    { user: userId },
    {
      plan: planName,
      status: planName === 'free' ? 'expired' : 'active',
      expiresAt,
      transactionId,
    },
    { upsert: true, new: true }
  );

  // 2. Update corresponding user Profile
  const isPremium = planName !== 'free';
  const profile = await Profile.findOneAndUpdate(
    { user: userId },
    {
      isPremium,
      premiumType: planName,
      premiumExpiresAt: expiresAt,
    },
    { new: true }
  );

  if (!profile) {
    throw new AppError('Profile not found. Please create profile details first before buying subscription.', 404);
  }

  return {
    subscription,
    profile,
  };
};
