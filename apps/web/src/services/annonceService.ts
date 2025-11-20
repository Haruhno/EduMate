import api from './api';

export interface AnnonceFromDB {
  id: string;
  tutorId: string;
  title: string;
  description: string;
  subject: string;
  level: string;
  hourlyRate: number;
  teachingMode: string;
  location: any;
  availability: any;
  isActive: boolean;
  isVerified: boolean;
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
  level: string;
  hourlyRate: number;
  teachingMode: string;
  location: any;
  availability: any;
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
  // Rechercher des annonces
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

  // Récupérer les annonces d'un tuteur
  async getAnnoncesByTutor(tutorId: string) {
    const response = await api.get(`/annonces/tutor/${tutorId}`);
    return response.data;
  }

  // Créer une annonce
  async createAnnonce(annonceData: CreateAnnonceData) {
    const response = await api.post('/annonces', annonceData);
    return response.data;
  }

  // Récupérer mes annonces
  async getMyAnnonces() {
    const response = await api.get('/annonces/my-annonces');
    return response.data;
  }

  // Récupérer une annonce spécifique
  async getAnnonce(annonceId: string) {
    const response = await api.get(`/annonces/${annonceId}`);
    return response.data;
  }

  // Mettre à jour une annonce
  async updateAnnonce(annonceId: string, updateData: Partial<CreateAnnonceData>) {
    const response = await api.put(`/annonces/${annonceId}`, updateData);
    return response.data;
  }

  // Supprimer une annonce
  async deleteAnnonce(annonceId: string) {
    const response = await api.delete(`/annonces/${annonceId}`);
    return response.data;
  }

  // Désactiver/activer une annonce
  async toggleAnnonce(annonceId: string, isActive: boolean) {
    const response = await api.patch(`/annonces/${annonceId}/toggle`, { isActive });
    return response.data;
  }
}

export default new AnnonceService();