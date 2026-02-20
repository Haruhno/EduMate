const express = require('express');
const cors = require('cors');
const RagService = require('./services/RagService');

const app = express();
const PORT = process.env.PORT || 3005;

// Middleware
app.use(cors());
app.use(express.json());

console.log('🚀 Démarrage du service RAG...');
console.log(`📊 Port: ${PORT}`);

// Health check
app.get('/health', (req, res) => {
  console.log('🔍 Health check');
  res.json({ status: 'OK', message: 'Service RAG opérationnel' });
});

// Recherche sémantique
app.get('/search/semantic', async (req, res) => {
  try {
    const { q: query = '', limit = 10, level, minPrice, maxPrice, teachingMode, location } = req.query;
    
    console.log(`\n🔍 [API] Recherche sémantique reçue:`, {
      query,
      limit: parseInt(limit),
      level, minPrice, maxPrice, teachingMode, location
    });
    
    const filters = {};
    if (level) filters.level = level;
    if (minPrice) filters.minPrice = parseFloat(minPrice);
    if (maxPrice) filters.maxPrice = parseFloat(maxPrice);
    if (teachingMode) filters.teachingMode = teachingMode;
    if (location) filters.location = location;
    
    const results = await RagService.semanticSearch(query, filters, parseInt(limit));
    
    res.json({
      success: true,
      message: 'Recherche complétée',
      data: {
        results,
        query,
        filters,
        total: results.length,
        limit: parseInt(limit)
      },
      metadata: {
        searchType: 'semantic',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Erreur recherche sémantique:', error.message);
    res.status(500).json({
      success: false,
      message: error.message,
      data: { results: [] }
    });
  }
});

// Synchronisation des annonces
app.post('/sync', async (req, res) => {
  try {
    console.log('🔄 Synchronisation manuelle des annonces...');
    const result = await RagService.syncAnnonces();
    res.json(result);
  } catch (error) {
    console.error('❌ Erreur sync:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Recherche d'échange de compétences
app.post('/search/exchange', async (req, res) => {
  try {
    const { skillsToTeach = [], skillsToLearn = [] } = req.body;
    console.log('🔄 Recherche échange:', { skillsToTeach, skillsToLearn });
    
    const results = await RagService.findSkillExchange({ skillsToTeach, skillsToLearn });
    res.json({
      success: true,
      message: 'Recherche échange complétée',
      data: results
    });
  } catch (error) {
    console.error('❌ Erreur exchange:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error('❌ Erreur serveur:', err.message);
  res.status(500).json({ 
    success: false, 
    message: 'Erreur serveur interne',
    error: err.message 
  });
});

// Démarrage
app.listen(PORT, () => {
  console.log(`\n✅ Service RAG lancé sur http://localhost:${PORT}`);
  console.log(`🔗 Health: http://localhost:${PORT}/health`);
  console.log(`🔍 Search: http://localhost:${PORT}/search/semantic`);
});