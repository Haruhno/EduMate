import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "../../assets/images/logo.png";
import userIcon from "../../assets/images/utilisateur.png";
import styles from "./Navbar.module.css";
import authService from "../../services/authService";
import profileService from "../../services/profileService";
import type { User } from "../../services/authService.types";

const Navbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profileStatus, setProfileStatus] = useState<any>(null);
  const navigate = useNavigate();

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

  // Charger le statut du profil
  useEffect(() => {
    const loadProfileStatus = async () => {
      if (currentUser) {
        try {
          const status = await profileService.getProfileStatus();
          setProfileStatus(status);
        } catch (error) {
          console.error('Erreur chargement statut profil:', error);
        }
      }
    };

    loadProfileStatus();
  }, [currentUser]);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const toggleUserMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsUserMenuOpen(!isUserMenuOpen);
  };

  const handleLogout = () => {
    try {
      authService.logout();
      setCurrentUser(null);
      setIsMenuOpen(false);
      setIsUserMenuOpen(false);
      // Recharger la page pour mettre à jour l'état global
      window.location.href = '/';
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
    }
  };

  const handleProfileClick = () => {
    if (profileStatus?.hasProfile && !profileStatus?.isCompleted) {
      // Rediriger vers la complétion du profil
      navigate('/completer-profil', { 
        state: { 
          role: currentUser?.role,
          continueProfile: true 
        } 
      });
    } else if (profileStatus?.hasProfile && profileStatus?.isCompleted) {
      // Rediriger vers la page de profil complet
      navigate('/mon-profil');
    } else {
      // Commencer un nouveau profil
      navigate('/completer-profil', { 
        state: { 
          role: currentUser?.role,
          firstName: currentUser?.firstName,
          lastName: currentUser?.lastName,
          email: currentUser?.email
        } 
      });
    }
    setIsMenuOpen(false);
    setIsUserMenuOpen(false);
  };

  const closeMenu = () => setIsMenuOpen(false);

  // Fermer le menu utilisateur quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = () => {
      setIsUserMenuOpen(false);
    };

    if (isUserMenuOpen) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isUserMenuOpen]);

  return (
    <nav className={styles.navbar}>
      {/* Logo */}
      <div className={styles.navbarBrand}>
        <Link to="/" onClick={closeMenu}>
          <img src={logo} alt="EduMate Logo" className={styles.logo} />
        </Link>
        <span className={styles.brandName}>EduMate</span>
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
              <Link 
                to="/choix-role" 
                onClick={closeMenu}
                className={styles.mobileInscriptionLink}
              >
                S'inscrire
              </Link>
            </li>
          </>
        ) : (
          <>
            <li className={styles.mobileAuth}>
              <button 
                onClick={handleProfileClick}
                className={styles.profileButtonMobile}
              >
                Mon profil
              </button>
            </li>
            <li className={styles.mobileAuth}>
              <button 
                onClick={handleLogout}
                className={styles.logoutButtonMobile}
              >
                Déconnexion
              </button>
            </li>
          </>
        )}
      </ul>

      {/* Actions desktop */}
      <div className={styles.navActions}>
        {currentUser ? (
          <div className={styles.userMenu}>
            <button 
              className={styles.userIconBtn}
              onClick={toggleUserMenu}
            >
              <img 
                src={userIcon} 
                alt="Menu utilisateur" 
                className={styles.userIcon}
              />
            </button>
            
            {/* Menu déroulant utilisateur */}
            {isUserMenuOpen && (
              <div className={styles.userDropdown}>
                <div className={styles.dropdownHeader}>
                  <img 
                    src={userIcon} 
                    alt="Utilisateur" 
                    className={styles.dropdownIcon}
                  />
                  <div className={styles.userInfo}>
                    <span className={styles.userName}>{currentUser.firstName} {currentUser.lastName}</span>
                    <span className={styles.userEmail}>{currentUser.email}</span>
                    {profileStatus && (
                      <div className={styles.profileStatus}>
                        <div className={styles.statusBadge}>
                          {profileStatus.isCompleted ? '✅ Profil complet' : '📝 Profil à compléter'}
                        </div>
                        {!profileStatus.isCompleted && profileStatus.completionPercentage > 0 && (
                          <div className={styles.progress}>
                            <div 
                              className={styles.progressBar} 
                              style={{ width: `${profileStatus.completionPercentage}%` }}
                            ></div>
                            <span>{profileStatus.completionPercentage}%</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className={styles.dropdownActions}>
                  <button 
                    onClick={handleProfileClick}
                    className={styles.dropdownAction}
                  >
                    {profileStatus?.isCompleted ? 'Voir mon profil' : 'Compléter mon profil'}
                  </button>
                  <button 
                    onClick={handleLogout}
                    className={`${styles.dropdownAction} ${styles.logoutAction}`}
                  >
                    Déconnexion
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <Link to="/connexion" className={styles.connexionBtn}>
              <img src={userIcon} alt="Compte utilisateur" />
            </Link>
            <Link to="/choix-role" className={styles.inscriptionBtn}>
              Inscription
            </Link>
          </>
        )}
      </div>

      {/* Hamburger mobile */}
      <button className={`${styles.hamburger} ${isMenuOpen ? styles.active : ""}`} onClick={toggleMenu}>
        <span></span>
        <span></span>
        <span></span>
      </button>
    </nav>
  );
};

export default Navbar;