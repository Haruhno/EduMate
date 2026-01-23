const express = require('express');
const router = express.Router();
const annonceController = require('../controllers/annonceController');
const authMiddleware = require('../middlewares/authMiddleware');

// Routes publiques
router.get('/search', annonceController.searchAnnonces);
router.get('/hybrid-search', annonceController.hybridSearch);

// Routes protégées
router.use(authMiddleware);

router.get('/my-annonces', annonceController.getMyAnnonces);
router.post('/from-text', annonceController.createAnnonceFromText);
router.post('/', annonceController.createAnnonce);

// Routes paramétrées
router.get('/tutor/:id', annonceController.getAnnoncesByTutorId);
router.get('/:id', annonceController.getAnnonce);
router.put('/:id', annonceController.updateAnnonce);
router.delete('/:id', annonceController.deleteAnnonce);
router.patch('/:id/toggle', annonceController.toggleAnnonce);

// Route admin
router.post('/migrate-embeddings', annonceController.migrateEmbeddings);

// Route pour tester l'extraction IA
router.post('/test-extraction', authMiddleware, annonceController.testExtraction);

// Route pour générer une offre complète (titre + description)
router.post('/generate-offer', authMiddleware, async (req, res) => {
  try {
    const { skills, prompt, context } = req.body;
    
    if (!skills || !Array.isArray(skills) || skills.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Les compétences sont requises'
      });
    }
    
    const AITextProcessor = require('../services/aiTextProcessor');
    
    const text = `Je propose des cours de ${skills.join(', ')}. ${context || ''}`;
    
    const analysis = await AITextProcessor.generateOfferFromSkills(skills, context || '');
    
    res.json({
      success: true,
      data: {
        title: analysis.title,
        description: analysis.description,
        skills: analysis.skills
      }
    });
    
  } catch (error) {
    console.error('Erreur génération offre:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la génération de l\'offre'
    });
  }
});

// NOUVELLE ROUTE : Générer uniquement un titre
router.post('/generate-title', authMiddleware, async (req, res) => {
  try {
    const { skills } = req.body;
    
    if (!skills || !Array.isArray(skills) || skills.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Les compétences sont requises'
      });
    }
    
    const AITextProcessor = require('../services/aiTextProcessor');
    
    const result = await AITextProcessor.generateTitleOnly(skills);
    
    res.json({
      success: true,
      data: {
        title: result.title,
        description: result.description,
        skills: result.skills
      }
    });
    
  } catch (error) {
    console.error('Erreur génération titre:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la génération du titre'
    });
  }
});
// Route pour générer une offre complète (titre + description détaillée)
// Route pour générer une offre COMPLÈTE (titre + description)
router.post('/generate-offer', authMiddleware, async (req, res) => {
  try {
    const { skills, rawText } = req.body;
    
    console.log('📨 Requête génération offre:', { 
      skillsCount: skills?.length || 0,
      hasRawText: !!rawText 
    });
    
    if (!skills || !Array.isArray(skills) || skills.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Les compétences sont requises'
      });
    }
    
    const AITextProcessor = require('../services/aiTextProcessor');
    
    // TOUJOURS demander à l'IA de générer titre ET description
    const result = await AITextProcessor.generateOfferFromSkills(skills, rawText || '');
    
    console.log('✅ Offre générée:', {
      titleLength: result.title?.length || 0,
      descriptionLength: result.description?.length || 0
    });
    
    res.json({
      success: true,
      data: {
        title: result.title,
        description: result.description,
        skills: result.skills
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur génération offre:', error.message);
    res.status(500).json({
      success: false,
      message: `Erreur IA: ${error.message}`,
      details: 'La génération de description a échoué'
    });
  }
});

// Route pour générer UNIQUEMENT un titre
router.post('/generate-title', authMiddleware, async (req, res) => {
  try {
    const { skills } = req.body;
    
    if (!skills || !Array.isArray(skills) || skills.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Les compétences sont requises'
      });
    }
    
    const AITextProcessor = require('../services/aiTextProcessor');
    
    const result = await AITextProcessor.generateTitleOnly(skills);
    
    res.json({
      success: true,
      data: {
        title: result.title,
        description: '', // Vide car on veut juste le titre
        skills: result.skills
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur génération titre:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la génération du titre'
    });
  }
});

module.exports = router;