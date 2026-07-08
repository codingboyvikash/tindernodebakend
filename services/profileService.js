const fs = require('fs');
const Profile = require('../models/Profile');
const AppError = require('../utils/appError');
const { cloudinary, isCloudinaryConfigured } = require('../config/cloudinary');

exports.getProfileByUserId = async (userId) => {
  const profile = await Profile.findOne({ user: userId }).populate('user', 'email role isVerified');
  if (!profile) {
    throw new AppError('Profile not found', 404);
  }
  return profile;
};

exports.createOrUpdateProfile = async (userId, profileData) => {
  let profile = await Profile.findOne({ user: userId });

  // Handle location coordinates structure [longitude, latitude]
  let locationObj;
  if (profileData.longitude !== undefined && profileData.latitude !== undefined) {
    locationObj = {
      type: 'Point',
      coordinates: [parseFloat(profileData.longitude), parseFloat(profileData.latitude)],
    };
  }

  const updateFields = {
    displayName: profileData.displayName,
    bio: profileData.bio,
    birthDate: profileData.birthDate ? new Date(profileData.birthDate) : undefined,
    gender: profileData.gender,
    interestedIn: profileData.interestedIn,
    height: profileData.height ? parseInt(profileData.height) : undefined,
    weight: profileData.weight ? parseInt(profileData.weight) : undefined,
    languages: profileData.languages,
    profession: profileData.profession,
    education: profileData.education,
    hobbies: profileData.hobbies,
    interests: profileData.interests,
    distancePreference: profileData.distancePreference ? parseInt(profileData.distancePreference) : undefined,
    minAgePreference: profileData.minAgePreference ? parseInt(profileData.minAgePreference) : undefined,
    maxAgePreference: profileData.maxAgePreference ? parseInt(profileData.maxAgePreference) : undefined,
    relationshipGoals: profileData.relationshipGoals,
    religion: profileData.religion,
  };

  if (locationObj) {
    updateFields.location = locationObj;
  }

  // Remove undefined fields
  Object.keys(updateFields).forEach(key => updateFields[key] === undefined && delete updateFields[key]);

  if (profile) {
    // Update existing profile
    profile = await Profile.findOneAndUpdate(
      { user: userId },
      { $set: updateFields },
      { new: true, runValidators: true }
    ).populate('user', 'email role isVerified');
  } else {
    // Create new profile
    if (!profileData.birthDate) {
      throw new AppError('Date of birth is required to create profile', 400);
    }
    if (!locationObj) {
      throw new AppError('GPS location is required to create profile', 400);
    }
    
    profile = new Profile({
      user: userId,
      ...updateFields,
      location: locationObj,
    });
    await profile.save();
    profile = await profile.populate('user', 'email role isVerified');
  }

  return profile;
};

exports.uploadPhoto = async (userId, file) => {
  const profile = await Profile.findOne({ user: userId });
  if (!profile) {
    // Remove local file
    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    throw new AppError('Create your profile details before uploading photos', 404);
  }

  if (profile.photos.length >= 9) {
    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    throw new AppError('You can upload up to 9 profile photos only', 400);
  }

  let photoUrl = '';

  if (isCloudinaryConfigured) {
    try {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: 'tinder_profiles',
        transformation: [{ width: 800, height: 800, crop: 'limit' }],
      });
      photoUrl = result.secure_url;
      // Remove temp local file
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    } catch (err) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      throw new AppError(`Cloudinary Upload Error: ${err.message}`, 500);
    }
  } else {
    // Use relative path for local upload fallback
    photoUrl = `/uploads/${file.filename}`;
  }

  // Save to profile
  profile.photos.push(photoUrl);
  await profile.save();

  return profile.photos;
};

exports.deletePhoto = async (userId, photoUrl) => {
  const profile = await Profile.findOne({ user: userId });
  if (!profile) {
    throw new AppError('Profile not found', 404);
  }

  const index = profile.photos.indexOf(photoUrl);
  if (index === -1) {
    throw new AppError('Photo not found in profile', 404);
  }

  profile.photos.splice(index, 1);
  await profile.save();

  // If local file, delete it from storage
  if (photoUrl.startsWith('/uploads/')) {
    const filename = photoUrl.replace('/uploads/', '');
    const filepath = fs.path = require('path').join(__dirname, '../uploads', filename);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
  }

  return profile.photos;
};
