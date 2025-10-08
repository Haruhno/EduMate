import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import styles from './SignupPage.module.css';
import authService from '../../services/authService';

const SignupPage: React.FC = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student' // Valeur par défaut
  });
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Récupérer le rôle depuis la navigation
  useEffect(() => {
    if (location.state?.role) {
      setFormData(prev => ({ ...prev, role: location.state.role }));
    }
  }, [location.state]);

  // Rediriger vers la sélection du rôle si aucun rôle n'est défini
  useEffect(() => {
    if (authService.isAuthenticated()) {
      navigate('/');
    } else if (!location.state?.role) {
      navigate('/choix-role');
    }
  }, [navigate, location.state]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (formData.password !== formData.confirmPassword) {
        throw new Error('Les mots de passe ne correspondent pas');
      }
      
      await authService.register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        role: formData.role as 'student' | 'tutor'
      });

      window.location.href = '/';
    } catch (error: any) {
      setError(error.message || 'Une erreur est survenue lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToRoleSelection = () => {
    navigate('/choix-role');
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.authContainer}>
        <button 
          onClick={handleBackToRoleSelection}
          className={styles.backButton}
        >
          ← Retour au choix du profil
        </button>

        <h2>Inscription</h2>
        
        {error && <div className={styles.error}>{error}</div>}
        
        <form onSubmit={handleSubmit} className={styles.authForm}>
          <div className={styles.nameFields}>
            <input
              type="text"
              name="firstName"
              placeholder="Prénom"
              value={formData.firstName}
              onChange={handleInputChange}
              required
            />
            <input
              type="text"
              name="lastName"
              placeholder="Nom"
              value={formData.lastName}
              onChange={handleInputChange}
              required
            />
          </div>
          
          <input
            type="email"
            name="email"
            placeholder="Adresse email"
            value={formData.email}
            onChange={handleInputChange}
            required
          />
          
          <input
            type="password"
            name="password"
            placeholder="Mot de passe"
            value={formData.password}
            onChange={handleInputChange}
            required
          />
          
          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirmer le mot de passe"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            required
          />
          
          <button 
            type="submit" 
            disabled={loading} 
            className={styles.submitButton}
          >
            {loading ? 'Chargement...' : `Créer mon compte ${formData.role === 'student' ? 'étudiant' : 'tuteur'}`}
          </button>
        </form>
        
        <div className={styles.switchMode}>
          <span>
            Vous avez déjà un compte ?{' '}
            <Link to="/connexion" className={styles.switchLink}>
              Connectez-vous
            </Link>
          </span>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;