const cloudinary = require('cloudinary').v2;

const isCloudinaryConfigured = 
  process.env.CLOUDINARY_CLOUD_NAME && 
  process.env.CLOUDINARY_CLOUD_NAME !== 'mock_cloudinary' &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET;

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  console.log('☁️  Cloudinary Configured successfully.');
} else {
  console.log('⚠️  Cloudinary credentials missing or mock. Local file storage fallback will be used.');
}

module.exports = {
  cloudinary,
  isCloudinaryConfigured,
};
