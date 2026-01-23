import api from './api';

export interface AnnonceFromDB {
  id: string;
  tutorId: string;
  title: string;
  description: string;
  subject: string;
  subjects: string[];
  level: string;
  hourlyRate: number;
  teachingMode: string;
  location: any;
  availability: any;
  isActive: boolean;
  isVerified: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  tutor: {
    id: string;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
    rating: number;
    reviewsCount: number;
    profilePicture?: string;
    bio?: string;
    experience?: string;
    specialties: string[];
  };
}

export interface CreateAnnonceData {
  title: string;
  description: string;
  subject: string;
  subjects: string[];
  level: string;
  hourlyRate: number;
  teachingMode: string;
  location: any;
  availability: any;
}

export interface CreateAnnonceFromTextData {
  rawText: string;
  hourlyRate: number;
  teachingMode: string;
  level?: string;
  title?: string;
  description?: string;
}

export interface AnnoncesResponse {
  success: boolean;
  message: string;
  data: {
    annonces: AnnonceFromDB[];
    totalAnnonces: number;
    currentPage: number;
    totalPages: number;
  };
}

class AnnonceService {
  async searchAnnonces(filters: {
    page?: number;
    limit?: number;
    subject?: string;
    level?: string;
    minRating?: number;
    maxPrice?: number;
    minPrice?: number;
    teachingMode?: string;
    location?: string;
  }): Promise<AnnoncesResponse> {
    const params = new URLSearchParams();
    
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.subject) params.append('subject', filters.subject);
    if (filters.level) params.append('level', filters.level);
    if (filters.minRating) params.append('minRating', filters.minRating.toString());
    if (filters.maxPrice) params.append('maxPrice', filters.maxPrice.toString());
    if (filters.minPrice) params.append('minPrice', filters.minPrice.toString());
    if (filters.teachingMode) params.append('teachingMode', filters.teachingMode);
    if (filters.location) params.append('location', filters.location);

    const response = await api.get(`/annonces/search?${params.toString()}`);
    return response.data;
  }

  async getAnnoncesByTutor(tutorId: string) {
    const response = await api.get(`/annonces/tutor/${tutorId}`);
    return response.data;
  }

  async createAnnonce(annonceData: CreateAnnonceData) {
    try {
      console.log('🔄 Données envoyées au backend:', JSON.stringify(annonceData, null, 2));
      
      // Validation avant envoi
      const requiredFields = ['title', 'subject', 'hourlyRate', 'teachingMode'];
      for (const field of requiredFields) {
        if (!annonceData[field as keyof CreateAnnonceData]) {
          throw new Error(`Le champ "${field}" est requis`);
        }
      }
      
      // ⭐ CORRECTION : Accepter les valeurs en français POUR LA BASE DE DONNÉES
      const validTeachingModes = ['En ligne', 'En présentiel', 'Les deux', 'online', 'in_person', 'both', 'hybrid'];
      if (!validTeachingModes.includes(annonceData.teachingMode)) {
        throw new Error(`teachingMode doit être l'une de ces valeurs: ${validTeachingModes.join(', ')}`);
      }
      
      // Vérifier hourlyRate
      if (annonceData.hourlyRate < 10 || annonceData.hourlyRate > 100) {
        throw new Error('hourlyRate doit être entre 10 et 100');
      }
      
      const response = await api.post('/annonces', annonceData);
      console.log('✅ Réponse création annonce:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Erreur détaillée création annonce:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
        config: {
          url: error.config?.url,
          data: error.config?.data ? JSON.parse(error.config.data) : null
        }
      });
      
      // Afficher l'erreur du backend si disponible
      if (error.response?.data) {
        console.error('📋 Erreur backend:', error.response.data);
      }
      
      throw error;
    }
  }

  async createAnnonceFromText(annonceData: CreateAnnonceFromTextData) {
    try {
      console.log('🔄 Création depuis texte:', annonceData);
      const response = await api.post('/annonces/from-text', annonceData);
      console.log('✅ Réponse création depuis texte:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Erreur création depuis texte:', error);
      throw error;
    }
  }

  async getMyAnnonces() {
    const response = await api.get('/annonces/my-annonces');
    return response.data;
  }

  async getAnnonce(annonceId: string) {
    const response = await api.get(`/annonces/${annonceId}`);
    return response.data;
  }

  async updateAnnonce(annonceId: string, updateData: Partial<CreateAnnonceData>) {
    const response = await api.put(`/annonces/${annonceId}`, updateData);
    return response.data;
  }

  async deleteAnnonce(annonceId: string) {
    const response = await api.delete(`/annonces/${annonceId}`);
    return response.data;
  }

  async toggleAnnonce(annonceId: string, isActive: boolean) {
    const response = await api.patch(`/annonces/${annonceId}/toggle`, { isActive });
    return response.data;
  }
}

export default new AnnonceService();