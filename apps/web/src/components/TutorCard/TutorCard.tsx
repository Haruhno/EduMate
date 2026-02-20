import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './TutorCard.module.css';

interface Tutor {
  id: string; 
  profilePicture: string;
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
  tutorId?: string; 
  annonceId?: string; 
  annonceData?: {
    title?: string;
    hourlyRate?: number;
    teachingMode?: string;
    description?: string;
  };
  skillsToLearn?: string[];
}

interface TutorCardProps {
  tutor: Tutor;
}

const TutorCard: React.FC<TutorCardProps> = ({ tutor }) => {
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [showAllSpecialties, setShowAllSpecialties] = useState<boolean>(false);
  const [showAllLearningSkills, setShowAllLearningSkills] = useState<boolean>(false);
  const navigate = useNavigate();

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

  const goToProfile = () => {
    navigate(`/tuteur/${tutor.id}`, {
      state: {
        annonceId: tutor.annonceId || undefined, 
        fromSearch: true,
        annonceData: tutor.annonceData,
        tutorId: tutor.tutorId || tutor.id,
        skillsToLearn: tutor.skillsToLearn
      }
    });
  };

  // Compétences enseignées à afficher
  const displayedSpecialties = showAllSpecialties 
    ? tutor.specialties 
    : tutor.specialties.slice(0, 3);

  // Compétences à apprendre à afficher
  const displayedLearningSkills = showAllLearningSkills
    ? tutor.skillsToLearn || []
    : (tutor.skillsToLearn || []).slice(0, 3);

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
            <img 
              src={tutor.profilePicture} 
              alt={tutor.name}
              className={styles.avatarImage}
              onError={(e) => {
                e.currentTarget.src = '/default-avatar.png';
              }}
            />
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

        {/* Compétences enseignées */}
        <div className={styles.tutorSpecialties}>
          <div className={styles.skillsSection}>
            <label className={styles.skillsLabel}>Compétences enseignées</label>
            <div className={styles.skillsContainer}>
              {displayedSpecialties.map((specialty: string, i: number) => (
                <span key={i} className={styles.specialtyTag}>{specialty}</span>
              ))}
              
              {/* Bouton +X pour montrer plus */}
              {tutor.specialties.length > 3 && !showAllSpecialties && (
                <button 
                  onClick={() => setShowAllSpecialties(true)}
                  className={styles.moreSpecialtiesButton}
                  title="Voir toutes les compétences"
                >
                  +{tutor.specialties.length - 3}
                </button>
              )}
              
              {/* Bouton - pour réduire */}
              {showAllSpecialties && (
                <button 
                  onClick={() => setShowAllSpecialties(false)}
                  className={styles.lessSpecialtiesButton}
                  title="Voir moins"
                >
                  −
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Compétences recherchées (si disponibles) */}
        {tutor.skillsToLearn && tutor.skillsToLearn.length > 0 && (
          <div className={styles.learningSkillsSection}>
            <div className={styles.skillsHeader}>
              <label className={styles.skillsLabel}>Recherche aussi à apprendre</label>
            </div>
            
            <div className={styles.learningSkillsContainer}>
              {displayedLearningSkills.map((skill: string, i: number) => (
                <span key={i} className={`${styles.skillTag} ${styles.learningSkill}`}>
                  {skill}
                </span>
              ))}
              
              {/* Bouton +X pour les compétences à apprendre */}
              {tutor.skillsToLearn.length > 3 && !showAllLearningSkills && (
                <button 
                  onClick={() => setShowAllLearningSkills(true)}
                  className={styles.moreLearningSkillsButton}
                  title="Voir toutes les compétences"
                >
                  +{tutor.skillsToLearn.length - 3}
                </button>
              )}
              
              {/* Bouton - pour réduire */}
              {showAllLearningSkills && (
                <button 
                  onClick={() => setShowAllLearningSkills(false)}
                  className={styles.lessLearningSkillsButton}
                  title="Voir moins"
                >
                  −
                </button>
              )}
            </div>
          </div>
        )}

        <div className={styles.tutorFooter}>
          <div className={styles.tutorPrice}>
            {tutor.price}<span className={styles.priceUnit}>/heure</span>
          </div>
          <button
            onClick={goToProfile}
            className={styles.profileButton}
          >
            Voir le profil
          </button>
        </div>
      </div>
    </div>
  );
};

export default TutorCard;