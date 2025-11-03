const { ProfileTutor, ProfileStudent, User, Diploma } = require('../models/associations');

class ProfileService {
  // Créer ou mettre à jour un profil
  async createOrUpdateProfile(userId, role, profileData) {
    const ProfileModel = role === 'tutor' ? ProfileTutor : ProfileStudent;
    
    try {
      let profile = await ProfileModel.findOne({ where: { userId } });

      // Séparer les données du profil des diplômes
      const { diplomas, ...profileDataToSave } = profileData;

      if (profile) {
        await profile.update({
          ...profileDataToSave,
          currentStep: profileData.currentStep || profile.currentStep || 0
        });
      } else {
        profile = await ProfileModel.create({
          userId,
          ...profileDataToSave,
          currentStep: profileData.currentStep || 0
        });
      }

      // Sauvegarder les diplômes séparément
      if (diplomas && Array.isArray(diplomas)) {
        await this.saveDiplomas(userId, role, diplomas);
      }

      // Recalculer le pourcentage de complétion
      const completionPercentage = await this.calculateCompletionPercentage(profile, role, userId);
      await profile.update({ completionPercentage });

      return await this.getProfile(userId, role);
    } catch (error) {
      console.error('Erreur détaillée sauvegarde profil:', error);
      throw new Error(`Erreur lors de la sauvegarde du profil: ${error.message}`);
    }
  }

  // Sauvegarder les diplômes - CORRIGÉ
  async saveDiplomas(userId, profileType, diplomasData) {
    try {
      console.log('Sauvegarde des diplômes:', { userId, profileType, diplomasData });

      // Supprimer les anciens diplômes
      await Diploma.destroy({
        where: { userId, profileType }
      });

      // Créer les nouveaux diplômes
      const diplomas = [];
      for (const diplomaData of diplomasData) {
        // Vérifier que le diplôme a au moins un niveau d'éducation
        if (!diplomaData.educationLevel || diplomaData.educationLevel.trim() === '') {
          continue; // Ignorer les diplômes sans niveau d'éducation
        }

        const diploma = await Diploma.create({
          userId,
          profileType,
          educationLevel: diplomaData.educationLevel,
          field: diplomaData.field || '',
          school: diplomaData.school || '',
          country: diplomaData.country || '',
          startYear: diplomaData.startYear || null,
          endYear: diplomaData.isCurrent ? null : (diplomaData.endYear || null),
          isCurrent: diplomaData.isCurrent || false,
          fileName: diplomaData.diplomaFile?.name || null,
          filePath: diplomaData.diplomaFile?.path || null,
          fileSize: diplomaData.diplomaFile?.size || null
        });

        diplomas.push(diploma);
      }

      console.log(`✅ ${diplomas.length} diplôme(s) sauvegardé(s) pour l'utilisateur ${userId}`);
      return diplomas;
    } catch (error) {
      console.error('Erreur détaillée sauvegarde diplômes:', error);
      throw new Error(`Erreur lors de la sauvegarde des diplômes: ${error.message}`);
    }
  }

  // Récupérer les diplômes d'un utilisateur - CORRIGÉ
  async getDiplomasByUser(userId, profileType) {
    try {
      const diplomas = await Diploma.findAll({
        where: { userId, profileType },
        order: [
          ['isCurrent', 'DESC'],
          ['startYear', 'DESC']
        ]
      });

      return diplomas.map(diploma => ({
        id: diploma.id,
        educationLevel: diploma.educationLevel,
        field: diploma.field,
        school: diploma.school,
        country: diploma.country,
        startYear: diploma.startYear,
        endYear: diploma.endYear,
        isCurrent: diploma.isCurrent,
        diplomaFile: diploma.fileName ? {
          name: diploma.fileName,
          path: diploma.filePath,
          size: diploma.fileSize
        } : null
      }));
    } catch (error) {
      console.error('Erreur récupération diplômes:', error);
      throw new Error(`Erreur lors de la récupération des diplômes: ${error.message}`);
    }
  }

  // Récupérer un profil avec les diplômes - CORRIGÉ
  async getProfile(userId, role) {
    try {
      const ProfileModel = role === 'tutor' ? ProfileTutor : ProfileStudent;
      let profile = await ProfileModel.findOne({ where: { userId } });
      
      if (!profile) {
        throw new Error('Profil non trouvé');
      }

      // Bien récupérer les diplômes
      const diplomas = await this.getDiplomasByUser(userId, role);

      const profileData = profile.toJSON();
      
      return {
        ...profileData,
        diplomas: diplomas 
      };
    } catch (error) {
      console.error('Erreur détaillée récupération profil:', error);
      throw error;
    }
  }

  // Calculer le pourcentage de complétion avec les diplômes
  async calculateCompletionPercentage(profile, role, userId) {
    let completedFields = 0;
    let totalFields = 8; // Champs de base

    // Champs de base obligatoires
    const basicFields = [
      'firstName', 'lastName', 'email', 'phone', 
      'birthDate', 'gender', 'address', 'educationLevel'
    ];

    basicFields.forEach(field => {
      const value = profile[field];
      if (value !== null && value !== undefined && value !== '') {
        if (Array.isArray(value) && value.length > 0) {
          completedFields++;
        } else if (typeof value === 'object') {
          const hasData = Object.values(value).some(val => 
            val !== null && val !== undefined && val !== '' && val !== 0
          );
          if (hasData) completedFields++;
        } else {
          completedFields++;
        }
      }
    });

    // Vérifier les diplômes
    const diplomas = await this.getDiplomasByUser(userId, role);
    if (diplomas.length > 0) {
      completedFields += 2; // Bonus pour avoir au moins un diplôme
      totalFields += 2;
    }

    return Math.round((completedFields / totalFields) * 100);
  }

  // Marquer le profil comme complété
  async completeProfile(userId, role) {
    const ProfileModel = role === 'tutor' ? ProfileTutor : ProfileStudent;
    
    try {
      let profile = await ProfileModel.findOne({ where: { userId } });
      
      if (!profile) {
        throw new Error('Profil non trouvé');
      }
      
      await profile.update({ 
        isCompleted: true,
        isVerified: true,
        completionPercentage: 100
      });
      
      // Marquer automatiquement l'utilisateur comme vérifié
      await User.update({ isVerified: true }, { where: { id: userId } });
      
      return profile;
    } catch (error) {
      throw new Error(`Erreur lors de la finalisation du profil: ${error.message}`);
    }
  }

  // Vérifier si un profil existe
  async profileExists(userId, role) {
    const ProfileModel = role === 'tutor' ? ProfileTutor : ProfileStudent;
    
    try {
      const profile = await ProfileModel.findOne({ where: { userId } });
      return !!profile;
    } catch (error) {
      throw new Error(`Erreur lors de la vérification du profil: ${error.message}`);
    }
  }
}

module.exports = new ProfileService();