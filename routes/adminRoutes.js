const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

router.get('/users', adminController.getAllUsers);
router.get('/stats', adminController.getDashboardStats);
router.patch('/users/:id/verify', adminController.toggleVerifyUser);
router.patch('/users/:id/premium', adminController.togglePremiumUser);
router.patch('/users/:id/role', adminController.changeUserRole);
router.delete('/users/:id', adminController.deleteUser);

module.exports = router;
