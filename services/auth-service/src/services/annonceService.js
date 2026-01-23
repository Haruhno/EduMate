const { Annonce, ProfileTutor, User } = require('../models/associations');
const { Op } = require('sequelize');

class AnnonceService {
  async createAnnonce(tutorId, annonceData) {
    try {
      const tutor = await ProfileTutor.findByPk(tutorId);
      if (!tutor) {
        throw new Error('Tuteur non trouvé');
      }

      const annoncePayload = {
        tutorId,
        title: annonceData.title,
        description: annonceData.description,
        subject: annonceData.subject,
        subjects: Array.isArray(annonceData.subjects) ? annonceData.subjects : [annonceData.subject],
        level: annonceData.level,
        hourlyRate: annonceData.hourlyRate,
        teachingMode: annonceData.teachingMode,
        location: annonceData.location,
        availability: annonceData.availability
      };

      console.log('📥 Données reçues pour création annonce:', annoncePayload);

      const annonce = await Annonce.create(annoncePayload);
      
      return await this.getAnnonceById(annonce.id);
    } catch (error) {
      console.error('Erreur détaillée création annonce:', error);
      throw new Error(`Erreur lors de la création de l'annonce: ${error.message}`);
    }
  }

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

      const whereClause = {
        isActive: true
      };

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

  async createAnnonceFromText(tutorId, rawText, additionalData = {}) {
    try {
      console.log('📝 Création annonce depuis texte pour tuteur:', tutorId);
      
      const AITextProcessor = require('./aiTextProcessor');
      const analysis = await AITextProcessor.analyzeTextWithAI(rawText);
      
      const validTeachingModes = ['En ligne', 'En présentiel', 'Les deux'];
      let teachingMode = analysis.teachingMode || additionalData.teachingMode || 'Les deux';
      
      if (!validTeachingModes.includes(teachingMode)) {
        if (teachingMode.toLowerCase().includes('ligne')) {
          teachingMode = 'En ligne';
        } else if (teachingMode.toLowerCase().includes('présentiel')) {
          teachingMode = 'En présentiel';
        } else {
          teachingMode = 'Les deux';
        }
      }
      
      const annonceData = {
        tutorId,
        title: analysis.title,
        description: rawText,
        subject: analysis.skills.length > 0 ? analysis.skills[0] : 'Compétences diverses',
        subjects: analysis.skills,
        detectedSkills: analysis.skills,
        level: analysis.levels.join(', '),
        hourlyRate: additionalData.hourlyRate || 20,
        teachingMode: teachingMode,
        location: additionalData.location,
        availability: additionalData.availability,
        rawText: rawText,
        metadata: {
          aiGenerated: true,
          extractionConfidence: analysis.extractionMetadata.confidence,
          originalTextLength: rawText.length
        }
      };
      
      console.log('📦 Données annonce préparées:', annonceData);
      
      const annonce = await Annonce.create(annonceData);
      return await this.getAnnonceById(annonce.id);
    } catch (error) {
      console.error('❌ Erreur création annonce depuis texte:', error);
      throw new Error(`Erreur lors de la création de l'annonce depuis texte: ${error.message}`);
    }
  }
}

module.exports = new AnnonceService();