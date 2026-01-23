import { useState } from 'react';
import type { FC } from 'react'; 
import styles from './HistoriqueCours.module.css';

interface User {
  name: string;
  avatar: string;
  role: string;
  rating: number;
  reviews: number;
  experience?: string;
  color?: string;
}

interface Review {
  rating: number;
  comment: string;
}

interface Session {
  id: number;
  date: string;
  time: string;
  student?: User;
  tutor?: User;
  subject: string;
  level: string;
  mode: 'online' | 'inperson';
  price: string;
  notes?: string;
  duration?: string;
  review?: Review;
  color?: string;
}

interface SessionsPageProps {
  userRole?: 'tutor' | 'student';
}

// Données de démonstration avec types
const tutorUpcomingSessions: Session[] = [
  {
    id: 1,
    date: "23 Décembre 2025",
    time: "15:00 - 17:00",
    student: {
      name: "Emma Martin",
      avatar: "👩‍🎓",
      role: "Étudiante - Terminale S",
      rating: 4.8,
      reviews: 12
    },
    subject: "Mathématiques",
    level: "Terminale",
    mode: "online",
    price: "45🪙",
    notes: "Révision chapitres 7 et 8 - Préparation au bac",
    duration: "2h",
    color: "#FF6B6B"
  },
  {
    id: 2,
    date: "29 Décembre 2025",
    time: "18:00 - 19:30",
    student: {
      name: "Lucas Bernard",
      avatar: "👨‍🎓",
      role: "Étudiant - 1ère ES",
      rating: 4.5,
      reviews: 8
    },
    subject: "Économie",
    level: "1ère",
    mode: "inperson",
    price: "40🪙",
    notes: "Introduction à la macroéconomie - TD sur les indicateurs",
    duration: "1h30",
    color: "#4ECDC4"
  }
];

const tutorPastSessions: Session[] = [
  {
    id: 3,
    date: "10 Mars 2024",
    time: "14:00 - 16:00",
    student: {
      name: "Sophie Dubois",
      avatar: "👩‍💼",
      role: "Étudiante - Terminale",
      rating: 4.9,
      reviews: 15
    },
    subject: "Physique-Chimie",
    level: "Terminale",
    mode: "online",
    price: "45🪙",
    review: {
      rating: 5,
      comment: "Professeur exceptionnel ! Les explications sont claires et les exercices pertinents."
    },
    color: "#FFD166"
  },
  {
    id: 4,
    date: "8 Mars 2024",
    time: "10:00 - 12:00",
    student: {
      name: "Thomas Moreau",
      avatar: "👨‍🔬",
      role: "Étudiant - Prépa",
      rating: 4.7,
      reviews: 20
    },
    subject: "Mathématiques",
    level: "CPGE",
    mode: "inperson",
    price: "50🪙",
    review: {
      rating: 4,
      comment: "Très bon cours, quelques points à approfondir pour le prochain chapitre."
    },
    color: "#06D6A0"
  },
  {
    id: 5,
    date: "5 Mars 2024",
    time: "16:30 - 18:00",
    student: {
      name: "Léa Petit",
      avatar: "👩‍🔬",
      role: "Étudiante - Licence",
      rating: 4.6,
      reviews: 5
    },
    subject: "Statistiques",
    level: "L3",
    mode: "online",
    price: "42🪙",
    review: {
      rating: 5,
      comment: "Merci pour votre patience et vos explications détaillées !"
    },
    color: "#118AB2"
  },
  {
    id: 6,
    date: "1 Mars 2024",
    time: "09:00 - 11:00",
    student: {
      name: "Antoine Rousseau",
      avatar: "👨‍🎨",
      role: "Étudiant - BTS",
      rating: 4.4,
      reviews: 3
    },
    subject: "Marketing",
    level: "BTS",
    mode: "online",
    price: "38🪙",
    review: {
      rating: 4,
      comment: "Cours très pratique avec des cas concrets. Très utile !"
    },
    color: "#7209B7"
  },
  {
    id: 7,
    date: "25 Février 2024",
    time: "17:00 - 19:00",
    student: {
      name: "Camille Leroy",
      avatar: "👩‍💻",
      role: "Étudiante - Master",
      rating: 4.8,
      reviews: 18
    },
    subject: "Data Science",
    level: "M1",
    mode: "inperson",
    price: "55🪙",
    review: {
      rating: 5,
      comment: "Expertise impressionnante. Les exemples en Python étaient parfaits."
    },
    color: "#F72585"
  }
];

const studentUpcomingSessions: Session[] = [
  {
    id: 8,
    date: "19 Mars 2024",
    time: "16:00 - 18:00",
    tutor: {
      name: "Dr. Michel Durand",
      avatar: "👨‍🏫",
      role: "Professeur Agrégé",
      rating: 4.9,
      reviews: 47,
      experience: "15 ans d'expérience"
    },
    subject: "Philosophie",
    level: "Terminale",
    mode: "online",
    price: "55🪙",
    notes: "Préparation dissertation - Thème : La liberté",
    duration: "2h",
    color: "#9D4EDD"
  },
  {
    id: 9,
    date: "22 Mars 2024",
    time: "17:30 - 19:00",
    tutor: {
      name: "Mme. Isabelle Renault",
      avatar: "👩‍🏫",
      role: "Ingénieure ENS",
      rating: 4.8,
      reviews: 32,
      experience: "12 ans d'expérience"
    },
    subject: "Informatique",
    level: "BTS",
    mode: "inperson",
    price: "60🪙",
    notes: "Algorithmique avancée - Structures de données",
    duration: "1h30",
    color: "#FF9E00"
  }
];

const studentPastSessions: Session[] = [
  {
    id: 10,
    date: "12 Mars 2024",
    time: "14:00 - 15:30",
    tutor: {
      name: "M. Jean Lefebvre",
      avatar: "👨‍🔧",
      role: "Docteur en Physique",
      rating: 4.7,
      reviews: 28,
      experience: "10 ans d'expérience"
    },
    subject: "Physique Quantique",
    level: "Master",
    mode: "online",
    price: "65🪙",
    review: {
      rating: 5,
      comment: "Explications lumineuses sur des concepts complexes. Je recommande !"
    },
    color: "#00B4D8"
  },
  {
    id: 11,
    date: "9 Mars 2024",
    time: "11:00 - 13:00",
    tutor: {
      name: "Dr. Marie Curie",
      avatar: "👩‍🔬",
      role: "Chercheuse CNRS",
      rating: 5.0,
      reviews: 41,
      experience: "20 ans d'expérience"
    },
    subject: "Chimie Organique",
    level: "Licence",
    mode: "inperson",
    price: "70🪙",
    review: {
      rating: 5,
      comment: "Un cours magistral ! La qualité d'enseignement est exceptionnelle."
    },
    color: "#FF0054"
  },
  {
    id: 12,
    date: "6 Mars 2024",
    time: "09:00 - 10:30",
    tutor: {
      name: "M. Pierre Lambert",
      avatar: "👨‍💻",
      role: "Data Scientist",
      rating: 4.6,
      reviews: 19,
      experience: "8 ans d'expérience"
    },
    subject: "Python",
    level: "Débutant",
    mode: "online",
    price: "45🪙",
    review: {
      rating: 4,
      comment: "Bon cours d'introduction, pratique et bien structuré."
    },
    color: "#7209B7"
  },
  {
    id: 13,
    date: "28 Février 2024",
    time: "15:00 - 17:00",
    tutor: {
      name: "M. David Martinez",
      avatar: "👨‍🔬",
      role: "PhD Biologie",
      rating: 4.9,
      reviews: 35,
      experience: "7 ans d'expérience"
    },
    subject: "Biologie Moléculaire",
    level: "Licence",
    mode: "inperson",
    price: "60🪙",
    review: {
      rating: 5,
      comment: "Passionnant ! Beaucoup de schémas et d'explications claires."
    },
    color: "#38B000"
  },
  {
    id: 14,
    date: "22 Février 2024",
    time: "10:00 - 12:00",
    tutor: {
      name: "Mme. Sarah Cohen",
      avatar: "👩‍⚖️",
      role: "Avocate - Professeur",
      rating: 4.8,
      reviews: 24,
      experience: "14 ans d'expérience"
    },
    subject: "Droit Civil",
    level: "Master",
    mode: "online",
    price: "75🪙",
    review: {
      rating: 4,
      comment: "Approche très pédagogique des articles de loi complexes."
    },
    color: "#8338EC"
  }
];

const SessionsPage: FC<SessionsPageProps> = ({ userRole = 'tutor' }) => {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  
  const isTutor = userRole === 'tutor';
  const upcomingSessions = isTutor ? tutorUpcomingSessions : studentUpcomingSessions;
  const pastSessions = isTutor ? tutorPastSessions : studentPastSessions;
  
  const renderUserProfile = (user: User) => (
    <div className={styles.userProfile}>
      <div className={styles.userAvatar} style={{ backgroundColor: user.color }}>
        {user.avatar}
      </div>
      <div className={styles.userInfo}>
        <h3 className={styles.userName}>{user.name}</h3>
        <div className={styles.userRole}>
          <span className={styles.roleIcon}>🎓</span>
          {user.role}
        </div>
        <div className={styles.userRating}>
          <div className={styles.ratingStars}>
            {[...Array(5)].map((_, i) => (
              <span 
                key={i} 
                className={`${styles.star} ${i < Math.floor(user.rating) ? styles.filled : ''}`}
              >
                ★
              </span>
            ))}
          </div>
          <span className={styles.ratingValue}>
            {user.rating}/5 ({user.reviews} avis)
          </span>
        </div>
        {user.experience && (
          <div className={styles.userExperience}>
            <span style={{ color: '#3B82F6', fontWeight: 600, fontSize: '0.9rem' }}>
              {user.experience}
            </span>
          </div>
        )}
      </div>
    </div>
  );
  
  const renderSessionCard = (session: Session, isPast: boolean = false) => {
    const user = isTutor ? session.student : session.tutor;
    
    if (!user) return null;
    
    return (
      <div key={session.id} className={styles.sessionCard}>
        <div className={styles.sessionHeader}>
          <div className={styles.dateTime}>
            <div className={styles.sessionDate}>
              <span className={styles.dateIcon}>📅</span>
              {session.date}
            </div>
            <div className={styles.sessionTime}>
              <span className={styles.timeIcon}>🕒</span>
              {session.time} • {session.duration || '1h30'}
            </div>
          </div>
          <div className={`${styles.sessionStatus} ${isPast ? styles.statusCompleted : styles.statusUpcoming}`}>
            {isPast ? 'Terminé' : 'À venir'}
          </div>
        </div>
        
        <div className={styles.sessionBody}>
          <div>
            {renderUserProfile(user)}
            
            <div className={styles.sessionDetails}>
              <div className={styles.detailGroup}>
                <div className={styles.detailLabel}>
                  <span className={styles.labelIcon}>📚</span>
                  MATIÈRE
                </div>
                <div className={styles.detailValue}>
                  <span className={styles.subjectBadge}>
                    {session.subject}
                  </span>
                </div>
              </div>
              
              <div className={styles.detailGroup}>
                <div className={styles.detailLabel}>
                  <span className={styles.labelIcon}>🎯</span>
                  NIVEAU
                </div>
                <div className={styles.detailValue}>
                  {session.level}
                </div>
              </div>
              
              <div className={styles.detailGroup}>
                <div className={styles.detailLabel}>
                  <span className={styles.labelIcon}>📍</span>
                  MODE
                </div>
                <div className={styles.detailValue}>
                  <span className={`${styles.modeBadge} ${
                    session.mode === 'online' ? styles.modeOnline : styles.modeInPerson
                  }`}>
                    {session.mode === 'online' ? '🖥️ En ligne' : '👥 Présentiel'}
                  </span>
                </div>
              </div>
            </div>
            
            {session.notes && (
              <div className={styles.sessionNotes}>
                <div className={styles.notesLabel}>
                  <span className={styles.notesIcon}>📝</span>
                  NOTES DE LA SÉANCE
                </div>
                <p className={styles.notesText}>{session.notes}</p>
              </div>
            )}
            
            {isPast && session.review && (
              <div className={styles.reviewCard}>
                <div className={styles.reviewHeader}>
                  <div className={styles.reviewRating}>
                    <div className={styles.ratingStars}>
                      {[...Array(5)].map((_, i) => (
                        <span 
                          key={i} 
                          className={`${styles.star} ${i < session.review!.rating ? styles.filled : ''}`}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                    <span style={{ color: '#6B7280', fontWeight: 600, fontSize: '0.9rem' }}>
                      Avis de {isTutor ? "l'élève" : "l'étudiant"}
                    </span>
                  </div>
                </div>
                <p className={styles.reviewComment}>"{session.review!.comment}"</p>
              </div>
            )}
          </div>
          
          <div className={styles.priceSection}>
            <div className={styles.sessionPrice}>
              {session.price}
              <span className={styles.priceUnit}>par séance</span>
            </div>
            
            <div className={styles.sessionActions}>
              {!isPast ? (
                <>
                  <button className={`${styles.actionButton} ${styles.primaryButton}`}>
                    <span>🎥</span>
                    {isTutor ? 'Préparer la séance' : 'Rejoindre le cours'}
                  </button>
                  <button className={`${styles.actionButton} ${styles.secondaryButton}`}>
                    <span>💬</span>
                    Contacter {isTutor ? "l'élève" : "le tuteur"}
                  </button>
                  <button className={`${styles.actionButton} ${styles.dangerButton}`}>
                    <span>❌</span>
                    Annuler la séance
                  </button>
                </>
              ) : (
                <>
                  <button className={`${styles.actionButton} ${styles.primaryButton}`}>
                    <span>📄</span>
                    Voir le compte-rendu
                  </button>
                  {isTutor && (
                    <button className={`${styles.actionButton} ${styles.secondaryButton}`}>
                      <span>⭐</span>
                      Noter l'élève
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSectionHeader = (title: string, subtitle: string, sessionCount: number) => (
    <div className={styles.sectionHeader}>
      <div>
        <h2 className={styles.sectionTitle}>{title}</h2>
        <p className={styles.sectionSubtitle}>
          {subtitle} • <strong>{sessionCount} séances</strong>
        </p>
      </div>
    </div>
  );

  return (
    <div className={`${styles.container} ${isTutor ? styles.tutorPage : styles.studentPage}`}>
      {/* En-tête */}
      <header className={styles.header}>
        <h1 className={styles.title}>
          {isTutor ? 'Mes Cours' : 'Mes Séances'}
        </h1>
        <p className={styles.subtitle}>
          {isTutor 
            ? 'Gérez vos séances de tutorat, consultez vos statistiques et suivez la progression de vos élèves'
            : 'Suivez vos prochaines séances, consultez votre historique et gérez vos réservations'
          }
        </p>
      </header>
      
      {/* Navigation par onglets */}
      <div className={styles.tabsContainer}>
        <button 
          className={`${styles.tabButton} ${activeTab === 'upcoming' ? styles.active : ''}`}
          onClick={() => setActiveTab('upcoming')}
        >
          À Venir
          <span className={styles.tabBadge}>{upcomingSessions.length}</span>
        </button>
        <button 
          className={`${styles.tabButton} ${activeTab === 'past' ? styles.active : ''}`}
          onClick={() => setActiveTab('past')}
        >
          Passés
          <span className={styles.tabBadge}>{pastSessions.length}</span>
        </button>
      </div>
      
      {/* Section Cours à Venir */}
      <div className={`${styles.sectionContainer} ${activeTab === 'upcoming' ? styles.active : ''}`}>
        <section className={styles.upcomingSection}>
          {renderSectionHeader(
            "Cours à Venir",
            "Vos prochaines séances programmées",
            upcomingSessions.length
          )}
          
          <div className={styles.sessionsGrid}>
            {upcomingSessions.length > 0 ? (
              upcomingSessions.map(session => renderSessionCard(session, false))
            ) : (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📅</div>
                <h3 className={styles.emptyTitle}>Aucune séance à venir</h3>
                <p className={styles.emptyText}>
                  Vous n'avez pas de séances programmées pour le moment.
                  {isTutor 
                    ? ' Créez des annonces pour attirer de nouveaux élèves !'
                    : ' Trouvez un tuteur pour vos prochaines révisions !'
                  }
                </p>
                <button className={`${styles.actionButton} ${styles.primaryButton}`}>
                  <span>🔍</span>
                  {isTutor ? 'Créer une annonce' : 'Trouver un tuteur'}
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
      
      {/* Section Cours Passés */}
      <div className={`${styles.sectionContainer} ${activeTab === 'past' ? styles.active : ''}`}>
        <section className={styles.pastSection}>
          {renderSectionHeader(
            "Historique des Cours",
            "Consultez vos séances terminées et les retours",
            pastSessions.length
          )}
          
          <div className={styles.sessionsGrid}>
            {pastSessions.length > 0 ? (
              pastSessions.map(session => renderSessionCard(session, true))
            ) : (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📚</div>
                <h3 className={styles.emptyTitle}>Aucun cours passé</h3>
                <p className={styles.emptyText}>
                  Vous n'avez pas encore terminé de séances.
                  {isTutor 
                    ? ' Vos futurs cours apparaîtront ici une fois terminés.'
                    : ' Vos séances à venir apparaîtront ici une fois terminées.'
                  }
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

// Composants séparés pour chaque rôle
export const TutorSessionsPage: FC = () => <SessionsPage userRole="tutor" />;
export const StudentSessionsPage: FC = () => <SessionsPage userRole="student" />;

export default SessionsPage;