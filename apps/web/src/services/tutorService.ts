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
  availability: any; // JSON field
  location: any; // JSON field
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

  async getTutorById(tutorId: string): Promise<{
    success: boolean;
    data?: TutorFromDB;
    message?: string;
  }> {
    // Try several plausible endpoints / query param shapes until one returns data
    const attempts = [
      `/tutors/${encodeURIComponent(tutorId)}`,
      `/tutors/user/${encodeURIComponent(tutorId)}`,
      `/tutors/by-user/${encodeURIComponent(tutorId)}`,
      `/profile/tutors/${encodeURIComponent(tutorId)}`,
      `/profile/tutors/user/${encodeURIComponent(tutorId)}`,
      `/tutors?userId=${encodeURIComponent(tutorId)}`,
      `/tutors?user_id=${encodeURIComponent(tutorId)}`,
      `/profile/tutors?userId=${encodeURIComponent(tutorId)}`,
      `/profile/tutors?user_id=${encodeURIComponent(tutorId)}`
    ];

    for (const url of attempts) {
      try {
        const response = await api.get(url);

        // If API returns a single tutor object in data
        if (response?.data?.success && response?.data?.data && !Array.isArray(response.data.data)) {
          return { success: true, data: response.data.data as TutorFromDB };
        }

        // If API returns { success, data: { tutors: [...] } }
        if (response?.data?.success && response?.data?.data?.tutors && Array.isArray(response.data.data.tutors)) {
          const first = response.data.data.tutors[0];
          if (first) return { success: true, data: first as TutorFromDB };
        }

        // Some endpoints may return tutor directly on data.tutor
        if (response?.data && response.data.tutor) {
          return { success: true, data: response.data.tutor as TutorFromDB };
        }

        // If response returned an array directly (e.g. /tutors?...) take first
        if (response?.data && Array.isArray(response.data)) {
          const first = response.data[0];
          if (first) return { success: true, data: first as TutorFromDB };
        }

        // If 200 but no usable payload, continue to next attempt
      } catch (err: any) {
        const status = err?.response?.status;
        // For 404/410 try next fallback
        if (status === 404 || status === 410) continue;

        // For other errors return immediately with message
        console.error('Erreur lors de la récupération du tuteur (attempt):', url, err);
        return {
          success: false,
          message: err?.response?.data?.message || err?.message || 'Erreur lors de la récupération du tuteur'
        };
      }
    }

    return {
      success: false,
      message: 'Tuteur non trouvé'
    };
  }

  // AJOUTER cette méthode pour récupérer les annonces par tuteur
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
  // Rechercher des tuteurs avec filtres et pagination
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