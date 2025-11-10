const annonceService = require('../services/annonceService');

class AnnonceController {
  // Créer une annonce
  async createAnnonce(req, res) {
    try {
      const user = req.user;
      const annonceData = req.body;

      // Récupérer le profil tuteur de l'utilisateur
      const { ProfileTutor } = require('../models/associations');
      const tutorProfile = await ProfileTutor.findOne({ where: { userId: user.id } });

      if (!tutorProfile) {
        return res.status(400).json({
          success: false,
          message: 'Vous devez être tuteur pour créer une annonce'
        });
      }

      const annonce = await annonceService.createAnnonce(tutorProfile.id, annonceData);

      res.json({
        success: true,
        message: 'Annonce créée avec succès',
        data: annonce
      });
    } catch (error) {
      console.error('Erreur création annonce:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Récupérer les annonces d'un tuteur par son profile_tutor.id
  async getAnnoncesByTutorId(req, res) {
    try {
      const { id } = req.params; // id = ProfileTutor.id

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
  // Rechercher des annonces
  async searchAnnonces(req, res) {
    try {
      const filters = req.query;
      const result = await annonceService.searchAnnonces(filters);

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

  // Récupérer les annonces d'un tuteur
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

  // Mettre à jour une annonce
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

  // Supprimer une annonce
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

  // Récupérer une annonce spécifique
  async getAnnonce(req, res) {
    try {
      const { id } = req.params;

      const annonce = await annonceService.getAnnonceWithDetails(id);

      res.json({
        success: true,
        message: 'Annonce récupérée avec succès',
        data: annonce
      });
    } catch (error) {
      console.error('Erreur récupération annonce:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = new AnnonceController();