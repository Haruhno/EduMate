
import React, { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'student' | 'tutor' | 'admin';
}

/**
 * Composant pour protéger une route
 * - Redirige vers /connexion si non authentifié
 * - Redirige vers /acces-refuse si le rôle ne correspond pas
 * - Gère la déconnexion automatique
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const navigate = useNavigate();
  const { currentUser, isLoading } = useAuth();

  useEffect(() => {
    // Écouter les déconnexions automatiques
    const handleAutoLogout = () => {
      navigate('/connexion', { replace: true });
    };

    window.addEventListener('auth:logout', handleAutoLogout);

    return () => {
      window.removeEventListener('auth:logout', handleAutoLogout);
    };
  }, [navigate]);

  if (isLoading) {
    return <div>Chargement...</div>;
  }

  if (!currentUser) {
    navigate('/connexion', { replace: true });
    return null;
  }

  if (requiredRole && currentUser.role !== requiredRole) {
    navigate('/acces-refuse', { replace: true });
    return null;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
