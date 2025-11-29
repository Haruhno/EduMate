const { Annonce, ProfileTutor, User } = require('../models/associations');
const { Op } = require('sequelize');

class AnnonceService {
  // Créer une annonce - CORRIGÉ
  async createAnnonce(tutorId, annonceData) {
    try {
      // Vérifier que le tuteur existe
      const tutor = await ProfileTutor.findByPk(tutorId);
      if (!tutor) {
        throw new Error('Tuteur non trouvé');
      }

      // S'assurer que subject est une string et subjects un tableau
      const annoncePayload = {
        tutorId,
        title: annonceData.title,
        description: annonceData.description,
        subject: annonceData.subject, // String principale
        subjects: Array.isArray(annonceData.subjects) ? annonceData.subjects : [annonceData.subject], // Tableau
        level: annonceData.level,
        hourlyRate: annonceData.hourlyRate,
        teachingMode: annonceData.teachingMode,
        location: annonceData.location,
        availability: annonceData.availability
      };

      console.log('📥 Données reçues pour création annonce:', annoncePayload);

      const annonce = await Annonce.create(annoncePayload);
      
      // RETOURNER L'ANNONCE AVEC LES DÉTAILS
      return await this.getAnnonceById(annonce.id);
    } catch (error) {
      console.error('Erreur détaillée création annonce:', error);
      throw new Error(`Erreur lors de la création de l'annonce: ${error.message}`);
    }
  }

  // Récupérer une annonce avec détails - CORRIGÉ (renommé)
  async getAnnonceById(annonceId) {
    try {
      const annonce = await Annonce.findByPk(annonceId, {
        include: [{
          model: ProfileTutor,
          as: 'tutor',
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'email']
          }]
        }]
      });

      if (!annonce) {
        throw new Error('Annonce non trouvée');
      }

      return annonce;
    } catch (error) {
      throw new Error(`Erreur lors de la récupération de l'annonce: ${error.message}`);
    }
  }

  // Rechercher des annonces
  async searchAnnonces(filters = {}) {
    try {
      const {
        page = 1,
        limit = 9,
        subject,
        level,
        minRating,
        maxPrice,
        teachingMode,
        location,
        minPrice
      } = filters;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const offset = (pageNum - 1) * limitNum;

      // Construction de la clause WHERE
      const whereClause = {
        isActive: true
      };

      // RECHERCHE DANS subject ET subjects
      if (subject) {
        whereClause[Op.or] = [
          { subject: { [Op.iLike]: `%${subject}%` } },
          { subjects: { [Op.contains]: [subject] } }
        ];
      }

      if (level) {
        whereClause.level = {
          [Op.iLike]: `%${level}%`
        };
      }

      if (teachingMode) {
        whereClause.teachingMode = teachingMode;
      }

      if (maxPrice) {
        whereClause.hourlyRate = {
          [Op.lte]: parseFloat(maxPrice)
        };
      }

      if (minPrice) {
        whereClause.hourlyRate = {
          ...whereClause.hourlyRate,
          [Op.gte]: parseFloat(minPrice)
        };
      }

      if (location) {
        whereClause['$location.city$'] = {
          [Op.iLike]: `%${location}%`
        };
      }

      // Compter le total
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

      // Récupérer les annonces
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

  // Récupérer les annonces d'un tuteur
  async getAnnoncesByTutor(tutorId) {
    try {
      const annonces = await Annonce.findAll({
        where: { tutorId },
        include: [{
          model: ProfileTutor,
          as: 'tutor',
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'email']
          }]
        }],
        order: [['createdAt', 'DESC']]
      });

      return annonces;
    } catch (error) {
      throw new Error(`Erreur lors de la récupération des annonces du tuteur: ${error.message}`);
    }
  }

  // Mettre à jour une annonce
  async updateAnnonce(annonceId, updateData) {
    try {
      const annonce = await Annonce.findByPk(annonceId);
      if (!annonce) {
        throw new Error('Annonce non trouvée');
      }

      await annonce.update(updateData);
      return await this.getAnnonceById(annonceId);
    } catch (error) {
      throw new Error(`Erreur lors de la mise à jour de l'annonce: ${error.message}`);
    }
  }

  // Supprimer une annonce
  async deleteAnnonce(annonceId) {
    try {
      const annonce = await Annonce.findByPk(annonceId);
      if (!annonce) {
        throw new Error('Annonce non trouvée');
      }

      await annonce.destroy();
      return true;
    } catch (error) {
      throw new Error(`Erreur lors de la suppression de l'annonce: ${error.message}`);
    }
  }

  // Désactiver/activer une annonce
  async toggleAnnonce(annonceId, isActive) {
    try {
      const annonce = await Annonce.findByPk(annonceId);
      if (!annonce) {
        throw new Error('Annonce non trouvée');
      }

      await annonce.update({ isActive });
      return annonce;
    } catch (error) {
      throw new Error(`Erreur lors de la modification du statut de l'annonce: ${error.message}`);
    }
  }
}

module.exports = new AnnonceService();