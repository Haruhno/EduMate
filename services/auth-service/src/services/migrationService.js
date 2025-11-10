const { User, ProfileTutor, Annonce } = require('../models/associations');

class MigrationService {
  async migrateToTutor(userId, tutorData) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }

      if (user.role !== 'student') {
        throw new Error('Seuls les étudiants peuvent devenir tuteurs');
      }

      // Mettre à jour le rôle
      await user.update({ role: 'tutor' });

      // Créer ou mettre à jour le profil tuteur
      let tutorProfile = await ProfileTutor.findOne({ where: { userId } });
      
      if (tutorProfile) {
        await tutorProfile.update({
          specialties: tutorData.specialties,
          availability: tutorData.availability,
          isCompleted: true,
          completionPercentage: 100
        });
      } else {
        tutorProfile = await ProfileTutor.create({
          userId,
          specialties: tutorData.specialties,
          availability: tutorData.availability,
          isCompleted: true,
          completionPercentage: 100
        });
      }

      // CRÉER LA PREMIÈRE ANNONCE AUTOMATIQUEMENT
      const firstAnnonce = await Annonce.create({
        tutorId: tutorProfile.id,
        title: `Cours de ${tutorData.specialties[0] || 'tutorat'}`,
        description: tutorData.bio || `Cours proposé par ${user.firstName} ${user.lastName}`,
        subject: tutorData.specialties[0] || 'Tutorat général',
        level: 'Tous niveaux',
        hourlyRate: tutorData.hourlyRate || 30,
        teachingMode: this.getTeachingMode(tutorData.availability),
        location: tutorProfile.location || {
          address: '',
          city: '',
          coordinates: { lat: 0, lng: 0 }
        },
        availability: {
          days: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'],
          timeSlots: ['09:00-12:00', '14:00-18:00']
        },
        isActive: true,
        isVerified: false
      });

      const updatedUser = await User.findByPk(userId);

      return {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          role: updatedUser.role,
          isVerified: updatedUser.isVerified
        },
        tutorProfile,
        firstAnnonce
      };
    } catch (error) {
      console.error('Erreur migration tuteur:', error);
      throw new Error(`Erreur lors de la migration vers tuteur: ${error.message}`);
    }
  }

  getTeachingMode(availability) {
    if (availability.online && availability.inPerson) return 'Les deux';
    if (availability.online) return 'En ligne';
    if (availability.inPerson) return 'En présentiel';
    return 'Les deux';
  }
}

module.exports = new MigrationService();