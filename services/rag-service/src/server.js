const express = require('express');
const cors = require('cors');

let ragService;
try {
  ragService = require('./services/RagService');
  console.log('✅ RagService chargé');
} catch (error) {
  console.error('⚠️ RagService non disponible:', error.message);
  ragService = null;
}

const app = express();
const PORT = process.env.PORT || 3005;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:3000'],
  credentials: true
}));

// Route de santé
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'RAG Service',
    ragServiceAvailable: ragService !== null,
    timestamp: new Date().toISOString()
  });
});

// Route de recherche sémantique
app.get('/search/semantic', async (req, res) => {
  try {
    const { q, limit = 10, level, minPrice, maxPrice, teachingMode, location } = req.query;
    
    console.log('🔍 [API] Recherche sémantique reçue:', { q, limit, level, minPrice, maxPrice, teachingMode });
    
    if (!q || q.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Paramètre "q" manquant',
        data: null
      });
    }

    if (!ragService) {
      console.warn('⚠️ RagService indisponible');
      return res.status(503).json({
        success: false,
        message: 'Service RAG indisponible - dépendances manquantes',
        data: null
      });
    }

    const filters = {
      level: level || undefined,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      teachingMode: teachingMode || undefined,
      location: location || undefined
    };

    const results = await ragService.semanticSearch(q, filters, parseInt(limit));
    
    console.log(`✅ [API] ${results.length} résultats retournés`);
    
    res.json({
      success: true,
      message: 'Recherche effectuée',
      data: {
        results,
        query: q,
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
    console.error('❌ [API] Erreur recherche:', error.message);
    res.status(500).json({
      success: false,
      message: error.message,
      data: null
    });
  }
});

// Route d'échange de compétences
app.post('/search/exchange', async (req, res) => {
  try {
    const { skillsToTeach, skillsToLearn } = req.body;
    
    if (!skillsToLearn || !Array.isArray(skillsToLearn)) {
      return res.status(400).json({
        success: false,
        message: 'skillsToLearn requis (array)',
        data: null
      });
    }

    if (!ragService) {
      return res.status(503).json({
        success: false,
        message: 'Service RAG indisponible',
        data: null
      });
    }

    const results = await ragService.findSkillExchange({ skillsToTeach, skillsToLearn });
    
    res.json({
      success: true,
      message: 'Échanges trouvés',
      data: { results }
    });
  } catch (error) {
    console.error('❌ [API] Erreur skill exchange:', error.message);
    res.status(500).json({
      success: false,
      message: error.message,
      data: null
    });
  }
});

// Route de synchronisation (admin)
app.post('/sync', async (req, res) => {
  try {
    console.log('🔄 [API] Demande de synchronisation...');
    
    if (!ragService) {
      return res.status(503).json({
        success: false,
        message: 'Service RAG indisponible',
        data: null
      });
    }
    
    res.json({
      success: true,
      message: 'Synchronisation lancée',
      data: null
    });
  } catch (error) {
    console.error('❌ [API] Erreur sync:', error.message);
    res.status(500).json({
      success: false,
      message: error.message,
      data: null
    });
  }
});

// Gestion des erreurs 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route non trouvée: ${req.method} ${req.path}`,
    data: null
  });
});

// Démarrage du serveur
const server = app.listen(PORT, () => {
  console.log('');
  console.log('🚀 ═══════════════════════════════════════════════');
  console.log(`🚀 Serveur RAG démarré sur port ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`🔍 Recherche: http://localhost:${PORT}/search/semantic?q=test`);
  console.log(`💚 Santé: http://localhost:${PORT}/health`);
  console.log(`📦 RagService: ${ragService ? '✅ Chargé' : '❌ Indisponible'}`);
  console.log('🚀 ═══════════════════════════════════════════════');
  console.log('');
});

// Gestion des erreurs au démarrage
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Le port ${PORT} est déjà utilisé`);
    console.log('💡 Solutions:');
    console.log(`   1. Arrêter le processus utilisant le port ${PORT}`);
    console.log(`   2. Utiliser un autre port: PORT=3006 npm run dev`);
  } else {
    console.error('❌ Erreur serveur:', error.message);
  }
  process.exit(1);
});

// Gestion des erreurs non capturées
process.on('uncaughtException', (error) => {
  console.error('❌ Erreur non capturée:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promesse rejetée non gérée:', reason);
});

// Arrêt gracieux
process.on('SIGTERM', () => {
  console.log('📛 SIGTERM reçu, arrêt du serveur...');
  server.close(() => {
    console.log('✅ Serveur arrêté');
    process.exit(0);
  });
});