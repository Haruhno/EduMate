import React, { useState } from "react";
import logo from "../../assets/images/logo.png";
import user from "../../assets/images/utilisateur.png";
import styles from "./Navbar.module.css"; 

const Navbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav className={styles.navbar}> 
      {/* Logo + Nom */}
      <div className={styles.navbarBrand}>
        <img src={logo} alt="EduMate Logo" className={styles.logo} />
        <span className={styles.brandName}>EduMate</span>
      </div>

      {/* Liens de navigation */}
      <ul className={`${styles.navLinks} ${isMenuOpen ? styles.active : ''}`}>
        <li><a href="#about" onClick={() => setIsMenuOpen(false)}>Qui sommes-nous</a></li>
        <li><a href="#services" onClick={() => setIsMenuOpen(false)}>Nos services</a></li>
        <li><a href="#news" onClick={() => setIsMenuOpen(false)}>Actualités</a></li>
        <li><a href="#contact" onClick={() => setIsMenuOpen(false)}>Nous contacter</a></li>
        
        {/* Boutons auth pour mobile */}
        <li className={styles.mobileAuth}>
          <a href="#login" onClick={() => setIsMenuOpen(false)} className={styles.mobileConnexion}>
            Votre compte<img src={user} alt="Compte utilisateur" className={styles.mobileUserIcon}/>
          </a>
        </li>
        <li className={styles.mobileAuth}>
          <a href="#signup" onClick={() => setIsMenuOpen(false)} className={styles.mobileInscription}>
            Inscrivez-vous
          </a>
        </li>
      </ul>

      {/* Actions (desktop seulement) */}
      <div className={styles.navActions}>
        <button className={styles.connexionBtn}>
          <img src={user} alt="Compte utilisateur"/>
        </button>
        <button className={styles.inscriptionBtn}>Inscription</button>
      </div>

      {/* Bouton hamburger (mobile seulement) */}
      <button 
        className={`${styles.hamburger} ${isMenuOpen ? styles.active : ''}`}
        onClick={toggleMenu}
      >
        <span></span>
        <span></span>
        <span></span>
      </button>
    </nav>
  );
};

export default Navbar;