import React, { useState } from 'react';
import styles from './TutorCard.module.css';

interface Tutor {
  id: number;
  name: string;
  subject: string;
  rating: number;
  reviews: number;
  price: string;
  emoji: string;
  status: string;
  badge: string;
  specialties: string[];
  gradient: string;
}

interface TutorCardProps {
  tutor: Tutor;
}

const TutorCard: React.FC<TutorCardProps> = ({ tutor }) => {
  const [isFavorite, setIsFavorite] = useState<boolean>(false);

  const getBadgeClass = (badge: string): string => {
    switch (badge) {
      case 'Free Trial': return styles.badgeFree;
      case 'Populaire': return styles.badgePopular;
      case 'Nouveau': return styles.badgeNew;
      case 'Économique': return styles.badgeEconomy;
      case 'Expert': return styles.badgeExpert;
      case 'Mentor': return styles.badgeMentor;
      default: return styles.badgeFree;
    }
  };

  return (
    <div className={styles.tutorCard}>
      <div className={styles.tutorCardHeader}>
        <div className={`${styles.tutorBadge} ${getBadgeClass(tutor.badge)}`}>
          {tutor.badge}
        </div>
        
        <button
          onClick={() => setIsFavorite(!isFavorite)}
          className={styles.favoriteButton}
        >
          {isFavorite ? '❤️' : '🤍'}
        </button>

        <div className={styles.tutorAvatar}>
          <div className={styles.avatarCircle}>
            <span className={styles.avatarEmoji}>{tutor.emoji}</span>
          </div>
        </div>
      </div>

      <div className={styles.tutorCardContent}>
        <div className={styles.tutorInfo}>
          <div className={styles.tutorMainInfo}>
            <h3 className={styles.tutorName}>{tutor.name}</h3>
            <p className={styles.tutorSubject}>{tutor.subject}</p>
          </div>
          <span className={styles.tutorStatus}>{tutor.status}</span>
        </div>

        <div className={styles.tutorRating}>
          <div className={styles.ratingStarsStatic}>
            {[...Array(5)].map((_, i: number) => (
              <span key={i} className={styles.star}>★</span>
            ))}
          </div>
          <span className={styles.reviewsCount}>({tutor.reviews} avis)</span>
        </div>

        <div className={styles.tutorSpecialties}>
          {tutor.specialties.slice(0, 3).map((specialty: string, i: number) => (
            <span key={i} className={styles.specialtyTag}>{specialty}</span>
          ))}
          {tutor.specialties.length > 3 && (
            <span className={styles.moreSpecialties}>+{tutor.specialties.length - 3}</span>
          )}
        </div>

        <div className={styles.tutorFooter}>
          <div className={styles.tutorPrice}>
            {tutor.price}<span className={styles.priceUnit}>/heure</span>
          </div>
          <button className={styles.profileButton}>Voir le profil</button>
        </div>
      </div>
    </div>
  );
};

export default TutorCard;