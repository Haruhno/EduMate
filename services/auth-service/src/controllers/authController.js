const authService = require('../services/authService');

class AuthController {
  async register(req, res) {
    try {
      const { email, password, firstName, lastName, role } = req.body;
      
      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({
          success: false,
          message: 'Tous les champs obligatoires doivent être remplis'
        });
      }

      const result = await authService.register({
        email,
        password,
        firstName,
        lastName,
        role: role || 'student'
      });

      res.status(201).json({
        success: true,
        message: 'Utilisateur créé avec succès',
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email et mot de passe requis'
        });
      }

      const result = await authService.login(email, password);

      res.json({
        success: true,
        message: 'Connexion réussie',
        data: result
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        message: error.message
      });
    }
  }

  async getProfile(req, res) {
    try {

      const user = req.user;

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Utilisateur non trouvé'
        });
      }

      res.json({
        success: true,
        message: 'Profil récupéré avec succès',
        data: user
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        message: error.message
      });
    }
  }

  // Nouvelle route pour vérifier l'authentification
  async checkAuth(req, res) {
    try {

      const user = req.user;

      
      if (!user) {
        return res.json({
          success: false,
          message: 'Token invalide'
        });
      }

      res.json({
        success: true,
        message: 'Authentifié',
        data: user
      });
    } catch (error) {
      res.json({
        success: false,
        message: error.message
      });
    }
  }

  // Dans authController.js - méthode migrateToTutor
  async migrateToTutor(req, res) {
    try {
      const user = req.user;

      const { specialties, hourlyRate, experience, availability } = req.body;

      // Vérifier si l'utilisateur est déjà tuteur
      if (user.role === 'tutor') {
        return res.status(400).json({
          success: false,
          message: 'Vous êtes déjà tuteur'
        });
      }

      // Vérifier que c'est bien un étudiant
      if (user.role !== 'student') {
        return res.status(400).json({
          success: false,
          message: 'Seuls les étudiants peuvent devenir tuteurs'
        });
      }

      // Migrer vers tuteur
      const result = await authService.migrateToTutor(
        user.id,
        {
          specialties,
          hourlyRate,
          experience,
          availability
        }
      );

      res.json({
        success: true,
        message: 'Migration vers tuteur réussie',
        data: {
          user: result.user,
          tutorProfile: result.tutorProfile
        }
      });
    } catch (error) {
      console.error('Erreur migration tuteur:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
}




module.exports = new AuthController();