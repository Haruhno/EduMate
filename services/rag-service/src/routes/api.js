const express = require('express');
const router = express.Router();
const searchController = require('../controllers/SearchController');
const { verifyToken } = require('../middlewares/auth');

// Routes publiques
router.get('/search/semantic', searchController.semanticSearch);
router.get('/search/hybrid', searchController.hybridSearch);
router.get('/search/autocomplete', searchController.autocomplete);
router.post('/sync', searchController.syncData);  // ← SANS verifyToken

// Routes protégées
router.post('/search/exchange', verifyToken, searchController.skillExchange);

module.exports = router;