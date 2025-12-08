const profileService = require('../services/profileService');
const authService = require('../services/authService');
const multer = require('multer');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

const cvParserAgent = require('../../../cv-parser-service/src/agents/cv-parser.agent');
const linkedinParserAgent = require('../../../cv-parser-service/src/agents/linkedin-parser.agent');
const dataEnhancerAgent = require('../../../cv-parser-service/src/agents/data-enhancer.agent');

class ProfileController {
  constructor() {
    console.log('✅ ProfileController initialisé');
  }

  /**
   * Sauvegarder le profil utilisateur
   */
  async saveProfile(req, res) {
    try {
      const user = req.user;
      const { profileData, currentStep } = req.body;

      console.log('📥 Données reçues dans saveProfile:');
      console.log('Current Step:', currentStep);
      console.log('Schedule:', profileData?.schedule);
      console.log('Availability:', profileData?.availability);

      // Nettoyer les dates passées du schedule avant sauvegarde
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const cleanedSchedule = (profileData.schedule || []).filter((day) => {
        if (!day.date) return false;
        const dayDate = new Date(day.date);
        dayDate.setHours(0, 0, 0, 0);
        return dayDate >= today;
      });

      const cleanedProfileData = {
        ...profileData,
        schedule: cleanedSchedule
      };

      const profile = await profileService.createOrUpdateProfile(
        user.id,
        user.role,
        cleanedProfileData
      );

      console.log('✅ Profil sauvegardé avec succès');

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
      console.error('❌ ERREUR dans saveProfile:');
      console.error('Message:', error.message);

      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Récupérer le profil utilisateur
   */
  async getProfile(req, res) {
    try {
      const user = req.user;
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

      if (error.message.includes('Profil non trouvé')) {
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

  /**
   * Finaliser le profil utilisateur
   */
  async completeProfile(req, res) {
    try {
      const user = req.user;
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

  /**
   * Récupérer le statut du profil
   */
  async getProfileStatus(req, res) {
    try {
      const user = req.user;
      const hasProfile = await profileService.profileExists(user.id, user.role);

      let profile = null;
      if (hasProfile) {
        profile = await profileService.getProfile(user.id, user.role);
      }

      const status = {
        hasProfile,
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

      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // ======================
  // GESTION DES TUTEURS/ÉTUDIANTS
  // ======================

  /**
   * Récupérer un tuteur par ID
   */
  async getTutorById(req, res) {
    try {
      const { tutorId } = req.params;
      const { ProfileTutor, User } = require('../models/associations');

      const tutor = await ProfileTutor.findOne({
        where: { id: tutorId },
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }]
      });

      if (!tutor) {
        return res.status(404).json({
          success: false,
          message: 'Tuteur non trouvé'
        });
      }

      res.json({
        success: true,
        message: 'Tuteur récupéré avec succès',
        data: tutor
      });
    } catch (error) {
      console.error('Erreur récupération tuteur:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Récupérer un tuteur par userId
   */
  async getTutorByUserId(req, res) {
    try {
      const { userId } = req.params;
      const { ProfileTutor, User } = require('../models/associations');

      const tutor = await ProfileTutor.findOne({
        where: { userId },
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role']
        }]
      });

      if (!tutor) {
        return res.status(404).json({
          success: false,
          message: 'Tuteur non trouvé'
        });
      }

      res.json({
        success: true,
        message: 'Tuteur récupéré',
        data: tutor
      });
    } catch (error) {
      console.error('Erreur getTutorByUserId:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Récupérer un étudiant par ID
   */
  async getStudentById(req, res) {
    try {
      const { studentId } = req.params;
      const { ProfileStudent, User } = require('../models/associations');

      const student = await ProfileStudent.findOne({
        where: { id: studentId },
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }]
      });

      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Étudiant non trouvé'
        });
      }

      res.json({
        success: true,
        message: 'Étudiant récupéré',
        data: student
      });
    } catch (error) {
      console.error('Erreur récupération étudiant:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Récupérer un étudiant par userId
   */
  async getStudentByUserId(req, res) {
    try {
      const { userId } = req.params;
      const { ProfileStudent, User } = require('../models/associations');

      const student = await ProfileStudent.findOne({
        where: { userId },
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role']
        }]
      });

      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Étudiant non trouvé'
        });
      }

      res.json({
        success: true,
        message: 'Étudiant récupéré',
        data: student
      });
    } catch (error) {
      console.error('Erreur getStudentByUserId:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // ======================
  // GESTION DES FICHIERS
  // ======================

  /**
   * Configuration de multer pour l'upload de fichiers (diplômes, CV, etc.)
   */
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

  /**
   * Configuration de multer pour l'analyse de CV (en mémoire)
   */
  cvUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024 // 5MB max
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = /pdf|doc|docx/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);

      if (mimetype && extname) {
        return cb(null, true);
      } else {
        cb(new Error('Seuls les fichiers PDF et Word sont autorisés'));
      }
    }
  }).single('cv');

  /**
   * Upload de fichier (diplômes, CV, etc.)
   */
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
          originalName: req.file.originalname,
          size: req.file.size
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
    /**
   * Analyser un CV avec l'agent IA
   */
  async parseCV(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Aucun fichier CV fourni'
        });
      }

      const user = req.user;
      
      // Analyser le CV
      const cvResult = await cvParserAgent.parseCV(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );

      // Récupérer le profil existant
      const existingProfile = await profileService.getProfile(user.id, user.role);

      // Fusionner avec le profil existant
      const mergedData = await dataEnhancerAgent.mergeProfiles(
        cvResult.data,
        null,
        existingProfile
      );

      res.json({
        success: true,
        message: 'CV analysé et fusionné avec succès',
        data: mergedData.data,
        validation: mergedData.data.validation,
        suggestions: mergedData.suggestions
      });
    } catch (error) {
      console.error('Erreur analyse CV:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Scraper un profil LinkedIn
   */
  async scrapeLinkedIn(req, res) {
    try {
      const { linkedinUrl } = req.body;
      const user = req.user;

      if (!linkedinUrl) {
        return res.status(400).json({
          success: false,
          message: 'URL LinkedIn requise'
        });
      }

      // Scraper LinkedIn
      const linkedinResult = await linkedinParserAgent.scrapeLinkedInProfile(linkedinUrl);

      // Récupérer le profil existant
      const existingProfile = await profileService.getProfile(user.id, user.role);

      // Fusionner avec le profil existant
      const mergedData = await dataEnhancerAgent.mergeProfiles(
        null,
        linkedinResult.data,
        existingProfile
      );

      res.json({
        success: true,
        message: 'Profil LinkedIn importé avec succès',
        data: mergedData.data,
        validation: mergedData.data.validation,
        suggestions: mergedData.suggestions
      });
    } catch (error) {
      console.error('Erreur LinkedIn scraping:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Fusionner toutes les sources
   */
  async mergeAllSources(req, res) {
    try {
      const user = req.user;
      const { cvData, linkedinData } = req.body;

      // Récupérer le profil existant
      const existingProfile = await profileService.getProfile(user.id, user.role);

      // Fusionner toutes les sources
      const mergedData = await dataEnhancerAgent.mergeProfiles(
        cvData,
        linkedinData,
        existingProfile
      );

      // Mettre à jour le profil
      const updatedProfile = await profileService.createOrUpdateProfile(
        user.id,
        user.role,
        mergedData.data
      );

      res.json({
        success: true,
        message: 'Toutes les sources fusionnées avec succès',
        data: updatedProfile,
        metadata: mergedData.metadata,
        suggestions: mergedData.suggestions
      });
    } catch (error) {
      console.error('Erreur fusion sources:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = new ProfileController();