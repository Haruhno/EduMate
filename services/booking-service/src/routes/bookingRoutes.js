const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const authMiddleware = require('../middlewares/authMiddleware');

// Routes publiques pour webhooks
router.post('/webhook/blockchain', bookingController.blockchainWebhook);

// Routes protégées
router.post('/', authMiddleware, bookingController.create);
router.patch('/:id/confirm', authMiddleware, bookingController.confirm);
router.patch('/:id/cancel', authMiddleware, bookingController.cancel);
router.patch('/:id/complete', authMiddleware, bookingController.complete);
router.get('/user/:userId', authMiddleware, bookingController.getByUser);
router.get('/tutor/:tutorId', authMiddleware, bookingController.getByTutor);
router.get('/:id', authMiddleware, bookingController.getById);
router.get('/:userId/stats', authMiddleware, bookingController.getStats);

module.exports = router;