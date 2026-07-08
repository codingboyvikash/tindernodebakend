const User = require('../models/User');
const Profile = require('../models/Profile');
const AppError = require('../utils/appError');
const { generateAccessToken, generateRefreshToken } = require('../utils/token');
const jwt = require('jsonwebtoken');

// Helper to send email (mocked if configuration is missing)
const sendOTPEmail = async (email, otp) => {
  console.log(`=========================================`);
  console.log(`✉️  EMAIL OTP TO: ${email}`);
  console.log(`🔑  CODE: ${otp}`);
  console.log(`=========================================`);

  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    const nodemailer = require('nodemailer');
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: parseInt(process.env.SMTP_PORT) === 465, // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'no-reply@tinderclone.com',
        to: email,
        subject: 'Your Authentication OTP',
        text: `Your OTP is ${otp}. It is valid for 10 minutes.`,
        html: `<h3>Welcome to Tinder Clone</h3><p>Your OTP verification code is: <strong>${otp}</strong></p><p>This code expires in 10 minutes.</p>`,
      });
      console.log(`Sent email OTP via SMTP to ${email}`);
    } catch (err) {
      console.error('SMTP Email send failed, logging to console instead: ', err.message);
    }
  }
};

exports.register = async (email, password) => {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    if (existingUser.isVerified === 'pending_otp') {
      // User started registration but didn't verify OTP. Let them get a new one.
      existingUser.password = password; // updates password if changed
      const otp = existingUser.generateOTP();
      await existingUser.save();
      await sendOTPEmail(email, otp);
      return {
        userId: existingUser._id,
        email: existingUser.email,
        isVerified: existingUser.isVerified,
        message: 'Registration pending. New OTP sent to email.',
      };
    }
    throw new AppError('Email address already registered', 400);
  }

  const user = new User({ email, password });
  const otp = user.generateOTP();
  user.isVerified = 'pending_otp';
  await user.save();

  await sendOTPEmail(email, otp);

  return {
    userId: user._id,
    email: user.email,
    isVerified: user.isVerified,
    message: 'Registration successful. OTP sent to email.',
  };
};

exports.login = async (email, password) => {
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password, user.password))) {
    throw new AppError('Incorrect email or password', 401);
  }

  if (user.isVerified === 'pending_otp') {
    // Generate new OTP if user is not verified yet
    const otp = user.generateOTP();
    await user.save();
    await sendOTPEmail(email, otp);
    return {
      userId: user._id,
      email: user.email,
      isVerified: user.isVerified,
      message: 'Email verification pending. New OTP sent to email.',
    };
  }

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  user.refreshToken = refreshToken;
  await user.save();

  // Check if profile exists
  const profile = await Profile.findOne({ user: user._id });

  return {
    user: {
      id: user._id,
      email: user.email,
      isVerified: user.isVerified,
      role: user.role,
      hasProfile: !!profile,
    },
    accessToken,
    refreshToken,
  };
};

exports.verifyOTP = async (email, otp) => {
  const user = await User.findOne({ email }).select('+otp +otpExpires');
  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (!user.otp || user.otp !== otp) {
    throw new AppError('Invalid OTP code', 400);
  }

  if (Date.now() > user.otpExpires) {
    throw new AppError('OTP has expired', 400);
  }

  user.otp = undefined;
  user.otpExpires = undefined;
  user.isVerified = 'verified';
  
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);
  
  user.refreshToken = refreshToken;
  await user.save();

  const profile = await Profile.findOne({ user: user._id });

  return {
    user: {
      id: user._id,
      email: user.email,
      isVerified: user.isVerified,
      role: user.role,
      hasProfile: !!profile,
    },
    accessToken,
    refreshToken,
  };
};

exports.resendOTP = async (email) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const otp = user.generateOTP();
  user.isVerified = 'pending_otp';
  await user.save();

  await sendOTPEmail(email, otp);

  return {
    message: 'New OTP sent to email.',
  };
};

exports.refreshToken = async (token) => {
  if (!token) {
    throw new AppError('No refresh token provided', 401);
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (err) {
    throw new AppError('Invalid or expired refresh token. Please login again.', 401);
  }

  const user = await User.findById(decoded.id).select('+refreshToken');
  if (!user || user.refreshToken !== token) {
    throw new AppError('Invalid token association. Please login again.', 401);
  }

  const newAccessToken = generateAccessToken(user._id);
  const newRefreshToken = generateRefreshToken(user._id);

  user.refreshToken = newRefreshToken;
  await user.save();

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
};

exports.logout = async (userId) => {
  const user = await User.findById(userId);
  if (user) {
    user.refreshToken = undefined;
    await user.save();
  }
};

exports.forgotPassword = async (email) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError('No user registered with this email', 404);
  }

  const otp = user.generateOTP();
  await user.save();

  await sendOTPEmail(email, otp);

  return {
    message: 'Password reset OTP sent to email.',
  };
};

exports.resetPassword = async (email, otp, newPassword) => {
  const user = await User.findOne({ email }).select('+otp +otpExpires');
  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (!user.otp || user.otp !== otp) {
    throw new AppError('Invalid OTP code', 400);
  }

  if (Date.now() > user.otpExpires) {
    throw new AppError('OTP has expired', 400);
  }

  user.password = newPassword;
  user.otp = undefined;
  user.otpExpires = undefined;
  user.refreshToken = undefined; // Force relogin on all devices
  await user.save();

  return {
    message: 'Password changed successfully. You can now login.',
  };
};

// Social login implementations
exports.socialLogin = async (provider, providerId, email, displayName) => {
  let user;
  if (provider === 'google') {
    user = await User.findOne({ googleId: providerId });
  } else if (provider === 'apple') {
    user = await User.findOne({ appleId: providerId });
  }

  if (!user) {
    // Check if user already exists with this email
    user = await User.findOne({ email });

    if (user) {
      // Link social login
      if (provider === 'google') user.googleId = providerId;
      if (provider === 'apple') user.appleId = providerId;
      user.isVerified = 'verified'; // Trust social auth provider verification
      await user.save();
    } else {
      // Create new user
      user = new User({
        email,
        isVerified: 'verified',
      });
      if (provider === 'google') user.googleId = providerId;
      if (provider === 'apple') user.appleId = providerId;
      await user.save();
    }
  }

  // Create profile skeleton if not exists
  let profile = await Profile.findOne({ user: user._id });
  if (!profile && displayName) {
    // Generate simple mock birthdate (e.g. 20 years ago)
    const birthDate = new Date();
    birthDate.setFullYear(birthDate.getFullYear() - 20);

    profile = new Profile({
      user: user._id,
      displayName,
      birthDate,
      gender: 'other',
      interestedIn: 'everyone',
      location: {
        type: 'Point',
        coordinates: [0, 0], // Default coordinates
      },
    });
    await profile.save();
  }

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  user.refreshToken = refreshToken;
  await user.save();

  return {
    user: {
      id: user._id,
      email: user.email,
      isVerified: user.isVerified,
      role: user.role,
      hasProfile: !!profile,
    },
    accessToken,
    refreshToken,
  };
};
