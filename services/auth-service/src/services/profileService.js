const { ProfileTutor, ProfileStudent, User, Diploma, Experience } = require('../models/associations');

class ProfileService {
  // Créer ou mettre à jour un profil
  async createOrUpdateProfile(userId, role, profileData) {
    const ProfileModel = role === 'tutor' ? ProfileTutor : ProfileStudent;
    
    try {
      // Mettre à jour les compétences dans la table User
      if (profileData.skills) {
        await User.update(
          { skills: profileData.skills },
          { where: { id: userId } }
        );
      }

    let profile = await ProfileModel.findOne({ where: { userId } });

      // Séparer les données du profil des diplômes et expériences
      const { diplomas, experiences, ...profileDataToSave } = profileData;

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

      // Sauvegarder les expériences séparément
      if (experiences && Array.isArray(experiences)) {
        await this.saveExperiences(userId, role, experiences);
      }

      // Calculer le pourcentage de complétion
      const completionPercentage = await this.calculateCompletionPercentage(profile, role, userId);
      await profile.update({ completionPercentage });

      return await this.getProfile(userId, role);
    } catch (error) {
      console.error('Erreur détaillée sauvegarde profil:', error);
      throw new Error(`Erreur lors de la sauvegarde du profil: ${error.message}`);
    }
  }

  // Sauvegarder les diplômes
  async saveDiplomas(userId, profileType, diplomasData) {
    try {
      // Supprimer les anciens diplômes
      await Diploma.destroy({
        where: { userId, profileType }
      });

      // Créer les nouveaux diplômes
      const diplomas = [];
      for (const diplomaData of diplomasData) {
        // Vérifier que le diplôme a au moins un niveau d'éducation
        if (!diplomaData.educationLevel || diplomaData.educationLevel.trim() === '') {
          continue; 
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

      return diplomas;
    } catch (error) {
      console.error('Erreur détaillée sauvegarde diplômes:', error);
      throw new Error(`Erreur lors de la sauvegarde des diplômes: ${error.message}`);
    }
  }

  // Récupérer les diplômes d'un utilisateur
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

  // Sauvegarder les expériences
  async saveExperiences(userId, profileType, experiencesData) {
    try {

      // Supprimer les anciennes expériences
      await Experience.destroy({
        where: { userId, profileType }
      });

      // Créer les nouvelles expériences
      const experiences = [];
      for (const experienceData of experiencesData) {
        // Vérifier que l'expérience a au moins un champ rempli
        const hasData = Object.values(experienceData).some(value => 
          value !== '' && value !== null && value !== undefined && 
          (typeof value !== 'string' || value.trim() !== '')
        );

        if (hasData) {
          const experience = await Experience.create({
            userId,
            profileType,
            jobTitle: experienceData.jobTitle || '',
            employmentType: experienceData.employmentType || '',
            company: experienceData.company || '',
            location: experienceData.location || '',
            startMonth: experienceData.startMonth || '',
            startYear: experienceData.startYear || null,
            endMonth: experienceData.isCurrent ? null : (experienceData.endMonth || ''),
            endYear: experienceData.isCurrent ? null : (experienceData.endYear || null),
            isCurrent: experienceData.isCurrent || false,
            description: experienceData.description || ''
          });

          experiences.push(experience);
        }
      }

      return experiences;
    } catch (error) {
      console.error('Erreur détaillée sauvegarde expériences:', error);
      throw new Error(`Erreur lors de la sauvegarde des expériences: ${error.message}`);
    }
  }

  // Récupérer les expériences d'un utilisateur
  async getExperiencesByUser(userId, profileType) {
    try {
      const experiences = await Experience.findAll({
        where: { userId, profileType },
        order: [
          ['isCurrent', 'DESC'],
          ['startYear', 'DESC'],
          ['startMonth', 'DESC']
        ]
      });

      return experiences.map(experience => ({
        id: experience.id,
        jobTitle: experience.jobTitle,
        employmentType: experience.employmentType,
        company: experience.company,
        location: experience.location,
        startMonth: experience.startMonth,
        startYear: experience.startYear,
        endMonth: experience.endMonth,
        endYear: experience.endYear,
        isCurrent: experience.isCurrent,
        description: experience.description
      }));
    } catch (error) {
      console.error('Erreur récupération expériences:', error);
      throw new Error(`Erreur lors de la récupération des expériences: ${error.message}`);
    }
  }

  // Récupérer un profil avec les diplômes et expériences
  async getProfile(userId, role) {
    try {
      const ProfileModel = role === 'tutor' ? ProfileTutor : ProfileStudent;
      const profile = await ProfileModel.findOne({ where: { userId } });

      // Si pas de profil, retourner null (ne pas lancer d'exception)
      if (!profile) {
        return null;
      }

      // Récupérer l'utilisateur pour avoir les compétences
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }

      // Récupérer les diplômes et expériences
      const diplomas = await this.getDiplomasByUser(userId, role);
      const experiences = await this.getExperiencesByUser(userId, role);

      const profileData = profile.toJSON();

      return {
        ...profileData,
        skills: user.skills || [],
        diplomas,
        experiences
      };
    } catch (error) {
      console.error('Erreur détaillée récupération profil:', error);
      throw error;
    }
  }
  
  // Calculer le pourcentage de complétion avec les diplômes et expériences
  async calculateCompletionPercentage(profile, role, userId) {
    // Récupérer les données de l'utilisateur
    const user = await User.findByPk(userId);

    // Fusionner user + profile pour vérifier tous les champs
    const profileData = { ...user.toJSON(), ...profile.toJSON() };

    let completedFields = 0;
    let totalFields = 8; // Champs de base

    // Champs de base obligatoires
    const basicFields = [
      'firstName', 'lastName', 'email', 'phone', 
      'birthDate', 'gender', 'address', 'educationLevel'
    ];

    basicFields.forEach(field => {
      const value = profileData[field];
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

    // Vérifier les expériences (pour les tuteurs seulement)
    if (role === 'tutor') {
      const experiences = await this.getExperiencesByUser(userId, role);
      if (experiences.length > 0) {
        completedFields += 2; // Bonus pour avoir au moins une expérience
        totalFields += 2;
      }
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