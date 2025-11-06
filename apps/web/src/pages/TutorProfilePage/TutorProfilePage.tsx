import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styles from './TutorProfilePage.module.css';
import tutorService from '../../services/tutorService';
import type { Tutor } from '../TutorSearchPage/TutorSearchPage';
import type { TutorFromDB } from '../../services/tutorService';

const TutorProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tutor, setTutor] = useState<Tutor | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'about' | 'reviews' | 'schedule'>('about');

  const mapTutorFromDB = (tutor: TutorFromDB): Tutor => {
    const availability = typeof tutor.availability === 'string' 
      ? JSON.parse(tutor.availability) 
      : tutor.availability;
    
    return {
      id: tutor.id,
      name: `${tutor.user?.firstName || ''} ${tutor.user?.lastName || ''}`.trim() || 'Tuteur Expert',
      subject: tutor.specialties?.[0] || 'Tutorat général',
      rating: tutor.rating || 4,
      reviews: tutor.reviewsCount || 0,
      price: `€${tutor.hourlyRate || 30}`,
      status: availability?.online ? "En ligne" : "Disponible",
      emoji: "👨‍🏫",
      badge: getBadgeFromRating(tutor.rating || 4),
      specialties: tutor.specialties || [],
      gradient: getGradientFromSpecialties(tutor.specialties || []),
      bio: tutor.bio,
      experience: tutor.experience,
      educationLevel: tutor.educationLevel,
      profilePicture: tutor.profilePicture
    };
  };

  const getBadgeFromRating = (rating: number): string => {
    if (rating >= 4.8) return "Expert";
    if (rating >= 4.5) return "Populaire";
    if (rating >= 4.0) return "Nouveau";
    return "Free Trial";
  };

  const getGradientFromSpecialties = (specialties: string[]): string => {
    const scienceSubjects = ['Physique', 'Chimie', 'SVT', 'Biologie', 'Mécanique'];
    const mathSubjects = ['Mathématiques', 'Algèbre', 'Géométrie', 'Analyse', 'Statistiques'];
    const languageSubjects = ['Français', 'Anglais', 'Espagnol', 'Allemand', 'Italien'];
    
    if (specialties.some(s => scienceSubjects.includes(s))) return "science-gradient";
    if (specialties.some(s => mathSubjects.includes(s))) return "math-gradient";
    if (specialties.some(s => languageSubjects.includes(s))) return "language-gradient";
    
    return "default-gradient";
  };

  useEffect(() => {
    const fetchTutorProfile = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const response = await tutorService.getTutorById(id);
        if (response.success && response.data) {
          const mappedTutor = mapTutorFromDB(response.data);
          setTutor(mappedTutor);
        } else {
          setTutor(null);
        }
      } catch (error) {
        console.error('Erreur lors du chargement du profil:', error);
        setTutor(null);
      } finally {
        setLoading(false);
      }
    };

    fetchTutorProfile();
  }, [id]);

  const handleContact = () => {
    console.log('Contacter le tuteur:', tutor?.id);
  };

  const handleBookSession = () => {
    console.log('Réserver avec le tuteur:', tutor?.id);
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.loadingSpinner}></div>
          <p>Chargement du profil...</p>
        </div>
      </div>
    );
  }

  if (!tutor) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h2>Tuteur non trouvé</h2>
          <p>Le profil que vous recherchez n'existe pas ou a été supprimé.</p>
          <button 
            onClick={() => navigate('/recherche-tuteur')}
            className={styles.primaryButton}
          >
            Retour à la recherche
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.tutorProfilePage}>
      <div className={styles.header}>
        <div className={styles.container}>
          <div className={styles.headerContent}>
            <button 
              onClick={() => navigate('/recherche-tuteur')}
              className={styles.backButton}
            >
              ← Retour aux résultats
            </button>
            <h1 className={styles.headerTitle}>Profil du Tuteur</h1>
          </div>
        </div>
      </div>

      <div className={styles.container}>
        <div className={styles.profileLayout}>
          {/* Sidebar */}
          <div className={styles.sidebar}>
            <div className={styles.profileCard}>
              <div className={`${styles.avatar} ${styles[tutor.gradient]}`}>
                {tutor.profilePicture ? (
                  <img src={tutor.profilePicture} alt={tutor.name} className={styles.avatarImage} />
                ) : (
                  <span className={styles.avatarFallback}>
                    {tutor.name.split(' ').map(n => n[0]).join('')}
                  </span>
                )}
                <div className={styles.statusIndicator}>
                  <span className={`${styles.statusDot} ${tutor.status === 'En ligne' ? styles.online : styles.available}`}></span>
                </div>
              </div>
              
              <div className={styles.profileHeader}>
                <h2>{tutor.name}</h2>
                <p className={styles.subject}>{tutor.subject}</p>
                <div className={styles.badge}>{tutor.badge}</div>
              </div>

              <div className={styles.ratingSection}>
                <div className={styles.rating}>
                  <div className={styles.stars}>
                    {'★'.repeat(5).split('').map((star, index) => (
                      <span 
                        key={index} 
                        className={`${styles.star} ${index < Math.floor(tutor.rating) ? styles.filled : ''}`}
                      >
                        {star}
                      </span>
                    ))}
                  </div>
                  <div className={styles.ratingInfo}>
                    <span className={styles.ratingValue}>{tutor.rating}</span>
                    <span className={styles.reviews}>({tutor.reviews} avis)</span>
                  </div>
                </div>
              </div>

              <div className={styles.priceSection}>
                <span className={styles.price}>{tutor.price}</span>
                <span className={styles.priceLabel}>par heure</span>
              </div>

              <div className={styles.actionButtons}>
                <button 
                  onClick={handleBookSession}
                  className={styles.primaryButton}
                >
                  Réserver un cours
                </button>
                <button 
                  onClick={handleContact}
                  className={styles.secondaryButton}
                >
                  Contacter
                </button>
              </div>

              <div className={styles.statsGrid}>
                <div className={styles.statItem}>
                  <div className={styles.statValue}>{tutor.experience?.split(' ')[0] || '2+'}</div>
                  <div className={styles.statLabel}>ans d'exp.</div>
                </div>
                <div className={styles.statItem}>
                  <div className={styles.statValue}>{tutor.reviews}+</div>
                  <div className={styles.statLabel}>élèves</div>
                </div>
                <div className={styles.statItem}>
                  <div className={styles.statValue}>98%</div>
                  <div className={styles.statLabel}>satisfaction</div>
                </div>
              </div>
            </div>
          </div>

          {/* Contenu principal */}
          <div className={styles.mainContent}>
            <div className={styles.tabNavigation}>
              <button 
                className={`${styles.tab} ${activeTab === 'about' ? styles.active : ''}`}
                onClick={() => setActiveTab('about')}
              >
                Présentation
              </button>
              <button 
                className={`${styles.tab} ${activeTab === 'reviews' ? styles.active : ''}`}
                onClick={() => setActiveTab('reviews')}
              >
                Avis ({tutor.reviews})
              </button>
              <button 
                className={`${styles.tab} ${activeTab === 'schedule' ? styles.active : ''}`}
                onClick={() => setActiveTab('schedule')}
              >
                Disponibilités
              </button>
            </div>

            <div className={styles.tabContent}>
              {activeTab === 'about' && (
                <div className={styles.aboutSection}>
                  <div className={styles.section}>
                    <h3>À propos</h3>
                    <p className={styles.bio}>
                      {tutor.bio || `${tutor.name} est un tuteur passionné spécialisé en ${tutor.subject}. Avec une approche pédagogique adaptée à chaque élève, il/elle s'engage à vous faire progresser et atteindre vos objectifs.`}
                    </p>
                  </div>

                  <div className={styles.section}>
                    <h4>Domaines d'expertise</h4>
                    <div className={styles.specialtiesGrid}>
                      {tutor.specialties.map((specialty, index) => (
                        <span key={index} className={styles.specialtyTag}>
                          {specialty}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className={styles.detailsGrid}>
                    <div className={styles.detailCard}>
                      <h5>Parcours</h5>
                      <p>{tutor.experience || `Expérience solide dans l'enseignement avec résultats démontrés`}</p>
                    </div>
                    <div className={styles.detailCard}>
                      <h5>Niveau d'étude</h5>
                      <p>{tutor.educationLevel || 'Diplôme universitaire'}</p>
                    </div>
                  </div>

                  <div className={styles.section}>
                    <h4>Méthode pédagogique</h4>
                    <div className={styles.methodologyList}>
                      <div className={styles.methodItem}>
                        <div>
                          <strong>Objectifs personnalisés</strong>
                          <p>Programme adapté à vos besoins spécifiques</p>
                        </div>
                      </div>
                      <div className={styles.methodItem}>
                        <div>
                          <strong>Suivi régulier</strong>
                          <p>Évaluations et retours constants sur votre progression</p>
                        </div>
                      </div>
                      <div className={styles.methodItem}>
                        <div>
                          <strong>Pédagogie active</strong>
                          <p>Apprentissage par la pratique et l'échange</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'reviews' && (
                <div className={styles.reviewsSection}>
                  <div className={styles.reviewsHeader}>
                    <div className={styles.ratingOverview}>
                      <div className={styles.overallScore}>
                        <div className={styles.score}>{tutor.rating}</div>
                        <div className={styles.scoreStars}>
                          {'★'.repeat(5).split('').map((star, index) => (
                            <span 
                              key={index} 
                              className={`${styles.star} ${index < Math.floor(tutor.rating) ? styles.filled : ''}`}
                            >
                              {star}
                            </span>
                          ))}
                        </div>
                        <div className={styles.totalReviews}>{tutor.reviews} avis</div>
                      </div>
                    </div>
                  </div>

                  <div className={styles.reviewsList}>
                    <div className={styles.reviewCard}>
                      <div className={styles.reviewHeader}>
                        <div className={styles.reviewerInfo}>
                          <div className={styles.reviewerAvatar}>ML</div>
                          <div>
                            <div className={styles.reviewerName}>Marie L.</div>
                            <div className={styles.reviewDate}>Il y a 2 semaines</div>
                          </div>
                        </div>
                        <div className={styles.reviewRating}>★ 5.0</div>
                      </div>
                      <p className={styles.reviewText}>
                        Excellent professeur ! Très patient et pédagogue. Mes progrès en mathématiques sont remarquables depuis que je prends des cours avec lui.
                      </p>
                    </div>

                    <div className={styles.reviewCard}>
                      <div className={styles.reviewHeader}>
                        <div className={styles.reviewerInfo}>
                          <div className={styles.reviewerAvatar}>TP</div>
                          <div>
                            <div className={styles.reviewerName}>Thomas P.</div>
                            <div className={styles.reviewDate}>Il y a 1 mois</div>
                          </div>
                        </div>
                        <div className={styles.reviewRating}>★ 4.5</div>
                      </div>
                      <p className={styles.reviewText}>
                        Cours très structurés et adaptés à mes besoins. Les explications sont claires et les exercices pertinents. Je recommande vivement !
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'schedule' && (
                <div className={styles.scheduleSection}>
                  <div className={styles.scheduleHeader}>
                    <h3>Disponibilités</h3>
                    <p>Sélectionnez un créneau pour réserver votre cours</p>
                  </div>

                  <div className={styles.scheduleOverview}>
                    <div className={styles.availabilityCard}>
                      <div>
                        <strong>Prochaine disponibilité</strong>
                        <p><strong>Demain à 14h00</strong></p>
                      </div>
                    </div>
                    <div className={styles.availabilityCard}>
                      <div>
                        <strong>Créneaux habituels</strong>
                        <p><strong>Lun - Ven, 14h-20h</strong></p>
                      </div>
                    </div>
                  </div>

                  <div className={styles.calendarSection}>
                    <h4>Calendrier de la semaine</h4>
                    <div className={styles.calendarGrid}>
                      {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day, index) => (
                        <div key={day} className={styles.calendarDay}>
                          <div className={styles.dayHeader}>{day}</div>
                          <div className={styles.timeSlots}>
                            {index < 5 && (
                              <>
                                <div className={styles.timeSlot}>14:00</div>
                                <div className={styles.timeSlot}>16:00</div>
                                <div className={styles.timeSlot}>18:00</div>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button className={styles.primaryButton}>
                    Voir le calendrier complet
                  </button>
                </div>
              )}    
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TutorProfilePage;    