import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import styles from './LoginPage.module.css';
import authService from '../../services/authService';

const LoginPage: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const navigate = useNavigate();

  // Rediriger vers l'accueil si déjà connecté
  useEffect(() => {
    if (authService.isAuthenticated()) {
      navigate('/');
    }
  }, [navigate]);

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
      await authService.login(formData.email, formData.password);
      // Recharger la page pour mettre à jour la navbar et l'état d'authentification
      window.location.href = '/';
    } catch (error: any) {
      // Afficher un message d'erreur lisible selon le code d'erreur
      let errorMessage = 'Une erreur est survenue lors de la connexion';
      
      if (error.response?.status === 401 || error.message?.includes('401')) {
        errorMessage = 'Email ou mot de passe incorrect';
      } else if (error.response?.status === 400) {
        errorMessage = error.response.data?.message || 'Email ou mot de passe invalid';
      } else if (error.message?.includes('Network')) {
        errorMessage = 'Erreur réseau. Vérifiez votre connexion Internet';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.authContainer}>
        <h2>Connexion</h2>
        
        {error && <div className={styles.error}>{error}</div>}
        
        <form onSubmit={handleSubmit} className={styles.authForm}>
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
          
          <button 
            type="submit" 
            disabled={loading} 
            className={styles.submitButton}
          >
            {loading ? 'Chargement...' : 'Se connecter'}
          </button>
        </form>
        
        <div className={styles.switchMode}>
          <span>
            Vous n'avez pas de compte ?{' '}
            <Link to="/inscription" className={styles.switchLink}>
              Inscrivez-vous
            </Link>
          </span>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;