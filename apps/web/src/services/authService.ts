import api from './api';
import type { User } from './authService.types';

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    token: string;
  };
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: 'student' | 'tutor';
}

class AuthService {
  private tokenKey = 'token';
  private userKey = 'user';

  // Inscription
  async register(userData: RegisterData): Promise<LoginResponse> {
    const response = await api.post('/auth/register', userData);
    
    if (response.data.success) {
      this.setToken(response.data.data.token);
      this.setUser(response.data.data.user);
    }
    
    return response.data;
  }

  // Connexion
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await api.post('/auth/login', { email, password });
    
    if (response.data.success) {
      this.setToken(response.data.data.token);
      this.setUser(response.data.data.user);
    }
    
    return response.data;
  }

  // Déconnexion
  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
  }

  // Vérifier si l'utilisateur est connecté
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  // Récupérer l'utilisateur courant 
  getCurrentUser(): User | null {
    try {
      const user = localStorage.getItem(this.userKey);
      if (!user || user === 'undefined' || user === 'null') {
        return null;
      }
      return JSON.parse(user) as User;
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'utilisateur:', error);
      // Nettoyer les données corrompues
      localStorage.removeItem(this.userKey);
      return null;
    }
  }

  // Récupérer le token
  getToken(): string | null {
    const token = localStorage.getItem(this.tokenKey);
    return token && token !== 'undefined' ? token : null;
  }

  // Définir le token
  private setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  // Définir l'utilisateur
  private setUser(user: User): void {
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }

  // Vérifier le token pour valider côté serveur)
  async validateToken(): Promise<User | null> {
    try {
      const token = this.getToken();
      if (!token) return null;

      const response = await api.get('/auth/profile');
      if (response.data.success) {
        this.setUser(response.data.data);
        return response.data.data;
      }
      return null;
    } catch (error) {
      this.logout();
      return null;
    }
  }

  // Vérifier l'email
  async verifyEmail(userId: string): Promise<boolean> {
    try {
      const response = await api.post('/auth/verify-email', { userId });
      return response.data.success;
    } catch (error) {
      console.error('Erreur vérification email:', error);
      return false;
    }
  }
}

export default new AuthService();