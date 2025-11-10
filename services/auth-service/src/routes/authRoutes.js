const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

// Routes publiques
router.post('/register', authController.register);
router.post('/login', authController.login);


router.post('/migrate-to-tutor', authController.migrateToTutor);

// Route pour récupérer le profil utilisateur
router.get('/profile', authController.getProfile);

// Route pour vérifier l'authentification
router.get('/check', authController.checkAuth);

module.exports = router;
