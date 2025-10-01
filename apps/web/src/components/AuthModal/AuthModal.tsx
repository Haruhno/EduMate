import React, { useState } from 'react';
import styles from './AuthModal.module.css';
import authService from '../../services/authService';
import type { AuthModalProps, AuthFormData } from './AuthModal.types';

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [formData, setFormData] = useState<AuthFormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

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
      if (isLogin) {
        // Connexion
        await authService.login(formData.email, formData.password);
      } else {
        // Inscription
        if (formData.password !== formData.confirmPassword) {
          throw new Error('Les mots de passe ne correspondent pas');
        }
        
        await authService.register({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password
        });
      }

      onAuthSuccess();
      onClose();
      resetForm();
    } catch (error: any) {
      setError(error.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: ''
    });
    setError('');
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setError('');
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>×</button>
        
        <h2>{isLogin ? 'Connexion' : 'Inscription'}</h2>
        
        {error && <div className={styles.error}>{error}</div>}
        
        <form onSubmit={handleSubmit} className={styles.authForm}>
          {!isLogin && (
            <div className={styles.nameFields}>
              <input
                type="text"
                name="firstName"
                placeholder="Prénom"
                value={formData.firstName}
                onChange={handleInputChange}
                required={!isLogin}
              />
              <input
                type="text"
                name="lastName"
                placeholder="Nom"
                value={formData.lastName}
                onChange={handleInputChange}
                required={!isLogin}
              />
            </div>
          )}
          
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
          
          {!isLogin && (
            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirmer le mot de passe"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              required
            />
          )}
          
          <button 
            type="submit" 
            disabled={loading} 
            className={styles.submitButton}
          >
            {loading ? 'Chargement...' : (isLogin ? 'Se connecter' : 'Créer un compte')}
          </button>
        </form>
        
        <div className={styles.switchMode}>
          <span>
            {isLogin ? "Vous n'avez pas de compte ? " : "Vous avez déjà un compte ? "}
            <button 
              type="button" 
              onClick={switchMode} 
              className={styles.switchButton}
            >
              {isLogin ? 'Inscrivez-vous' : 'Connectez-vous'}
            </button>
          </span>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;