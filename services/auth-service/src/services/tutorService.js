const { ProfileTutor, User, Annonce } = require('../models/associations');
const { Op } = require('sequelize');

class TutorService {
  // Rechercher des tuteurs via leurs annonces
  async searchTutors(filters = {}) {
    try {
      const {
        page = 1,
        limit = 9,
        subject,
        level,
        minRating,
        maxPrice,
        teachingMode,
        location
      } = filters;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const offset = (pageNum - 1) * limitNum;

      // Construction de la clause WHERE pour les annonces
      const whereClause = {
        isActive: true
      };

      if (subject) {
        whereClause.subject = {
          [Op.iLike]: `%${subject}%`
        };
      }

      if (level) {
        whereClause.level = {
          [Op.iLike]: `%${level}%`
        };
      }

      if (maxPrice) {
        whereClause.hourlyRate = {
          [Op.lte]: parseFloat(maxPrice)
        };
      }

      if (teachingMode) {
        whereClause.teachingMode = teachingMode;
      }

      if (location) {
        whereClause['$location.city$'] = {
          [Op.iLike]: `%${location}%`
        };
      }

      // Compter le total des annonces
      const count = await Annonce.count({
        where: whereClause,
        include: [{
          model: ProfileTutor,
          as: 'tutor',
          where: {
            isVerified: true,
            isCompleted: true
          },
          ...(minRating && {
            rating: {
              [Op.gte]: parseFloat(minRating)
            }
          })
        }]
      });

      // Récupérer les annonces avec les infos du tuteur
      const annonces = await Annonce.findAll({
        where: whereClause,
        include: [{
          model: ProfileTutor,
          as: 'tutor',
          where: {
            isVerified: true,
            isCompleted: true
          },
          ...(minRating && {
            rating: {
              [Op.gte]: parseFloat(minRating)
            }
          }),
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'email']
          }]
        }],
        limit: limitNum,
        offset: offset,
        order: [['createdAt', 'DESC']]
      });

      const totalPages = Math.ceil(count / limitNum);

      return {
        annonces,
        totalAnnonces: count,
        currentPage: pageNum,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      };
    } catch (error) {
      throw new Error(`Erreur lors de la recherche des annonces: ${error.message}`);
    }
  }

  // Récupérer un tuteur par ID (inchangé)
  async getTutorById(tutorId) {
    try {
      const tutor = await ProfileTutor.findOne({
        where: { 
          id: tutorId,
          isVerified: true,
          isCompleted: true 
        },
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }]
      });

      if (!tutor) {
        throw new Error('Tuteur non trouvé');
      }

      return tutor;
    } catch (error) {
      throw new Error(`Erreur lors de la récupération du tuteur: ${error.message}`);
    }
  }

  // Récupérer tous les tuteurs (pour l'admin)
  async getAllTutors() {
    try {
      const tutors = await ProfileTutor.findAll({
        where: { isVerified: true, isCompleted: true },
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }]
      });

      return tutors;
    } catch (error) {
      throw new Error(`Erreur lors de la récupération des tuteurs: ${error.message}`);
    }
  }

  // Mettre à jour les paramètres du tuteur
  async updateTutorSettings(tutorId, settings) {
    try {
      const tutor = await ProfileTutor.findByPk(tutorId);
      if (!tutor) {
        throw new Error('Tuteur non trouvé');
      }

      await tutor.update(settings);
      return tutor;
    } catch (error) {
      throw new Error(`Erreur lors de la mise à jour des paramètres: ${error.message}`);
    }
  }

  // Récupérer les statistiques d'un tuteur
  async getTutorStats(tutorId) {
    try {
      const tutor = await ProfileTutor.findByPk(tutorId);
      if (!tutor) {
        throw new Error('Tuteur non trouvé');
      }

      // Compter les annonces actives
      const activeAnnoncesCount = await Annonce.count({
        where: { 
          tutorId,
          isActive: true 
        }
      });

      // Compter les annonces totales
      const totalAnnoncesCount = await Annonce.count({
        where: { tutorId }
      });

      return {
        rating: tutor.rating,
        reviewsCount: tutor.reviewsCount,
        activeAnnonces: activeAnnoncesCount,
        totalAnnonces: totalAnnoncesCount,
        completionPercentage: tutor.completionPercentage
      };
    } catch (error) {
      throw new Error(`Erreur lors de la récupération des statistiques: ${error.message}`);
    }
  }
}

module.exports = new TutorService();