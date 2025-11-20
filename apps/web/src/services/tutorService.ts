import api from './api';

export interface TutorFromDB {
  id: string;
  userId: string;
  specialties: string[];
  hourlyRate: number;
  rating: number;
  reviewsCount: number;
  profilePicture?: string;
  bio?: string;
  experience?: string;
  educationLevel?: string;
  availability: any;
  location: any;
  isVerified: boolean;
  isCompleted: boolean;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface TutorsResponse {
  success: boolean;
  message: string;
  data: {
    tutors: TutorFromDB[];
    totalTutors: number;
    currentPage: number;
    totalPages: number;
  };
}

export interface TutorSettings {
  hourlyRate: number;
  specialties: string[];
  bio?: string;
  experience: string;
  availability: any;
}

class TutorService {
  async updateTutorSettings(settings: TutorSettings) {
    const response = await api.put('/tutor/settings', settings);
    return response.data;
  }

  async getTutorStats() {
    const response = await api.get('/tutor/stats');
    return response.data;
  }

  async requestVerification() {
    const response = await api.post('/tutor/request-verification');
    return response.data;
  }

  // Méthode principale pour récupérer un tuteur avec gestion des profils non vérifiés
  async getTutorById(tutorId: string): Promise<{
    success: boolean;
    data?: TutorFromDB;
    message?: string;
    existsButUnverified?: boolean;
  }> {
    try {
      console.log('🔍 Tentative de récupération du tuteur:', tutorId);
      
      // Essayer d'abord l'endpoint principal (tuteurs vérifiés)
      try {
        const response = await api.get(`/tutors/${tutorId}`);
        
        if (response?.data?.success && response?.data?.data) {
          console.log('✅ Tuteur vérifié trouvé');
          return { 
            success: true, 
            data: response.data.data 
          };
        }
      } catch (error: any) {
        // Si 404, le tuteur n'est pas dans la liste des vérifiés
        if (error?.response?.status === 404) {
          console.log('⚠️ Tuteur non trouvé dans les vérifiés, recherche dans tous les profils...');
        } else {
          console.error('❌ Erreur endpoint vérifiés:', error.message);
        }
      }

      // Essayer l'endpoint des profils (tous les tuteurs, vérifiés ou non)
      try {
        const response = await api.get(`/profile/tutors/${tutorId}`);
        
        if (response?.data?.success && response?.data?.data) {
          const tutorData = response.data.data;
          console.log('📋 Tuteur trouvé (tous profils):', {
            id: tutorData.id,
            vérifié: tutorData.isVerified,
            complété: tutorData.isCompleted,
            nom: `${tutorData.user?.firstName} ${tutorData.user?.lastName}`
          });

          // Vérifier si le profil n'est pas vérifié
          if (!tutorData.isVerified || !tutorData.isCompleted) {
            console.log('⏳ Tuteur non vérifié détecté');
            return { 
              success: false, 
              data: tutorData,
              existsButUnverified: true,
              message: 'Profil non vérifié ou incomplet' 
            };
          }

          // Le profil est vérifié mais n'était pas dans l'endpoint principal
          console.log('✅ Tuteur vérifié trouvé via profile endpoint');
          return { 
            success: true, 
            data: tutorData 
          };
        }
      } catch (error: any) {
        console.error('❌ Erreur endpoint profile:', error.message);
      }

      // Aucun tuteur trouvé
      console.log('❌ Tuteur non trouvé dans aucune source');
      return { 
        success: false, 
        message: 'Tuteur non trouvé' 
      };
      
    } catch (error: any) {
      console.error('💥 Erreur générale récupération tuteur:', error);
      return {
        success: false,
        message: 'Erreur lors de la récupération du tuteur'
      };
    }
  }

  // Méthode pour récupérer explicitement un tuteur non vérifié
  async getUnverifiedTutor(tutorId: string): Promise<{
    success: boolean;
    data?: TutorFromDB;
    message?: string;
  }> {
    try {
      const response = await api.get(`/profile/tutors/${tutorId}`);
      
      if (response?.data?.success && response?.data?.data) {
        const tutorData = response.data.data;
        
        // Retourner le tuteur même s'il n'est pas vérifié
        return { 
          success: true, 
          data: tutorData,
          message: !tutorData.isVerified ? 'Profil non vérifié' : 'Profil vérifié'
        };
      }
      
      return { 
        success: false, 
        message: response?.data?.message || 'Profil non trouvé' 
      };
    } catch (error: any) {
      console.error('Erreur récupération tuteur non vérifié:', error);
      return {
        success: false,
        message: error?.response?.data?.message || 'Erreur lors de la récupération du tuteur'
      };
    }
  }

  async getAnnoncesByTutor(tutorId: string) {
    try {
      const response = await api.get(`/annonces/tutor/${tutorId}`);
      return response.data;
    } catch (error: any) {
      console.error('Erreur récupération annonces tuteur:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Erreur lors de la récupération des annonces'
      };
    }
  }

  async searchTutors(filters: {
    page?: number;
    limit?: number;
    subject?: string;
    level?: string;
    minRating?: number;
    maxPrice?: number;
    teachingMode?: string;
    location?: string;
  }): Promise<TutorsResponse> {
    const params = new URLSearchParams();
    
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.subject) params.append('subject', filters.subject);
    if (filters.level) params.append('level', filters.level);
    if (filters.minRating) params.append('minRating', filters.minRating.toString());
    if (filters.maxPrice) params.append('maxPrice', filters.maxPrice.toString());
    if (filters.teachingMode) params.append('teachingMode', filters.teachingMode);
    if (filters.location) params.append('location', filters.location);

    const response = await api.get(`/tutors/search?${params.toString()}`);
    return response.data;
  }
}

export default new TutorService();