const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const authMiddleware = require('../middlewares/authMiddleware');

// Toutes les routes nécessitent une authentification
router.use(authMiddleware);

router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Message service is running',
    timestamp: new Date().toISOString()
  });
});

// Conversations
router.get('/conversations', messageController.getConversations);
router.post('/conversations/start', messageController.startConversation);
router.delete('/conversations/:conversationId', messageController.deleteConversation);

// Messages
router.get('/conversations/:conversationId/messages', messageController.getMessages);
router.post('/messages/send', messageController.sendMessage);
router.patch('/conversations/:conversationId/read', messageController.markAsRead);

// Utilisateurs
router.get('/search/users', messageController.searchUsers);
router.get('/users/all', messageController.getAllUsers);

// Recherche
router.get('/search/messages', messageController.searchMessages);

// Statistiques
router.get('/stats', messageController.getStats);

module.exports = router;