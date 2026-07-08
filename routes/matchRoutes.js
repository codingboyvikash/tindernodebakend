const express = require('express');
const chatController = require('../controllers/chatController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/', chatController.getMatchesAndChats);

module.exports = router;
