export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string; // Changed to string to match the authService implementation
  isVerified: boolean;
  createdAt?: string; // Made optional to match the authService implementation
  updatedAt?: string; // Made optional to match the authService implementation
}

export interface LoginResponse {
  user: User;
  token: string;
}

export interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role?: 'student' | 'tutor' | 'admin';
}