const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

// Routes publiques
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/all', authController.getAllUsers);

router.post('/migrate-to-tutor', authMiddleware, authController.migrateToTutor);
router.get('/profile', authMiddleware, authController.getProfile);
router.get('/check', authMiddleware, authController.checkAuth);

module.exports = router;
