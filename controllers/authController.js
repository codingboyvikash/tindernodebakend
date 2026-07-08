const authService = require('../services/authService');

exports.register = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.register(email, password);

    console.log('\n=========================================');
    console.log('👤 NEW USER REGISTERING:');
    console.log(`📧 Email: ${email}`);
    console.log(`🆔 User ID: ${result.userId}`);
    console.log(`🔑 Verification Status: ${result.isVerified}`);
    console.log('=========================================\n');

    res.status(201).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);

    console.log('\n=========================================');
    console.log('🔑 USER LOGGED IN:');
    console.log(`📧 Email: ${result.user?.email || email}`);
    console.log(`🆔 User ID: ${result.user?.id || result.userId}`);
    if (result.accessToken) {
      console.log(`🔑 Access Token: ${result.accessToken}`);
      console.log(`🔄 Refresh Token: ${result.refreshToken}`);
    } else {
      console.log(`⚠️ Status: ${result.message}`);
    }
    console.log('=========================================\n');

    // If verification is complete, we set a cookie for convenience, though mobile clients will use headers
    if (result.refreshToken) {
      res.cookie('jwt', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });
    }

    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

exports.verifyOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const result = await authService.verifyOTP(email, otp);

    console.log('\n=========================================');
    console.log('✅ USER OTP VERIFIED (Registration Complete):');
    console.log(`📧 Email: ${result.user.email}`);
    console.log(`🆔 User ID: ${result.user.id}`);
    console.log(`🔑 Access Token: ${result.accessToken}`);
    console.log(`🔄 Refresh Token: ${result.refreshToken}`);
    console.log('=========================================\n');

    res.cookie('jwt', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

exports.resendOTP = async (req, res, next) => {
  try {
    const { email } = req.body;
    const result = await authService.resendOTP(email);
    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

exports.refreshToken = async (req, res, next) => {
  try {
    // Check both cookie and body
    const token = req.body.refreshToken || (req.cookies && req.cookies.jwt);
    const result = await authService.refreshToken(token);

    res.cookie('jwt', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

exports.logout = async (req, res, next) => {
  try {
    if (req.user) {
      await authService.logout(req.user._id);
    }
    res.clearCookie('jwt');
    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const result = await authService.forgotPassword(email);
    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;
    const result = await authService.resetPassword(email, otp, newPassword);
    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

exports.socialLogin = async (req, res, next) => {
  try {
    const { provider, providerId, email, displayName } = req.body;
    const result = await authService.socialLogin(provider, providerId, email, displayName);

    res.cookie('jwt', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
