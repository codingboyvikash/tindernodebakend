const express = require('express');
const swipeController = require('../controllers/swipeController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

// Apply auth shield
router.use(protect);

router.get('/discovery', swipeController.getDiscovery);
router.get('/requests', swipeController.getIncomingRequests);
router.post('/right', swipeController.swipeRight);
router.post('/left', swipeController.swipeLeft);
router.post('/super-like', swipeController.superLike);
router.post('/undo', swipeController.undoSwipe);

module.exports = router;
