import React from "react";
import logo from "../../assets/images/logo.png";
import user from "../../assets/images/utilisateur.png";
import styles from "./Navbar.module.css"; 

const Navbar: React.FC = () => {
  return (
    <nav className={styles.navbar}> 
      {/* Logo + Nom */}
      <div className={styles.navbarBrand}>
        <img src={logo} alt="EduMate Logo" className={styles.logo} />
        <span className={styles.brandName}>EduMate</span>
      </div>

      {/* Liens de navigation */}
      <ul className={styles.navLinks}>
        <li><a href="#about">Qui sommes-nous</a></li>
        <li><a href="#services">Nos services</a></li>
        <li><a href="#news">Actualités</a></li>
        <li><a href="#contact">Nous contacter</a></li>
      </ul>

      {/* Actions */}
      <div className={styles.navActions}>
        <button className={styles.connexionBtn}>
          <img src={user} alt="Compte utilisateur"/>
        </button>
        <button className={styles.inscriptionBtn}>Inscription</button>
      </div>
    </nav>
  );
};

export default Navbar;