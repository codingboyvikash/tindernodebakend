const express = require('express');
const subscriptionController = require('../controllers/subscriptionController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/', subscriptionController.createSubscription);

module.exports = router;
