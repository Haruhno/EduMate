import React, { useState } from 'react';
import styles from './WhyChooseUs.module.css';

// Images pour chaque bloc 
const defaultImages = [
  'https://observatorio.tec.mx/wp-content/uploads/2024/08/IMG.png', // IA
  'https://media.istockphoto.com/id/1583207917/vector/make-money-get-rich-salary-investment.jpg?s=612x612&w=0&k=20&c=bPBF5JNULyr1eklbkGXahzNGfRGylA5xyUDXcBH2JX8=', // Argent
  'https://lesmakers.fr/wp-content/uploads/2024/01/outils-de-travail-collaboratif.jpg', // Collaboration
  'https://img.freepik.com/free-photo/cyber-security-concept-digital-art_23-2151637763.jpg?semt=ais_hybrid&w=740'  // Sécurité
];

const WhyChooseUs: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState<number>(0);

  const features = [
    {
        title: '🔍 Recherche intelligente',
        shortDesc: 'IA qui comprend ton besoin',
        fullDesc: 'Notre intelligence artificielle analyse votre profil, vos objectifs et vos préférences pour trouver le tuteur parfaitement adapté à vos besoins spécifiques.',
        color: '#4F46E5', 
        image: defaultImages[0]
    },
    {
        title: '💰 Monnaie interne',
        shortDesc: 'Paiement simple et flexible',
        fullDesc: 'Système de crédits EduMate pour des transactions simplifiées. Recharge vos EduCoins facilement (CB, PayPal,..) et utilise-les pour réserver des sessions.',
        color: '#10B981', 
        image: defaultImages[1]
    },
    {
        title: '🤝 Modèles collaboratifs',
        shortDesc: 'Troc et sessions de groupe',
        fullDesc: 'Échangez des compétences, participez à des sessions de groupe pour partager les frais et apprendre ensemble, bénéficiez de mentorat entre pairs.',
        color: '#F59E0B', 
        image: defaultImages[2]
    },
    {
        title: '🔒 Sécurité & transparence',
        shortDesc: 'Authentification forte + blockchain',
        fullDesc: 'Double authentification et technologie blockchain pour garantir la sécurité des transactions et la transparence des évaluations.',
        color: '#EF4444', 
        image: defaultImages[3]
    }
  ];

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        {/* Titre principal */}
        <div className={styles.header}>
          <h2 className={styles.title}>Pourquoi nous choisir ?</h2>
          <div className={styles.divider}></div>
          <p className={styles.subtitle}>
            Des outils innovants pour des résultats concrets
          </p>
        </div>

        <div className={styles.content}>
          {/* Colonne gauche - Liste des features */}
          <div className={styles.featuresList}>
            {features.map((feature, index) => (
              <div
                key={index}
                className={`${styles.featureItem} ${
                  activeIndex === index ? styles.active : ''
                }`}
                style={{
                  '--feature-color': feature.color
                } as React.CSSProperties}
                onClick={() => setActiveIndex(index)}
              >
                <div className={styles.featureHeader}>
                  <h3 className={styles.featureTitle}>{feature.title}</h3>
                  <div className={styles.arrow}>
                    ▼
                  </div>
                </div>
                
                {activeIndex === index && (
                  <div className={styles.featureContent}>
                    <p className={styles.featureDescription}>{feature.fullDesc}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Colonne droite - Image */}
          <div className={styles.imageContainer}>
            <img
              src={features[activeIndex].image}
              alt={features[activeIndex].title}
              className={styles.featureImage}
            />
            <div className={styles.imageOverlay}></div>
          </div>
        </div>

        {/* Bouton CTA */}
        <div className={styles.ctaContainer}>
          <button className={styles.ctaButton}>
            Découvrir EduMate
          </button>
        </div>
      </div>
    </section>
  );
};

export default WhyChooseUs;