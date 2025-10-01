import type { User, LoginResponse, RegisterData } from './authService.types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class AuthService {
  async register(userData: RegisterData): Promise<User> {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    const data: { success: boolean; message: string; data: User } = await response.json();

    if (!data.success) {
      throw new Error(data.message);
    }

    return data.data;
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data: { success: boolean; message: string; data: LoginResponse } = await response.json();

    if (!data.success) {
      throw new Error(data.message);
    }

    // Stocker le token et l'utilisateur dans le localStorage
    localStorage.setItem('token', data.data.token);
    localStorage.setItem('user', JSON.stringify(data.data.user));

    return data.data;
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  async getProfile(): Promise<User> {
    const token = this.getToken();
    if (!token) {
      throw new Error('Utilisateur non connecté');
    }

    const response = await fetch(`${API_URL}/auth/profile`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data: { success: boolean; message: string; data: User } = await response.json();

    if (!data.success) {
      this.logout();
      throw new Error(data.message);
    }

    return data.data;
  }
}

export default new AuthService();
