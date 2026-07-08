const express = require('express');
const chatController = require('../controllers/chatController');
const { protect } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

const router = express.Router();

router.use(protect);

router.get('/:chatId', chatController.getMessages);
router.post('/', upload.single('attachment'), chatController.sendMessage);
router.post('/delete', chatController.deleteMessage); // supporting POST call for delete payload fallback

module.exports = router;
