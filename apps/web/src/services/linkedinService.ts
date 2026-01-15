export interface LinkedInParseResponse {
  success: boolean;
  data?: LinkedInData;
  metadata?: LinkedInMetadata;
  message?: string;
}

export interface LinkedInData {
  personal: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    address?: string;
    linkedin?: string;
    github?: string;
  };
  education: Education[];
  experience: Experience[];
  skills: SkillCategory;
  summary?: string;
  certifications?: string[];
  projects?: string[];
  languages?: string[];
  validation?: {
    quality: string;
    confidence: number;
    extractionDate: string;
    source: string;
    processingMode: string;
    textLength: number;
  };
}

export interface Education {
  educationLevel: string;
  diplomaName?: string;
  field: string;
  school: string;
  country?: string;
  city?: string;
  startYear?: number;
  endYear?: number;
  isCurrent?: boolean;
  description?: string;
  gpa?: number;
}

export interface Experience {
  jobTitle: string;
  employmentType?: string;
  company: string;
  location?: string;
  startMonth?: string;
  startYear?: number;
  endMonth?: string;
  endYear?: number;
  isCurrent?: boolean;
  description?: string;
  achievements?: string[];
  technologies?: string[];
}

export interface SkillCategory {
  technical: string[];
  languages?: string[];
  soft?: string[];
  tools?: string[];
  frameworks?: string[];
}

export interface LinkedInMetadata {
  userId?: string;
  source: string;
  processingMode: string;
  textLength: number;
  extractionDate: string;
}

export interface LinkedInProfileData {
  success: boolean;
  linkedin: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    access_token: string;
  };
  message?: string;
}

export interface LinkedInMeResponse {
  success: boolean;
  linkedin: {
    firstName: string;
    lastName: string;
    email: string;
  };
  message?: string;
}

class LinkedInService {
  private baseURL = import.meta.env.VITE_CV_SERVICE_URL || 'http://localhost:5001';

  private getAuthHeader(): Record<string, string> {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Token manquant. Connectez-vous.');
    return { Authorization: `Bearer ${token}` };
  }

  /**
   * Redirige vers LinkedIn pour l'autorisation OAuth
   */
  loginWithLinkedIn(): void {
    console.log('🔗 Redirection vers LinkedIn pour authentification...');
    window.location.href = `${this.baseURL}/api/linkedin/login`;
  }

  /**
   * Analyse un profil LinkedIn à partir de texte brut
   */
  async parseLinkedInText(text: string, language = 'fr'): Promise<LinkedInParseResponse> {
    console.log('📤 Envoi du texte LinkedIn à l\'IA pour analyse...');
    console.log('📝 Contenu texte (500 premiers caractères):', text.slice(0, 500));

    try {
      const response = await fetch(`${this.baseURL}/api/linkedin/parse-text`, {
        method: 'POST',
        headers: { ...this.getAuthHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur serveur (${response.status}): ${errorText}`);
      }

      const data: LinkedInParseResponse = await response.json();

      if (data.data) console.log('📊 JSON extrait par l\'IA:', JSON.stringify(data.data, null, 2));
      return data;
    } catch (err: any) {
      console.error('❌ Erreur parseLinkedInText:', err);
      return { success: false, message: err.message };
    }
  }

  /**
   * Récupère les données LinkedIn stockées en session après OAuth
   */
  async getMe(token: string): Promise<LinkedInMeResponse> {
    console.log('🔄 Récupération des données LinkedIn depuis la session...');

    try {
      const response = await fetch(`${this.baseURL}/api/linkedin/me?token=${encodeURIComponent(token)}`, {
        method: 'GET',
        headers: this.getAuthHeader(),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur serveur (${response.status}): ${errorText}`);
      }

      const data: LinkedInMeResponse = await response.json();
      console.log('📊 Données LinkedIn récupérées:', data);
      return data;
    } catch (err: any) {
      console.error('❌ Erreur getMe:', err);
      return { success: false, linkedin: { firstName: '', lastName: '', email: '' }, message: err.message };
    }
  }
}

export default new LinkedInService();