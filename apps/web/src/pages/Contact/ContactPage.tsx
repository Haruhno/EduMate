import React from 'react';
import styles from './ContactPage.module.css';

const ContactPage: React.FC = () => {

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title}>Nous contacter</h1>
          <p className={styles.subtitle}>
            Une question ? N'hésitez pas à nous contacter, nous vous répondrons rapidement.
          </p>
        </div>

        <div className={styles.cardsContainer}>
          <div className={styles.infoCard}>
            <div className={styles.infoIcon}>📧</div>
            <h3 className={styles.infoTitle}>Email</h3>
            <a href="mailto:hasmir.boinali@etu.u-pec.fr" className={styles.infoLink}>
              hasmir.boinali@etu.u-pec.fr
            </a>
            <a href="mailto:nthanhuyen1411@gmail.com" className={styles.infoLink}>
              nthanhuyen1411@gmail.com
            </a>
            <p className={styles.infoSubtext}>Réponse sous 24-48h</p>
          </div>

          <div className={styles.infoCard}>
            <div className={styles.infoIcon}>📍</div>
            <h3 className={styles.infoTitle}>Adresse</h3>
            <p className={styles.infoText}>
              UPEC<br />
              122 rue Paul Armangot<br />
              94400 Vitry-sur-Seine
            </p>
          </div>

          <div className={styles.infoCard}>
            <div className={styles.infoIcon}>💬</div>
            <h3 className={styles.infoTitle}>Support</h3>
            <p className={styles.infoText}>Lun - Ven : 9h - 18h</p>
            <p className={styles.infoSubtext}>Temps de réponse moyen : 2h</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
