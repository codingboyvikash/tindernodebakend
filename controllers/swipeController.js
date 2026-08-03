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

const emitSwipeNotification = (req, targetId, result) => {
  try {
    const io = req.app.get('io');
    if (io) {
      const isMatch = result.match;
      const eventName = isMatch ? 'match_received' : 'notification_received';
      const notificationBody = isMatch
        ? `You matched with ${result.likerDetails?.displayName || 'someone'}!`
        : `${result.likerDetails?.displayName || 'Someone'} sent you a request!`;

      io.to(targetId.toString()).emit(eventName, {
        type: isMatch ? 'match' : 'like',
        title: isMatch ? "It's a Match!" : 'New Request',
        body: notificationBody,
        sender: {
          id: req.user._id,
          displayName: result.likerDetails?.displayName || 'Someone',
          photo: result.likerDetails?.photo || '',
        }
      });
      console.log(`📡 Emitted socket notification (${eventName}) to user: ${targetId}`);
    }
  } catch (err) {
    console.error('Socket emit error:', err.message);
  }
};

exports.swipeRight = async (req, res, next) => {
  try {
    const { targetId } = req.body;
    if (!targetId) {
      return next(new AppError('Please provide target user ID to swipe', 400));
    }
    const result = await swipeService.swipe(req.user._id, targetId, 'like');

    emitSwipeNotification(req, targetId, result);

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

    emitSwipeNotification(req, targetId, result);

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
