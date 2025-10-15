const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const upload = require('../controllers/profileController').upload;

// Sauvegarder le profil
router.post('/save', profileController.saveProfile);

// Récupérer le profil
router.get('/', profileController.getProfile);

// Finaliser le profil
router.post('/complete', profileController.completeProfile);

// Statut du profil
router.get('/status', profileController.getProfileStatus);

// Route pour l'upload de fichiers
router.post('/upload', upload.single('file'), profileController.uploadFile);

module.exports = router;