const express = require('express');
const profileController = require('../controllers/profileController');
const { protect } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

const router = express.Router();

// Apply authentication shield to all profile routes
router.use(protect);

router.get('/', profileController.getProfile);
router.put('/', profileController.updateProfile);
router.post('/upload-photo', upload.single('photo'), profileController.uploadPhoto);
router.post('/delete-photo', profileController.deletePhoto);

module.exports = router;
