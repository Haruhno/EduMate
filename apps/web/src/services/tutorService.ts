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

class TutorService {
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