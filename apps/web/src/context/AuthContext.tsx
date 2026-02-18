import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../services/authService.types';
import authService from '../services/authService';

interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  logout: () => void;
  login: (user: User, token: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialiser l'utilisateur au démarrage
    const user = authService.getCurrentUser();
    setCurrentUser(user);
    setIsLoading(false);

    // Écouter l'événement de déconnexion automatique
    const handleAutoLogout = () => {
      console.warn('🔴 Session expirée - Déconnexion automatique');
      setCurrentUser(null);
      authService.logout();
    };

    // Écouter les changements de localStorage
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token' && !e.newValue) {
        setCurrentUser(null);
      } else if (e.key === 'user') {
        try {
          const user = e.newValue ? JSON.parse(e.newValue) : null;
          setCurrentUser(user);
        } catch (error) {
          console.error('Erreur parsing utilisateur:', error);
          setCurrentUser(null);
        }
      }
    };

    window.addEventListener('auth:logout', handleAutoLogout);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('auth:logout', handleAutoLogout);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const logout = () => {
    setCurrentUser(null);
    authService.logout();
  };

  const login = (user: User, token: string) => {
    setCurrentUser(user);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  };

  return (
    <AuthContext.Provider value={{ currentUser, isLoading, logout, login }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé dans AuthProvider');
  }
  return context;
};
