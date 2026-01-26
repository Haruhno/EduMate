const annonceService = require('../services/annonceService');

class AnnonceController {
  async createAnnonce(req, res) {
    try {
      const user = req.user;
      const annonceData = req.body;

      console.log('👤 Utilisateur:', user.id);
      console.log('📝 Données annonce reçues:', annonceData);

      const { ProfileTutor } = require('../models/associations');
      const tutorProfile = await ProfileTutor.findOne({ where: { userId: user.id } });

      if (!tutorProfile) {
        return res.status(400).json({
          success: false,
          message: 'Vous devez être tuteur pour créer une annonce'
        });
      }

      console.log('🎯 Profil tuteur trouvé:', tutorProfile.id);

      const annonce = await annonceService.createAnnonce(tutorProfile.id, annonceData);

      res.json({
        success: true,
        message: 'Annonce créée avec succès',
        data: annonce
      });
    } catch (error) {
      console.error('❌ Erreur création annonce:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  async getAnnoncesByTutorId(req, res) {
    try {
      const { id } = req.params;
      const annonces = await annonceService.getAnnoncesByTutor(id);

      return res.status(200).json({
        success: true,
        data: annonces
      });
    } catch (error) {
      console.error('Erreur récupération annonces par tuteur:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async searchAnnonces(req, res) {
    try {
      const filters = req.query;
      const isPublic = !req.headers.authorization;

      const result = await annonceService.searchAnnonces({
        ...filters,
        isPublic
      });

      res.json({
        success: true,
        message: 'Annonces trouvées avec succès',
        data: result
      });
    } catch (error) {
      console.error('Erreur recherche annonces:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  async getMyAnnonces(req, res) {
    try {
      const user = req.user;
      const { ProfileTutor } = require('../models/associations');

      const tutorProfile = await ProfileTutor.findOne({ where: { userId: user.id } });

      if (!tutorProfile) {
        return res.status(400).json({
          success: false,
          message: 'Profil tuteur non trouvé'
        });
      }

      const annonces = await annonceService.getAnnoncesByTutor(tutorProfile.id);

      res.json({
        success: true,
        message: 'Annonces récupérées avec succès',
        data: annonces
      });
    } catch (error) {
      console.error('Erreur récupération annonces:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  async updateAnnonce(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const annonce = await annonceService.updateAnnonce(id, updateData);

      res.json({
        success: true,
        message: 'Annonce mise à jour avec succès',
        data: annonce
      });
    } catch (error) {
      console.error('Erreur mise à jour annonce:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  async deleteAnnonce(req, res) {
    try {
      const { id } = req.params;
      await annonceService.deleteAnnonce(id);

      res.json({
        success: true,
        message: 'Annonce supprimée avec succès'
      });
    } catch (error) {
      console.error('Erreur suppression annonce:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  async getAnnonce(req, res) {
    try {
      const { id } = req.params;
      console.log(`🔍 Récupération annonce ID: ${id}`);
      
      const annonce = await annonceService.getAnnonceById(id);
      
      console.log(`✅ Annonce trouvée:`, { 
        id: annonce.id, 
        title: annonce.title,
        tutorId: annonce.tutorId 
      });
      
      res.json({
        success: true,
        message: 'Annonce récupérée avec succès',
        data: annonce
      });
    } catch (error) {
      console.error('❌ Erreur récupération annonce:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Erreur lors de la récupération de l\'annonce'
      });
    }
  }

  async toggleAnnonce(req, res) {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      const annonce = await annonceService.toggleAnnonce(id, isActive);

      res.json({
        success: true,
        message: `Annonce ${isActive ? 'activée' : 'désactivée'} avec succès`,
        data: annonce
      });
    } catch (error) {
      console.error('Erreur modification statut annonce:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  async createAnnonceFromText(req, res) {
    try {
      const user = req.user;
      const { rawText, hourlyRate, location, availability } = req.body;

      if (!rawText || rawText.trim().length < 10) {
        return res.status(400).json({
          success: false,
          message: 'Le texte doit contenir au moins 10 caractères'
        });
      }

      const { ProfileTutor } = require('../models/associations');
      const tutorProfile = await ProfileTutor.findOne({ 
        where: { userId: user.id } 
      });

      if (!tutorProfile) {
        return res.status(400).json({
          success: false,
          message: 'Vous devez être tuteur pour créer une annonce'
        });
      }

      const additionalData = {
        hourlyRate: hourlyRate || 20,
        location: location || {
          address: tutorProfile.address || '',
          city: tutorProfile.location?.city || '',
          coordinates: tutorProfile.location?.coordinates || { lat: 0, lng: 0 }
        },
        availability: availability || {
          days: [],
          timeSlots: []
        }
      };

      const annonce = await annonceService.createAnnonceFromText(
        tutorProfile.id,
        rawText,
        additionalData
      );

      res.json({
        success: true,
        message: 'Annonce créée avec succès à partir du texte',
        data: annonce,
        metadata: {
          skillsDetected: annonce.detectedSkills?.length || 0,
          aiGenerated: true,
          textLength: rawText.length
        }
      });
    } catch (error) {
      console.error('Erreur création annonce depuis texte:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  async hybridSearch(req, res) {
    try {
      const { query, ...filters } = req.query;

      if (!query || query.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'La requête doit contenir au moins 2 caractères'
        });
      }

      const result = await annonceService.hybridSearchAnnonces(query, filters);

      res.json({
        success: true,
        message: 'Recherche effectuée avec succès',
        data: result
      });
    } catch (error) {
      console.error('Erreur recherche hybride:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  async migrateEmbeddings(req, res) {
    try {
      const user = req.user;
      
      if (user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Permission refusée'
        });
      }

      const result = await annonceService.migrateExistingAnnoncesToEmbeddings();

      res.json({
        success: true,
        message: 'Migration des embeddings lancée',
        data: result
      });
    } catch (error) {
      console.error('Erreur migration embeddings:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  async testExtraction(req, res) {
    try {
      const { text } = req.body;
      
      console.log('🧪 Test extraction IA avec texte:', text?.substring(0, 200) + '...');
      console.log('📏 Longueur du texte:', text?.length);
      
      if (!text || text.trim().length < 10) {
        return res.status(400).json({
          success: false,
          message: 'Le texte doit contenir au moins 10 caractères'
        });
      }
      
      const AITextProcessor = require('../services/aiTextProcessor');
      
      console.log('🚀 Appel à analyzeTextWithAI...');
      const analysis = await AITextProcessor.analyzeTextWithAI(text);
      
      console.log('✅ Analyse IA terminée');
      console.log('🎯 Titre:', analysis.title);
      console.log('🔧 Compétences détectées:', analysis.skills);
      console.log('📊 Nombre de compétences:', analysis.skills?.length);
      console.log('🎚️ Niveaux:', analysis.levels);
      console.log('🏆 Confidence:', analysis.extractionMetadata?.confidence);
      console.log('💬 Méthode extraction:', analysis.extractionMetadata?.extractionMethod);
      
      res.json({
        success: true,
        data: analysis
      });
    } catch (error) {
      console.error('❌ Erreur détaillée test extraction IA:', error);
      console.error('📝 Stack trace:', error.stack);
      
      res.status(500).json({
        success: false,
        message: error.message || 'Erreur lors de l\'analyse du texte',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
}

module.exports = new AnnonceController();