const { ProfileTutor, ProfileStudent, User } = require('../models/associations');

class ProfileService {
  // Créer ou mettre à jour un profil
  async createOrUpdateProfile(userId, role, profileData) {
    try {
      let profile;
      
      if (role === 'tutor') {
        profile = await ProfileTutor.findOne({ where: { userId } });
        if (!profile) {
          profile = await ProfileTutor.create({ 
            userId, 
            ...profileData,
            currentStep: 0 // Ajouter l'étape actuelle
          });
        } else {
          await profile.update({
            ...profileData,
            currentStep: profileData.currentStep || profile.currentStep
          });
        }
      } else {
        profile = await ProfileStudent.findOne({ where: { userId } });
        if (!profile) {
          profile = await ProfileStudent.create({ 
            userId, 
            ...profileData,
            currentStep: 0
          });
        } else {
          await profile.update({
            ...profileData,
            currentStep: profileData.currentStep || profile.currentStep
          });
        }
      }
      
      // Recharger le profil pour avoir les données fraîches
      profile = await (role === 'tutor' ? ProfileTutor : ProfileStudent).findOne({ where: { userId } });
      
      // Calculer le pourcentage de complétion
      const completionPercentage = this.calculateCompletionPercentage(profile, role);
      await profile.update({ completionPercentage });
      
      return profile;
    } catch (error) {
      throw new Error(`Erreur lors de la sauvegarde du profil: ${error.message}`);
    }
  }

  // Récupérer un profil - CORRIGÉ
  async getProfile(userId, role) {
    try {
      let profile;
      
      if (role === 'tutor') {
        profile = await ProfileTutor.findOne({ where: { userId } });
      } else {
        profile = await ProfileStudent.findOne({ where: { userId } });
      }
      
      if (!profile) {
        throw new Error('Profil non trouvé');
      }
      
      return profile;
    } catch (error) {
      throw new Error(`Erreur lors de la récupération du profil: ${error.message}`);
    }
  }

  // Calculer le pourcentage de complétion
  calculateCompletionPercentage(profile, role) {
    if (!profile) return 0;
    
    const fields = this.getRequiredFields(role);
    let completedFields = 0;

    fields.forEach(field => {
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

    return Math.round((completedFields / fields.length) * 100);
  }

  // Champs requis par rôle - SEULEMENT informations générales
  getRequiredFields(role) {
    const generalFields = [
      'firstName', 'lastName', 'email', 'gender', 'birthDate'
    ];

    // Les autres champs sont optionnels
    const optionalFields = [
      'profilePicture', 'phone', 'address', 'educationLevel', 
      'school', 'field', 'year', 'location'
    ];

    if (role === 'tutor') {
      return [...generalFields]; // Seulement les infos générales pour les tuteurs
    } else {
      return [...generalFields]; // Seulement les infos générales pour les étudiants
    }
  }

  // Marquer le profil comme complété et vérifié - MODIFIÉ
  async completeProfile(userId, role) {
    try {
      let profile;
      
      if (role === 'tutor') {
        profile = await ProfileTutor.findOne({ where: { userId } });
      } else {
        profile = await ProfileStudent.findOne({ where: { userId } });
      }
      
      if (!profile) {
        throw new Error('Profil non trouvé');
      }
      
      await profile.update({ 
        isCompleted: true,
        isVerified: true,
        completionPercentage: 100
      });
      
      // MODIFIÉ: Marquer automatiquement l'utilisateur comme vérifié
      await User.update({ isVerified: true }, { where: { id: userId } });
      
      return profile;
    } catch (error) {
      throw new Error(`Erreur lors de la finalisation du profil: ${error.message}`);
    }
  }

  // SUPPRIMER: La méthode isEmailVerified n'est plus nécessaire
  // async isEmailVerified(userId) { ... }
}

module.exports = new ProfileService();