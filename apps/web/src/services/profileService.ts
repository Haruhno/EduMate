import api from './api';

export interface ProfileData {
  // Informations générales
  profilePicture: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  countryCode: string;
  gender: string;
  birthDate: string;
  address: string;

  // Éducation
  educationLevel: string;
  school: string;
  field: string;
  year: string;
  diplomaFile?: File;

  // Expérience (tuteur)
  experience: string;
  bio: string;
  specialties: string[];

  // Disponibilité
  availability: {
    online: boolean;
    inPerson: boolean;
  };
  schedule: any[];

  // Localisation
  location: {
    address: string;
    radius: number;
    city: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };

  [key: string]: any; // Add this index signature to allow dynamic property access
}

export interface ProfileResponse {
  success: boolean;
  message: string;
  data: {
    profile: any;
    currentStep: number;
    completionPercentage: number;
  };
}

export interface ProfileStatus {
  hasProfile: boolean;
  isCompleted: boolean;
  isVerified: boolean;
  completionPercentage: number;
  role: string;
}

export interface FullProfileResponse {
  success: boolean;
  message: string;
  data: {
    profile: any;
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
      isVerified: boolean;
    };
  };
}

class ProfileService {
  // Sauvegarder le profil
  async saveProfile(profileData: ProfileData, currentStep: number): Promise<ProfileResponse> {
    const response = await api.post('/profile/save', {
      profileData,
      currentStep
    });
    return response.data;
  }

  // Récupérer le profil complet - CORRIGÉ
  async getProfile(): Promise<FullProfileResponse> {
    try {
      const response = await api.get('/profile');
      return response.data;
    } catch (error: any) {
      // Si c'est une erreur 400 due à un profil manquant, retourner une réponse vide
      if (error.response?.status === 400) {
        return {
          success: true,
          message: 'Profil non trouvé',
          data: {
            profile: null,
            user: {
              id: '',
              email: '',
              firstName: '',
              lastName: '',
              role: '',
              isVerified: false,
            },
          },
        };
      }
      throw error;
    }
  }

  // Finaliser le profil
  async completeProfile(): Promise<any> {
    const response = await api.post('/profile/complete');
    return response.data;
  }

  // Récupérer le statut du profil 
  async getProfileStatus(): Promise<ProfileStatus> {
    try {
      const response = await api.get('/profile/status');
      return response.data.data;
    } catch (error: any) {
      // Si erreur, retourner un statut par défaut
      if (error.response?.status === 400 || error.response?.status === 401) {
        return {
          hasProfile: false,
          isCompleted: false,
          isVerified: false,
          completionPercentage: 0,
          role: 'student'
        };
      }
      throw error;
    }
  }


  // Uploader un fichier (diplôme, etc.)
  async uploadFile(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/profile/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  }
}

export default new ProfileService();