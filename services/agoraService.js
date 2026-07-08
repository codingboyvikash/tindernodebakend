const { RtcTokenBuilder, RtcRole } = require('agora-token');
const AppError = require('../utils/appError');

exports.generateRtcToken = (channelName, uid, roleType) => {
  const appId = process.env.AGORA_APP_ID;
  const appCertificate = process.env.AGORA_APP_CERTIFICATE;

  if (!appId || !appCertificate || appId === 'mock_agora_app_id') {
    console.log('⚠️  Agora APP_ID or Certificate is missing/mock. Returning a mock token for local testing.');
    return 'mock_token_agora_development_environment';
  }

  const role = roleType === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
  const expirationTimeInSeconds = 3600; // 1 hour
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

  try {
    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      uid,
      role,
      privilegeExpiredTs
    );
    return token;
  } catch (error) {
    throw new AppError(`Agora Token Generation Error: ${error.message}`, 500);
  }
};
