const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

let fcmInitialized = false;

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
  try {
    const serviceAccount = require(path.resolve(serviceAccountPath));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    fcmInitialized = true;
    console.log('🔥 Firebase Admin SDK initialized successfully.');
  } catch (error) {
    console.error('❌ Firebase Admin initialization failed:', error.message);
  }
} else {
  console.log('⚠️  Firebase Service Account Key path is missing or file does not exist. Push notifications will fallback to console logging.');
}

exports.sendPushNotification = async (fcmToken, title, body, payload = {}) => {
  console.log(`=========================================`);
  console.log(`🔔 PUSH NOTIFICATION SENT TO: ${fcmToken}`);
  console.log(`📌 TITLE: ${title}`);
  console.log(`📝 BODY: ${body}`);
  console.log(`📦 PAYLOAD:`, payload);
  console.log(`=========================================`);

  if (!fcmInitialized || !fcmToken) {
    return { success: false, message: 'FCM not initialized or token missing' };
  }

  const message = {
    notification: {
      title,
      body,
    },
    data: {
      ...payload,
      click_action: 'FLUTTER_NOTIFICATION_CLICK',
    },
    token: fcmToken,
  };

  try {
    const response = await admin.messaging().send(message);
    console.log('Successfully sent push message ID:', response);
    return { success: true, response };
  } catch (error) {
    console.error('Error sending push message:', error.message);
    return { success: false, error: error.message };
  }
};
