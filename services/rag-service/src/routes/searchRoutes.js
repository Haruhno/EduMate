const express = require('express');
const router = express.Router();
const searchController = require('../controllers/SearchController');

// ⚠️ ASSUREZ-VOUS QUE CES ROUTES EXISTENT
router.get('/semantic', searchController.semanticSearch); // GET /api/search/semantic
router.post('/exchange', searchController.skillExchange);
router.post('/sync', searchController.syncAnnonces);

module.exports = router;