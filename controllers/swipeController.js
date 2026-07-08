const swipeService = require('../services/swipeService');
const AppError = require('../utils/appError');

exports.getDiscovery = async (req, res, next) => {
  try {
    const feed = await swipeService.getDiscoveryFeed(req.user._id, req.query);
    res.status(200).json({
      status: 'success',
      results: feed.length,
      data: feed,
    });
  } catch (error) {
    next(error);
  }
};

exports.swipeRight = async (req, res, next) => {
  try {
    const { targetId } = req.body;
    if (!targetId) {
      return next(new AppError('Please provide target user ID to swipe', 400));
    }
    const result = await swipeService.swipe(req.user._id, targetId, 'like');
    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

exports.swipeLeft = async (req, res, next) => {
  try {
    const { targetId } = req.body;
    if (!targetId) {
      return next(new AppError('Please provide target user ID to swipe', 400));
    }
    const result = await swipeService.swipe(req.user._id, targetId, 'dislike');
    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

exports.superLike = async (req, res, next) => {
  try {
    const { targetId } = req.body;
    if (!targetId) {
      return next(new AppError('Please provide target user ID to swipe', 400));
    }
    const result = await swipeService.swipe(req.user._id, targetId, 'superlike');
    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

exports.undoSwipe = async (req, res, next) => {
  try {
    const result = await swipeService.undoSwipe(req.user._id);
    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
