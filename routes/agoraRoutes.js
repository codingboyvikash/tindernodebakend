const express = require('express');
const agoraController = require('../controllers/agoraController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/token', agoraController.generateToken);

module.exports = router;
