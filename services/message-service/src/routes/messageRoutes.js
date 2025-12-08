const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const authMiddleware = require('../middlewares/authMiddleware');
const upload = require('../middlewares/upload');
const mongoose = require('mongoose');

/* =========================
   ROUTES PUBLIQUES
   ========================= */

// Health
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Message service is running',
    timestamp: new Date().toISOString()
  });
});

/* =========================
   ROUTES PROTÉGÉES
   ========================= */

router.use(authMiddleware);

// Conversations
router.get('/conversations', messageController.getConversations);
router.post('/conversations/start', messageController.startConversation);
router.delete('/conversations/:conversationId', messageController.deleteConversation);

// Messages
router.get('/conversations/:conversationId/messages', messageController.getMessages);
router.post('/messages/send', messageController.sendMessage);
router.patch('/conversations/:conversationId/read', messageController.markAsRead);
router.delete('/messages/:messageId', messageController.deleteMessage);
// Ajouter cette route
router.patch('/messages/:messageId', messageController.editMessage);

// Upload (PROTÉGÉ)
router.post(
  '/upload',
  upload.single('file'),
  messageController.uploadFile
);

// Utilisateurs
router.get('/search/users', messageController.searchUsers);
router.get('/users/all', messageController.getAllUsers);

// Recherche
router.get('/search/messages', messageController.searchMessages);

// Stats
router.get('/stats', messageController.getStats);

module.exports = router;
