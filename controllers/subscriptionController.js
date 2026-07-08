const subscriptionService = require('../services/subscriptionService');
const AppError = require('../utils/appError');

exports.createSubscription = async (req, res, next) => {
  try {
    const { plan, durationInDays } = req.body;
    if (!plan) {
      return next(new AppError('Please specify premium plan name (plus, gold, platinum)', 400));
    }

    const result = await subscriptionService.subscribe(req.user._id, plan, durationInDays);
    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
