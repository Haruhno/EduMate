// services/profileService.ts
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

  [key: string]: any;
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

export interface ProfileStatusResponse {
  success: boolean;
  message: string;
  data: ProfileStatus;
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
  // Sauvegarder le profil avec currentStep optionnel
  async saveProfile(profileData: ProfileData, currentStep?: number): Promise<ProfileResponse> {
    // Nettoyer les dates passées du schedule
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const cleanedSchedule = (profileData.schedule || []).filter((day: any) => {
      if (!day.date) return false;
      const dayDate = new Date(day.date);
      dayDate.setHours(0, 0, 0, 0);
      return dayDate >= today;
    });

    const sanitizedProfileData = {
      ...profileData,
      specialties: profileData.specialties || [],
      schedule: cleanedSchedule,
      location: {
        address: profileData.location?.address || '',
        radius: profileData.location?.radius || 8,
        city: profileData.location?.city || '',
        coordinates: {
          lat: profileData.location?.coordinates?.lat || 0,
          lng: profileData.location?.coordinates?.lng || 0
        }
      },
      birthDate: profileData.birthDate || null,
      availability: {
        online: profileData.availability?.online || false,
        inPerson: profileData.availability?.inPerson || false
      }
    };

    const response = await api.post('/profile/save', {
      profileData: sanitizedProfileData,
      currentStep: currentStep || 0
    });

    return response.data;
  }

  // AJOUTER : Récupérer le profil complet
  async getProfile(): Promise<FullProfileResponse> {
    try {
      const response = await api.get('/profile');
      return response.data;
    } catch (error: any) {
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

  // AJOUTER : Finaliser le profil
  async completeProfile(): Promise<any> {
    const response = await api.post('/profile/complete');
    return response.data;
  }

  // AJOUTER : Récupérer le statut du profil 
  async getProfileStatus(): Promise<ProfileStatusResponse> {
    try {
      const response = await api.get('/profile/status');
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Erreur de récupération du statut',
        data: {
          hasProfile: false,
          isCompleted: false,
          isVerified: false,
          completionPercentage: 0,
          role: 'student'
        }
      };
    }
  }

  // AJOUTER : Uploader un fichier
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