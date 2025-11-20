const express = require('express');
const router = express.Router();
const annonceController = require('../controllers/annonceController');
const authMiddleware = require('../middlewares/authMiddleware');

// Routes sécurisées
router.get('/search', authMiddleware, annonceController.searchAnnonces);
router.get('/my-annonces', authMiddleware, annonceController.getMyAnnonces);
router.get('/:id', authMiddleware, annonceController.getAnnonce);
router.post('/', authMiddleware, annonceController.createAnnonce);
router.put('/:id', authMiddleware, annonceController.updateAnnonce);
router.delete('/:id', authMiddleware, annonceController.deleteAnnonce);

router.get('/tutor/:id', authMiddleware, annonceController.getAnnoncesByTutorId);
// Dans vos routes
router.patch('/:id/toggle', authMiddleware, annonceController.toggleAnnonce);

module.exports = router;