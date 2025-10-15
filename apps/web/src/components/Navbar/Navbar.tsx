import React, { useState, useEffect } from "react";
import { Link} from "react-router-dom";
import logo from "../../assets/images/logo.png";
import userIcon from "../../assets/images/utilisateur.png";
import styles from "./Navbar.module.css";
import authService from "../../services/authService";
import type { User } from "../../services/authService.types";

const Navbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Vérifie si l'utilisateur est connecté et écoute les changements
  useEffect(() => {
    const checkAuth = () => {
      try {
        const user = authService.getCurrentUser();
        setCurrentUser(user);
      } catch (error) {
        console.error("Erreur récupération utilisateur:", error);
        setCurrentUser(null);
      }
    };

    // Vérifier au chargement
    checkAuth();

    // Écouter les événements de stockage pour les changements d'authentification
    const handleStorageChange = () => {
      checkAuth();
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Vérifier périodiquement (au cas où)
    const interval = setInterval(checkAuth, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const handleLogout = () => {
    try {
      authService.logout();
      setCurrentUser(null);
      setIsMenuOpen(false);
      // Recharger la page pour mettre à jour l'état global
      window.location.href = '/';
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
    }
  };

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <nav className={styles.navbar}>
      {/* Logo */}
      <div className={styles.navbarBrand}>
        <Link to="/" onClick={closeMenu}>
          <img src={logo} alt="EduMate Logo" className={styles.logo} />
          <span className={styles.brandName}>EduMate</span>
        </Link>
      </div>

      {/* Liens de navigation */}
      <ul className={`${styles.navLinks} ${isMenuOpen ? styles.active : ""}`}>
        <li><a href="#about" onClick={closeMenu}>Qui sommes-nous</a></li>
        <li><a href="#services" onClick={closeMenu}>Nos services</a></li>
        <li><a href="#news" onClick={closeMenu}>Actualités</a></li>
        <li><a href="#contact" onClick={closeMenu}>Nous contacter</a></li>

        {/* Boutons auth pour mobile */}
        {!currentUser ? (
          <>
            <li className={styles.mobileAuth}>
              <Link 
                to="/connexion" 
                onClick={closeMenu}
                className={styles.mobileConnexionLink}
              >
                Votre compte <img src={userIcon} alt="Utilisateur" className={styles.mobileUserIcon} />
              </Link>
            </li>
            <li className={styles.mobileAuth}>
              <Link to="/choix-role" className={styles.signupButton}>
                S'inscrire
              </Link>
            </li>
          </>
        ) : (
          <li className={styles.mobileAuth}>
            <span className={styles.welcomeText}>Bonjour, {currentUser.firstName}</span>
            <button 
              onClick={handleLogout}
              className={styles.logoutButton}
            >
              Déconnexion
            </button>
          </li>
        )}
      </ul>

      {/* Actions desktop */}
      <div className={styles.navActions}>
        {currentUser ? (
          <div className={styles.userMenu}>
            <span className={styles.welcomeText}>Bonjour, {currentUser.firstName}</span>
            <button 
              onClick={handleLogout}
              className={styles.logoutButton}
            >
              Déconnexion
            </button>
          </div>
        ) : (
          <>
            <Link to="/connexion" className={styles.connexionBtn}>
              <img src={userIcon} alt="Compte utilisateur" />
            </Link>
            <Link to="/inscription" className={styles.inscriptionBtn}>
              Inscription
            </Link>
          </>
        )}
      </div>
      <button className={`${styles.hamburger} ${isMenuOpen ? styles.active : ""}`} onClick={toggleMenu}>
        <span></span>
        <span></span>
        <span></span>
      </button>
    </nav>
  );
};

export default Navbar;