const profileService = require('../services/profileService');
const AppError = require('../utils/appError');

exports.getProfile = async (req, res, next) => {
  try {
    const profile = await profileService.getProfileByUserId(req.user._id);
    res.status(200).json({
      status: 'success',
      data: profile,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const profile = await profileService.createOrUpdateProfile(req.user._id, req.body);
    res.status(200).json({
      status: 'success',
      data: profile,
    });
  } catch (error) {
    next(error);
  }
};

exports.uploadPhoto = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(new AppError('Please provide an image file', 400));
    }
    const photos = await profileService.uploadPhoto(req.user._id, req.file);
    res.status(200).json({
      status: 'success',
      data: { photos },
    });
  } catch (error) {
    next(error);
  }
};

exports.deletePhoto = async (req, res, next) => {
  try {
    const { photoUrl } = req.body;
    if (!photoUrl) {
      return next(new AppError('Please specify the photo URL to delete', 400));
    }
    const photos = await profileService.deletePhoto(req.user._id, photoUrl);
    res.status(200).json({
      status: 'success',
      data: { photos },
    });
  } catch (error) {
    next(error);
  }
};
