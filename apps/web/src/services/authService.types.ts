export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string; 
  isVerified: boolean;
  createdAt?: string; 
  updatedAt?: string;
  skillsToTeach?: string[] | Array<{name: string; level?: string}>;
  skillsToLearn?: string[] | Array<{name: string; level?: string}>;
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