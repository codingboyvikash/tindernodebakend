const agoraService = require('../services/agoraService');
const AppError = require('../utils/appError');

exports.generateToken = async (req, res, next) => {
  try {
    const { channelName, uid, role } = req.body;
    
    if (!channelName) {
      return next(new AppError('channelName is required', 400));
    }

    // UID must be an integer for Agora RTC
    const rtcUid = parseInt(uid) || 0; 
    const token = agoraService.generateRtcToken(channelName, rtcUid, role || 'publisher');

    res.status(200).json({
      status: 'success',
      data: {
        token,
        channelName,
        uid: rtcUid,
        appId: process.env.AGORA_APP_ID || 'mock_agora_app_id',
      },
    });
  } catch (error) {
    next(error);
  }
};
