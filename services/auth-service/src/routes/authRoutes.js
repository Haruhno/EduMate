const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Route d'inscription
router.post('/register', authController.register);

// Route de connexion
router.post('/login', authController.login);

// Route pour récupérer le profil utilisateur
router.get('/profile', authController.getProfile);

// Route pour vérifier l'authentification
router.get('/check', authController.checkAuth);

module.exports = router;