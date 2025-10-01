import React from 'react';
import styles from './HowItWorks.module.css';

// Importez vos images pour chaque étape

const stepImages = [
  'https://media.licdn.com/dms/image/v2/D4E12AQGnEJmSOEqSIQ/article-cover_image-shrink_600_2000/article-cover_image-shrink_600_2000/0/1732537600347?e=2147483647&v=beta&t=wxJNZTDLKn0R3_kcVh-IVjTwSp8YUHNzQ2f8FHX8IlI', // Création profil
  'https://geekflare.com/fr/wp-content/uploads/sites/26/2023/03/ai-search-engines.jpg', // Recherche
  'https://media.istockphoto.com/id/1064255822/fr/photo/jeune-belle-femme-asiatique-%C3%A0-laide-de-smartphone-et-carte-de-cr%C3%A9dit-pour-des-achats-en.jpg?s=612x612&w=0&k=20&c=_53e4-8dEnrPngc0BWWoveL3ZNP-tsVpMM8SmlxC4Fk=', // Paiement
  'https://img.freepik.com/photos-gratuite/scene-club-lecture-authentique_23-2150104626.jpg?semt=ais_hybrid&w=740&q=80'  // Apprentissage
];

const HowItWorks: React.FC = () => {
  const steps = [
    {
      number: 'Étape 1',
      title: 'Crée votre profil',
      description: 'Inscrivez-vous en quelques clics comme élève ou tuteur.',
      details: [
        'En tant qu’élève, vous indiquez votre niveau scolaire, vos matières et vos objectifs.',
        'En tant que tuteur, vous présentez votre parcours, les matières que vous enseignez, vos disponibilités et votre tarif en crédits EduCoins.',
        'Votre profil est votre identité sur la plateforme : clair, transparent et sécurisé.'
      ],
      buttonText: 'Créer mon profil',
      image: stepImages[0],
      alignment: 'left' as const
    },
    {
      number: 'Étape 2',
      title: 'Trouver ou proposer une séance',
      description: 'Vous pouvez chercher un tuteur grâce à nos filtres ou laisser notre Agent IA comprendre votre besoin.',
      details: [
        'Filtres par matière, prix, langue, disponibilité, localisation.',
        'Chaque tuteur a une fiche détaillée avec diplômes, expériences, notes et avis.',
        'En tant que tuteur, crée facilement vos offres de cours (individuels, collectifs ou ateliers).'
      ],
      buttonText: 'Découvrir les tuteurs',
      image: stepImages[1],
      alignment: 'right' as const
    },
    {
      number: 'Étape 3',
      title: 'Réserver et payer en toute simplicité',
      description: 'Choisissez un créneau et réservez votre séance avec notre système de crédits EduCoins.',
      details: [
        'Facile à recharger par carte bancaire.',
        'Flexible : échange vos crédits entre élèves et tuteurs.',
        'Sécurisé : crédits bloqués jusqu\'à la fin de la séance.'
      ],
      buttonText: 'Voir les tarifs',
      image: stepImages[2],
      alignment: 'left' as const
    },
    {
      number: 'Étape 4',
      title: 'Apprendre et progresser',
      description: 'Rejoignez votre tuteur via notre messagerie sécurisée et visio intégrée.',
      details: [
        'À la fin du cours, laissez votre évaluation.',
        'Le tuteur reçoit ses crédits (convertibles en argent réel).',
        'Continuez votre parcours personnalisé avec des recommandations adaptées.'
      ],
      buttonText: 'Commencer maintenant',
      image: stepImages[3],
      alignment: 'right' as const
    }
  ];

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        {/* En-tête */}
        <div className={styles.header}>
          <h2 className={styles.title}>Comment ça marche ?</h2>
          <div className={styles.divider}></div>
          <p className={styles.subtitle}>
            En 4 étapes simples, rejoins la communauté EduMate et transforme ton apprentissage
          </p>
        </div>

        {/* Contenu principal avec étapes */}
        <div className={styles.stepsContainer}>
          {steps.map((step, index) => (
            <div key={index} className={styles.stepWrapper}>
              {/* Ligne de connexion avec flèches */}
              {index > 0 && (
                <div className={`${styles.connectionLine} ${
                  step.alignment === 'right' ? styles.connectionRight : styles.connectionLeft
                }`}>
                  <div className={styles.arrowPath}>
                    <div className={styles.line}></div>
                    <div className={styles.arrowHead}></div>
                  </div>
                </div>
              )}

              {/* Étape */}
              <div className={`${styles.step} ${styles[step.alignment]}`}>
                {/* Contenu texte */}
                <div className={styles.textContent}>
                  <div className={styles.stepNumber}>{step.number}</div>
                  <h3 className={styles.stepTitle}>{step.title}</h3>
                  <p className={styles.stepDescription}>{step.description}</p>
                  
                  <ul className={styles.stepDetails}>
                    {step.details.map((detail, detailIndex) => (
                      <li key={detailIndex} className={styles.detailItem}>
                        {detail}
                      </li>
                    ))}
                  </ul>
                  
                  <button className={styles.stepButton}>
                    {step.buttonText}
                  </button>
                </div>

                {/* Image */}
                <div className={styles.imageContent}>
                  <img 
                    src={step.image} 
                    alt={step.title}
                    className={styles.stepImage}
                  />
                  <div className={styles.stepIndicator}>
                    <span>{index + 1}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA final */}
        <div className={styles.finalCta}>
          <h3 className={styles.finalTitle}>Prêt à commencer votre aventure EduMate ?</h3>
          <button className={styles.finalButton}>
            Rejoindre la communauté
          </button>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;