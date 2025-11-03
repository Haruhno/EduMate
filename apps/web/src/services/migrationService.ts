import api from './api';

export interface MigrationData {
  specialties: string[];
  hourlyRate: number;
  experience: string;
  availability: {
    online: boolean;
    inPerson: boolean;
  };
}

class MigrationService {
  async migrateToTutor(migrationData: MigrationData) {
    try {
      const response = await api.post('/auth/migrate-to-tutor', migrationData);
      
      // Mettre à jour le localStorage
      if (response.data.data?.user) {
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
      }

      return response.data;
    } catch (error: any) {
      console.error('Erreur migration:', error);
      
      // Gestion spécifique des erreurs
      if (error.response?.status === 400) {
        const errorMessage = error.response?.data?.message || 'Erreur lors de la migration';
        if (errorMessage.includes('étudiants')) {
          throw new Error('Seuls les étudiants peuvent devenir tuteurs');
        } else if (errorMessage.includes('déjà tuteur')) {
          throw new Error('Vous êtes déjà tuteur');
        }
      }
      
      throw new Error(error.response?.data?.message || 'Erreur lors de la migration vers tuteur');
    }
  }
}

export default new MigrationService();