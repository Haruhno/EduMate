import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom"; // Ajout de useLocation
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
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation(); 


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

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Charger le statut du profil
  useEffect(() => {
    const loadProfileStatus = async () => {
      if (currentUser) {
        try {
          const status = await profileService.getProfileStatus();
          setProfileStatus(status.data);
        } catch (error: any) {
          // Si token invalide -> forcer la déconnexion et redirection
          const statusCode = error?.response?.status;
          if (statusCode === 401) {
            try { authService.logout(); } catch (e) {}
            if (typeof window !== 'undefined') window.location.href = '/connexion';
            return;
          }
          console.error('Erreur chargement statut profil:', error);
        }
      }
    };

    loadProfileStatus();
  }, [currentUser]);

  useEffect(() => {
    const loadProfilePicture = async () => {
      if (currentUser) {
        try {
          // Récupérer les infos du profil
          const profileData = await profileService.getProfile();
          if (profileData?.data?.profile?.profilePicture) {
            setProfilePicture(profileData.data.profile.profilePicture);
          } else {
            setProfilePicture(null);
          }
        } catch (error) {
          console.error("Erreur chargement photo profil:", error);
          setProfilePicture(null);
        }
      } else {
        setProfilePicture(null);
      }
    };

    loadProfilePicture();
  }, [currentUser]);

  //Navigation différente selon le statut du profil
  const getNavLinks = () => {
    if (currentUser?.role === 'tutor') {
      return [
        { name: 'Trouver un tuteur', path: '/recherche-tuteur' },   
        { name: 'Tableau de bord', path: '/dashboard' },
        { name: 'Gestion des annonces', path: '/annonces' },
        { name: 'Mes cours', path: '/cours' },
        { name: 'Messages', path: '/messages' },
      ];
    } else if (currentUser?.role === 'student') {
      return [
        { name: 'Tableau de bord', path: '/dashboard' },
        { name: 'Trouver un tuteur', path: '/recherche-tuteur' },   
        { name: 'Mes séances', path: '/cours' },
        { name: 'Messages', path: '/messages' },
      ];
    } else {
      return [
        { name: 'Comment ça marche', path: '/#comment-ca-marche', isAnchor: true }, // Changé pour un anchor
        { name: 'Découvrir les tuteurs', path: '/recherche-tuteur' },
        { name: 'Nous contacter', path: '/contact' },
      ];
    }
  };

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

  // Fonction pour gérer le scroll vers la section
  const handleHowItWorksClick = (e: React.MouseEvent) => {
    e.preventDefault();
    closeMenu();
    
    if (location.pathname === '/') {
      // Si on est déjà sur la page d'accueil, scroller vers la section
      const howItWorksSection = document.getElementById('comment-ca-marche');
      if (howItWorksSection) {
        howItWorksSection.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      // Si on est sur une autre page, naviguer vers l'accueil avec l'anchor
      navigate('/#comment-ca-marche');
      
      // Après navigation, scroller vers la section
      setTimeout(() => {
        const howItWorksSection = document.getElementById('comment-ca-marche');
        if (howItWorksSection) {
          howItWorksSection.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  };

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
  
  const navLinks = getNavLinks();

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
        {navLinks.map((link) => (
          <li key={link.name}>
            {link.isAnchor ? (
              <a 
                href={link.path} 
                onClick={handleHowItWorksClick} 
                className={styles.navLink}
              >
                {link.name}
              </a>
            ) : (
              <Link to={link.path} onClick={closeMenu} className={styles.navLink}>
                {link.name}
              </Link>
            )}
          </li>
        ))}

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
                className={`${styles.profileButtonMobile} ${isMenuOpen ? styles.active : ""}`}
              >
                Mon profil
              </button>
            </li>
            <li className={styles.mobileAuth}>
              <button 
                onClick={handleLogout}
                className={`${styles.logoutButtonMobile} ${isMenuOpen ? styles.active : ""}`}
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
                src={profilePicture || userIcon} 
                alt="Menu utilisateur" 
                className={`${styles.userIcon} ${profilePicture ? styles.userPhoto : ''}`}              />
            </button>
            
            {/* Menu déroulant utilisateur */}
            {isUserMenuOpen && (
              <div className={styles.userDropdown}>
                <div className={styles.dropdownHeader}>
                  <img 
                    src={profilePicture || userIcon} 
                    alt="Utilisateur" 
                    className={styles.dropdownIcon}
                  />
                  <div className={styles.userInfo}>
                    <span className={styles.userName}>{currentUser.firstName} {currentUser.lastName}</span>
                    <span className={styles.userEmail}>{currentUser.email}</span>
                    {profileStatus && (
                      <div className={styles.profileStatus}>
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
      <button className={`${styles.hamburger} ${isMenuOpen ? styles.active : ""}`} onClick={toggleMenu}>
        <span></span>
        <span></span>
        <span></span>
      </button>
    </nav>
  );
};

export default Navbar;