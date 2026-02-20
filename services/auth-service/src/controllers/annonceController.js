const annonceService = require('../services/annonceService');
const { validate: isValidUUID } = require('uuid');

class AnnonceController {
  // Validateur UUID utilitaire
  validateUUID(id) {
    if (!isValidUUID(id)) {
      throw new Error(`ID invalide : "${id}" n'est pas un UUID valide`);
    }
    return true;
  }
  // Fonction d'extraction de mots-clés
  static extractKeywords(query) {
    // Enlever les mots vides et phrases courantes
    const stopWords = [
      'je', 'cherche', 'un', 'une', 'des', 'le', 'la', 'les', 'de', 'du', 'des',
      'pour', 'avec', 'sur', 'dans', 'par', 'au', 'aux', 'en', 'cours', 'cours de',
      'annonce', 'annonces', 'tutorat', 'tuteur', 'professeur', 'enseignant'
    ];
    
    let cleaned = query.toLowerCase();
    
    // Enlever les stop words
    stopWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      cleaned = cleaned.replace(regex, '');
    });
    
    // Nettoyer les espaces multiples
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    // Si vide après nettoyage, utiliser l'original
    if (cleaned.length === 0) {
      cleaned = query.toLowerCase();
    }
    
    // Prendre les 3 premiers mots-clés max
    const keywords = cleaned.split(' ').filter(k => k.length > 2).slice(0, 3);
    
    return keywords.join(' ');
  }

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
      const axios = require('axios');
      
      // SI recherche textuelle (pas vide), utiliser RAG
      if (filters.subject && filters.subject.trim().length > 0) {
        try {
          // 1. Nettoyer la requête
          const cleanedQuery = AnnonceController.extractKeywords(filters.subject);
          console.log('🔍 Requête nettoyée:', cleanedQuery, '← Original:', filters.subject);
          
          // 2. Appeler RAG avec la bonne URL
          const ragResponse = await axios.get('http://localhost:3005/search/semantic', {
            params: {
              q: cleanedQuery,
              level: filters.level,
              minPrice: filters.minPrice,
              maxPrice: filters.maxPrice,
              teachingMode: filters.teachingMode,
              limit: 12
            },
            timeout: 5000
          });
          
          console.log('📊 Réponse RAG:', {
            success: ragResponse.data.success,
            results: ragResponse.data.data?.results?.length || 0
          });
          
          // 3. Traiter les résultats RAG
          if (ragResponse.data.success && ragResponse.data.data?.results?.length > 0) {
            const cleanedQueryLower = cleanedQuery.toLowerCase();
            const relevantResults = ragResponse.data.data.results.filter((ragResult) => {
              const hasPythonInQuery = cleanedQueryLower.includes('python');
              const hasQueryInSubjects = ragResult.subjects?.some((subject) => 
                subject.toLowerCase().includes(cleanedQueryLower)
              );
              
              if (hasPythonInQuery) {
                return ragResult.subjects?.some((s) => s.toLowerCase().includes('python'));
              }
              
              return hasQueryInSubjects || ragResult.title.toLowerCase().includes(cleanedQueryLower);
            });
            
            console.log(`🎯 Résultats pertinents: ${relevantResults.length} sur ${ragResponse.data.data.results.length}`);
            
            const annonces = relevantResults.map((ragResult) => ({
              id: ragResult.annonceId,
              tutorId: ragResult.tutorId,
              title: ragResult.title,
              description: ragResult.description,
              subjects: ragResult.subjects || [],
              subject: ragResult.subjects?.[0] || '',
              level: ragResult.level,
              hourlyRate: parseFloat(ragResult.hourlyRate) || 30,
              teachingMode: ragResult.teachingMode,
              location: ragResult.location,
              tutor: {
                id: ragResult.tutorId,
                user: {
                  id: ragResult.tutorId,
                  firstName: ragResult.tutorName?.split(' ')[0] || '',
                  lastName: ragResult.tutorName?.split(' ').slice(1).join(' ') || '',
                  email: '',
                  skillsToLearn: ragResult.tutorSkillsToLearn || []
                },
                rating: parseFloat(ragResult.tutorRating) || 4.0,
                reviewsCount: 0,
                profilePicture: '',
                bio: '',
                experience: '',
                specialties: ragResult.subjects || []
              },
              relevanceScore: ragResult.relevanceScore || 0
            })).sort((a, b) => b.relevanceScore - a.relevanceScore);
            
            const topAnnonces = annonces.slice(0, 6);
            
            return res.json({
              success: true,
              message: 'Recherche sémantique effectuée',
              data: {
                annonces: topAnnonces,
                totalAnnonces: topAnnonces.length,
                totalPages: 1,
                currentPage: 1
              }
            });
          }
        } catch (ragError) {
          console.error('⚠️ Erreur RAG, fallback à recherche normale:', ragError.message);
          // Continue avec la recherche normale
        }
      }
      
      // Recherche normale si pas de RAG ou RAG échoue
      const result = await annonceService.searchAnnonces(filters, isPublic);
      
      return res.json({
        success: true,
        data: result
      });
      
    } catch (error) {
      console.error('❌ Erreur recherche annonces:', error);
      return res.status(500).json({
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
      
      // Valider le format UUID
      if (!isValidUUID(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID invalide - doit être un UUID'
        });
      }
      
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
            
      if (!text || text.trim().length < 10) {
        return res.status(400).json({
          success: false,
          message: 'Le texte doit contenir au moins 10 caractères'
        });
      }
      
      const AITextProcessor = require('../services/aiTextProcessor');
      
      const analysis = await AITextProcessor.analyzeTextWithAI(text);

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

  /**
   * Recherche avec RAG
   */
  async searchWithRAG(req, res) {
    try {
      const { q: query, ...filters } = req.query;
      
      if (!query || query.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'La requête doit contenir au moins 2 caractères'
        });
      }
      
      // Appeler le service RAG
      const ragService = require('../../rag-service/src/services/RagService');
      const results = await ragService.semanticSearch(query, filters, 12);
      
      // Transformer les résultats RAG en format compatible
      const annonces = results.map(ragResult => ({
        id: ragResult.annonceId,
        tutorId: ragResult.tutorId,
        title: ragResult.title,
        description: ragResult.description,
        subjects: ragResult.subjects || [],
        subject: ragResult.subjects?.[0] || '',
        level: ragResult.level,
        hourlyRate: parseFloat(ragResult.hourlyRate) || 30,
        teachingMode: ragResult.teachingMode,
        location: ragResult.location,
        tutor: {
          id: ragResult.tutorId,
          user: {
            id: ragResult.tutorId,
            firstName: ragResult.tutorName?.split(' ')[0] || '',
            lastName: ragResult.tutorName?.split(' ').slice(1).join(' ') || '',
            email: '',
            skillsToLearn: ragResult.tutorSkillsToLearn || []
          },
          rating: parseFloat(ragResult.tutorRating) || 4.0,
          reviewsCount: 0,
          profilePicture: '',
          bio: '',
          experience: '',
          specialties: ragResult.subjects || []
        },
        relevanceScore: ragResult.relevanceScore || 0
      }));
      
      res.json({
        success: true,
        message: 'Recherche sémantique effectuée',
        data: {
          annonces,
          totalAnnonces: annonces.length,
          totalPages: 1,
          currentPage: 1
        }
      });
      
    } catch (error) {
      console.error('❌ Erreur recherche RAG:', error);
      
      // Fallback à la recherche normale
      return this.searchAnnonces(req, res);
    }
  }
}

module.exports = new AnnonceController();