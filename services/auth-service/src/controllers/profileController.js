const profileService = require('../services/profileService');
const authService = require('../services/authService');
const multer = require('multer');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');


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

      // ⚠️ Les admins n'ont pas besoin de profil
      if (user.role === 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Les administrateurs ne peuvent pas créer/modifier de profil. Utilisez la page /admin pour gérer les configurations IA.'
        });
      }

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

      //Les admins n'ont pas de profil
      if (user.role === 'admin') {
        return res.status(200).json({
          success: true,
          data: null,
          message: 'Admin - pas de profil'
        });
      }

      const profile = await profileService.getProfile(user.id, user.role);

      // Récupérer les informations de disponibilité depuis le profil tuteur
      let availability = { online: false, inPerson: false };
      if (profile && profile.availability) {
        availability = profile.availability;
      } else if (user.role === 'tutor') {
        // Si pas de profil créé, essayer de récupérer depuis la table ProfileTutor
        const { ProfileTutor } = require('../models/associations');
        const tutorProfile = await ProfileTutor.findOne({ where: { userId: user.id } });
        if (tutorProfile && tutorProfile.availability) {
          availability = tutorProfile.availability;
        }
      }

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
            isVerified: user.isVerified,
            skillsToTeach: user.skillsToTeach || [],
            skillsToLearn: user.skillsToLearn || [],
            availability: availability 
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
   
      // Les admins n'ont pas besoin de statut de profil
      if (user.role === 'admin') {
        return res.status(200).json({
          success: true,
          data: {
            isCompleted: true,
            completionPercentage: 100,
            currentStep: null
          },
          message: 'Admin'
        });
      }

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
          attributes: ['id', 'firstName', 'lastName', 'email', 'skillsToTeach', 'skillsToLearn']
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
          attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'skillsToTeach', 'skillsToLearn']
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
          attributes: ['id', 'firstName', 'lastName', 'email', 'skillsToTeach', 'skillsToLearn']
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
          attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'skillsToTeach', 'skillsToLearn']
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

  async addSkills(req, res) {
    try {
      const user = req.user;
      const { skills } = req.body;

      if (!skills || !Array.isArray(skills) || skills.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Veuillez fournir un tableau de compétences valide'
        });
      }

      console.log(`📚 Ajout de compétences pour l'utilisateur ${user.id}:`, skills);

      // Récupérer l'utilisateur actuel
      const { User } = require('../models/associations');
      const userRecord = await User.findByPk(user.id);

      if (!userRecord) {
        return res.status(404).json({
          success: false,
          message: 'Utilisateur non trouvé'
        });
      }

      // Récupérer les compétences existantes
      const existingSkills = userRecord.skills || [];
      
      // Fusionner les compétences (sans doublons)
      const mergedSkills = [...new Set([...existingSkills, ...skills])];

      // Mettre à jour l'utilisateur
      await userRecord.update({ skills: mergedSkills });

      console.log(`✅ Compétences ajoutées avec succès. Total: ${mergedSkills.length}`);

      res.json({
        success: true,
        message: `${skills.length} compétence(s) ajoutée(s) avec succès`,
        data: {
          newSkills: skills,
          allSkills: mergedSkills,
          totalSkills: mergedSkills.length
        }
      });
    } catch (error) {
      console.error('❌ Erreur lors de l\'ajout des compétences:', error);
      res.status(500).json({
        success: false,
        message: `Erreur lors de l'ajout des compétences: ${error.message}`
      });
    }
  }

  /**
   * Calculer et mettre à jour le rating moyen d'un tuteur basé sur ses reviews
   */
  async updateTutorRating(tutorUserId) {
    try {
      const { Review, ProfileTutor } = require('../models/associations');
      
      // Récupérer toutes les reviews confirmées où le tuteur est la cible
      const reviews = await Review.findAll({
        where: {
          targetUserId: tutorUserId,
          isConfirmed: true
        },
        attributes: ['rating']
      });

      // Filtrer les reviews qui ont une note (étudiants évaluant des tuteurs)
      const ratingsOnly = reviews.filter(r => r.rating !== null).map(r => r.rating);

      if (ratingsOnly.length === 0) {
        console.log(`ℹ️ Aucune note trouvée pour le tuteur ${tutorUserId}`);
        return { rating: 0, reviewsCount: 0 };
      }

      // Calculer la moyenne
      const averageRating = ratingsOnly.reduce((sum, rating) => sum + rating, 0) / ratingsOnly.length;
      const roundedRating = Math.round(averageRating * 10) / 10; // Arrondir à 1 décimale

      // Mettre à jour le profil tuteur
      const tutorProfile = await ProfileTutor.findOne({ where: { userId: tutorUserId } });
      
      if (tutorProfile) {
        await tutorProfile.update({
          rating: roundedRating,
          reviewsCount: ratingsOnly.length
        });
        
        console.log(`✅ Rating tuteur ${tutorUserId} mis à jour: ${roundedRating}/5 (${ratingsOnly.length} avis)`);
      }

      return {
        rating: roundedRating,
        reviewsCount: ratingsOnly.length
      };
    } catch (error) {
      console.error('❌ Erreur mise à jour rating tuteur:', error);
      throw error;
    }
  }

  /**
   * Endpoint public pour récupérer le rating d'un tuteur
   */
  async getTutorRating(req, res) {
    try {
      const { tutorId } = req.params;
      const { ProfileTutor, User } = require('../models/associations');
      
      // Chercher le profil tuteur par ID de profil
      let tutorProfile = await ProfileTutor.findByPk(tutorId, {
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName']
        }]
      });

      // Si pas trouvé, chercher par userId
      if (!tutorProfile) {
        tutorProfile = await ProfileTutor.findOne({
          where: { userId: tutorId },
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName']
          }]
        });
      }

      if (!tutorProfile) {
        return res.status(404).json({
          success: false,
          message: 'Tuteur non trouvé'
        });
      }

      // Recalculer le rating pour être sûr qu'il soit à jour
      const { rating, reviewsCount } = await this.updateTutorRating(tutorProfile.userId);

      res.json({
        success: true,
        data: {
          tutorId: tutorProfile.id,
          userId: tutorProfile.userId,
          name: `${tutorProfile.user.firstName} ${tutorProfile.user.lastName}`,
          rating,
          reviewsCount
        }
      });
    } catch (error) {
      console.error('❌ Erreur récupération rating tuteur:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Endpoint pour mettre à jour le rating d'un tuteur (appelé après confirmation d'avis)
   */
  async updateTutorRatingEndpoint(req, res) {
    try {
      const { userId } = req.params;
      
      const { rating, reviewsCount } = await this.updateTutorRating(userId);

      res.json({
        success: true,
        message: 'Rating mis à jour avec succès',
        data: {
          rating,
          reviewsCount
        }
      });
    } catch (error) {
      console.error('❌ Erreur endpoint mise à jour rating:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = new ProfileController();