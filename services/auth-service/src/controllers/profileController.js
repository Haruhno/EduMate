const profileService = require('../services/profileService');
const authService = require('../services/authService');
const multer = require('multer');
const path = require('path');

class ProfileController {
  // Sauvegarder le profil
  async saveProfile(req, res) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Token manquant'
        });
      }

      const user = await authService.validateToken(token);
      const { profileData, currentStep } = req.body;

      const profile = await profileService.createOrUpdateProfile(
        user.id, 
        user.role, 
        profileData
      );

      res.json({
        success: true,
        message: 'Profil sauvegardé avec succès',
        data: {
          profile,
          currentStep,
          completionPercentage: profile.completionPercentage
        }
      });
    } catch (error) {
      console.error('Erreur sauvegarde profil:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Récupérer le profil - CORRIGÉ
  async getProfile(req, res) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Token manquant'
        });
      }

      const user = await authService.validateToken(token);
      const profile = await profileService.getProfile(user.id, user.role);

      res.json({
        success: true,
        message: 'Profil récupéré avec succès',
        data: {
          profile: profile || null,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            isVerified: user.isVerified
          }
        }
      });
    } catch (error) {
      console.error('Erreur récupération profil:', error);
      
      // Si le profil n'existe pas, retourner un succès avec profil null
      if (error.message.includes('Profil non trouvé') || error.message.includes('profil')) {
        return res.json({
          success: true,
          message: 'Profil non trouvé',
          data: {
            profile: null,
            user: null
          }
        });
      }

      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Finaliser le profil - MODIFIÉ (suppression vérification email)
  async completeProfile(req, res) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Token manquant'
        });
      }

      const user = await authService.validateToken(token);
      
      // SUPPRIMÉ: Vérification de l'email
      // Le profil peut être complété directement sans vérification d'email
      
      const profile = await profileService.completeProfile(user.id, user.role);

      res.json({
        success: true,
        message: 'Profil complété avec succès',
        data: profile
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Vérifier le statut du profil - CORRIGÉ
  async getProfileStatus(req, res) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Token manquant'
        });
      }

      const user = await authService.validateToken(token);
      const profile = await profileService.getProfile(user.id, user.role);

      const status = {
        hasProfile: !!profile,
        isCompleted: profile?.isCompleted || false,
        isVerified: user.isVerified || false,
        completionPercentage: profile?.completionPercentage || 0,
        role: user.role
      };

      res.json({
        success: true,
        message: 'Statut du profil récupéré',
        data: status
      });
    } catch (error) {
      console.error('Erreur statut profil:', error);
      
      // Si erreur due à un profil manquant, retourner le statut par défaut
      if (error.message.includes('Profil non trouvé') || error.message.includes('profil')) {
        return res.json({
          success: true,
          message: 'Statut récupéré',
          data: {
            hasProfile: false,
            isCompleted: false,
            isVerified: false,
            completionPercentage: 0,
            role: 'student'
          }
        });
      }

      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Configuration de multer pour l'upload de fichiers
  upload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, 'uploads/');
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
      }
    }),
    limits: {
      fileSize: 5 * 1024 * 1024 // 5MB max
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = /jpeg|jpg|png|pdf/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);

      if (mimetype && extname) {
        return cb(null, true);
      } else {
        cb(new Error('Seuls les fichiers JPEG, PNG et PDF sont autorisés'));
      }
    }
  });

  // Route pour l'upload de fichiers
  async uploadFile(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Aucun fichier uploadé'
        });
      }

      const fileUrl = `/uploads/${req.file.filename}`;

      res.json({
        success: true,
        message: 'Fichier uploadé avec succès',
        data: {
          url: fileUrl,
          filename: req.file.filename,
          originalName: req.file.originalname
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = new ProfileController();