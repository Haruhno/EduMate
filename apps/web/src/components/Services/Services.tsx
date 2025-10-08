import React from 'react';
import styles from './Services.module.css';

const Services: React.FC = () => {
  const services = [
    {
        icon: '🔍',
        title: 'Mise en relation intelligente',
        description: 'Trouvez rapidement un professeur qualifié en fonction de la matière, de votre budget, de votre localisation et de vos disponibilités.',
        cardClass: styles.card1,
        iconClass: styles.icon1,
        iconLine: styles.iconLine1
    },
    {
        icon: '💻',
        title: 'Cours en ligne et présentiel',
        description: 'Choisissez le mode qui vous convient : suivez vos cours à distance via visioconférence ou en face-à-face avec le professeur.',
        cardClass: styles.card2,
        iconClass: styles.icon2,
        iconLine: styles.iconLine2
    },
    {
        icon: '📊',
        title: 'Suivi personnalisé',
        description: 'Recevez un accompagnement adapté à vos besoins, avec un suivi des progrès, des recommandations de cours et des ressources adaptées à votre niveau.',
        cardClass: styles.card3,
        iconClass: styles.icon3,
        iconLine: styles.iconLine3
    },
    {
        icon: '⚖️',
        title: 'Comparateur intelligent',
        description: 'Comparez facilement plusieurs professeurs selon leur tarif, leurs compétences, leurs avis et leur expérience.',
        cardClass: styles.card4,
        iconClass: styles.icon4,
        iconLine: styles.iconLine4
    },
    {
        icon: '🎯',
        title: 'Espace étudiant intuitif',
        description: 'Un tableau de bord clair et intuitif pour gérer vos cours, vos paiements et vos favoris.',
        cardClass: styles.card5,
        iconClass: styles.icon5,
        iconLine: styles.iconLine5
    },
    {
        icon: '🛡️',
        title: 'Sécurité et fiabilité',
        description: 'Tous nos professeurs sont vérifiés pour vous garantir des cours de qualité en toute confiance.',
        cardClass: styles.card6,
        iconClass: styles.icon6,
        iconLine: styles.iconLine6
    }
  ];

  return (
    <section className={styles.section}>
      {/* Éléments de fond animés */}
      <div className={styles.backgroundElements}></div>
      <div className={styles.backgroundElements}></div>
      <div className={styles.backgroundElements}></div>
      
      <div className={styles.container}>
        {/* En-tête */}
        <div className={styles.header}>
          <h2 className={styles.title}>
            Nos Services pour{' '}
            <span className={styles.titleGradient}>Faciliter votre Apprentissage</span>
          </h2>
          <div className={styles.divider}></div>
          <p className={styles.subtitle}>
            Découvrez une expérience d'apprentissage complète et personnalisée, conçue pour répondre à tous vos besoins éducatifs
          </p>
        </div>

        {/* Grille des services */}
        <div className={styles.grid}>
          {services.map((service, index) => (
            <div key={index} className={`${styles.card} ${service.cardClass}`}>              
              <div className={styles.iconContainer}>
                <div className={`${styles.icon} ${service.iconClass}`}>
                  {service.icon}
                </div>
                {/* CORRECTION ICI : utiliser service.iconLine au lieu de styles.iconLine */}
                <div className={`${styles.iconLine} ${service.iconLine}`}></div>
              </div>

              <h3 className={styles.cardTitle}>{service.title}</h3>
              <p className={styles.cardDescription}>{service.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;