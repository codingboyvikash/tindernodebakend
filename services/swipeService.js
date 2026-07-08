const Profile = require('../models/Profile');
const Like = require('../models/Like');
const Match = require('../models/Match');
const AppError = require('../utils/appError');

exports.getDiscoveryFeed = async (userId, filters = {}) => {
  const userProfile = await Profile.findOne({ user: userId });
  if (!userProfile) {
    throw new AppError('Profile not found. Please set up your profile first.', 404);
  }

  const {
    location,
    distancePreference = 50,
    minAgePreference = 18,
    maxAgePreference = 100,
    gender,
    interestedIn,
  } = userProfile;

  if (!location || !location.coordinates) {
    throw new AppError('GPS coordinates are required to fetch discovery feed.', 400);
  }

  // Parse filters with fallback to profile configurations
  const finalDistance = parseInt(filters.distance) || distancePreference;
  const finalMinAge = parseInt(filters.minAge) || minAgePreference;
  const finalMaxAge = parseInt(filters.maxAge) || maxAgePreference;

  // 1. Find all users current user already swiped on
  const swipedLikes = await Like.find({ liker: userId }).select('liked');
  const swipedUserIds = swipedLikes.map((l) => l.liked);

  // Add self to excluded list
  swipedUserIds.push(userId);

  // 2. Build Geo-spatial distance query
  const radiusInRadians = finalDistance / 6378.1;
  const coordinates = location.coordinates; // [long, lat]

  // 3. Build Age Date limits
  const today = new Date();
  const maxBirthDate = new Date(today.getFullYear() - finalMinAge, today.getMonth(), today.getDate());
  const minBirthDate = new Date(today.getFullYear() - finalMaxAge - 1, today.getMonth(), today.getDate());

  // 4. Build Gender match query
  const matchQuery = {
    user: { $ne: null, $nin: swipedUserIds },
    birthDate: { $gte: minBirthDate, $lte: maxBirthDate },
    location: {
      $geoWithin: {
        $centerSphere: [coordinates, radiusInRadians],
      },
    },
  };

  // Filter based on gender preference or query filters override
  if (filters.gender) {
    matchQuery.gender = filters.gender;
  } else if (interestedIn === 'male' || interestedIn === 'female') {
    matchQuery.gender = interestedIn;
  }

  // Appends query search filters
  if (filters.religion) matchQuery.religion = filters.religion;
  if (filters.relationshipGoals) matchQuery.relationshipGoals = filters.relationshipGoals;
  
  if (filters.education) {
    matchQuery.education = { $regex: filters.education, $options: 'i' };
  }
  if (filters.profession) {
    matchQuery.profession = { $regex: filters.profession, $options: 'i' };
  }

  if (filters.minHeight || filters.maxHeight) {
    matchQuery.height = {};
    if (filters.minHeight) matchQuery.height.$gte = parseInt(filters.minHeight);
    if (filters.maxHeight) matchQuery.height.$lte = parseInt(filters.maxHeight);
  }

  // Reverse query: show users matching our gender
  if (gender === 'male') {
    matchQuery.interestedIn = { $in: ['male', 'everyone'] };
  } else if (gender === 'female') {
    matchQuery.interestedIn = { $in: ['female', 'everyone'] };
  }

  let discoveryProfiles = await Profile.find(matchQuery)
    .populate('user', 'email role isVerified')
    .limit(30);

  // If feed is empty because the user swiped on everyone, reset swipes to enable continuous looping
  if (discoveryProfiles.length === 0 && swipedUserIds.length > 1) {
    await Like.deleteMany({ liker: userId });
    matchQuery.user = { $ne: null, $nin: [userId] };
    discoveryProfiles = await Profile.find(matchQuery)
      .populate('user', 'email role isVerified')
      .limit(30);
  }

  return discoveryProfiles;
};

exports.swipe = async (userId, targetId, swipeType) => {
  if (userId.toString() === targetId.toString()) {
    throw new AppError('You cannot swipe on yourself', 400);
  }

  const targetProfile = await Profile.findOne({ user: targetId });
  if (!targetProfile) {
    throw new AppError('Target profile not found', 404);
  }

  // 1. Create or update swipe record
  const swipeRecord = await Like.findOneAndUpdate(
    { liker: userId, liked: targetId },
    { type: swipeType },
    { upsert: true, new: true }
  );

  // 2. If it is a pass (dislike), no match check needed
  if (swipeType === 'dislike') {
    return { match: false, swipeRecord };
  }

  // 3. Check for reciprocal like/superlike
  const reciprocalSwipe = await Like.findOne({
    liker: targetId,
    liked: userId,
    type: { $in: ['like', 'superlike'] },
  });

  if (reciprocalSwipe) {
    // Check if Match already exists
    let match = await Match.findOne({
      users: { $all: [userId, targetId] },
    });

    if (!match) {
      match = new Match({
        users: [userId, targetId],
      });
      await match.save();
    }

    const matchedProfile = await Profile.findOne({ user: targetId }).select('displayName photos bio age gender location');

    return {
      match: true,
      matchDetails: match,
      matchedProfile,
    };
  }

  return {
    match: false,
    swipeRecord,
  };
};

exports.undoSwipe = async (userId) => {
  // Find the last swipe by the user
  const lastSwipe = await Like.findOne({ liker: userId }).sort({ updatedAt: -1 });
  if (!lastSwipe) {
    throw new AppError('No recent swipe found to undo', 404);
  }

  const targetId = lastSwipe.liked;

  // Delete the swipe record
  await Like.findByIdAndDelete(lastSwipe._id);

  // Delete any mutual match that was created due to this swipe
  const match = await Match.findOneAndDelete({
    users: { $all: [userId, targetId] },
  });

  return {
    success: true,
    undoneSwipe: lastSwipe,
    matchUndone: !!match,
  };
};
