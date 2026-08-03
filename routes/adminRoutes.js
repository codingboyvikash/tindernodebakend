const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

router.get('/users', adminController.getAllUsers);
router.get('/stats', adminController.getDashboardStats);
router.patch('/users/:id/verify', adminController.toggleVerifyUser);
router.patch('/users/:id/premium', adminController.togglePremiumUser);
router.patch('/users/:id/role', adminController.changeUserRole);
router.delete('/users/:id', adminController.deleteUser);

// Matches, Swipes, Chat Monitor & Database Inspection
router.get('/matches', adminController.getAllMatches);
router.get('/chats', adminController.getAllChats);
router.get('/chats/:chatId/messages', adminController.getChatMessages);
router.get('/database', adminController.getDatabaseOverview);

module.exports = router;
