import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styles from './TutorProfilePage.module.css';
import tutorService from '../../services/tutorService';
import annonceService from '../../services/annonceService';
import type { TutorFromDB } from '../../services/tutorService';
import type { AnnonceFromDB } from '../../services/annonceService';

// Interface Tutor locale
interface Tutor {
  id: string;
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
  bio?: string;
  experience?: string;
  educationLevel?: string;
  profilePicture?: string;
}

const TutorProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tutor, setTutor] = useState<Tutor | null>(null);
  const [annonces, setAnnonces] = useState<AnnonceFromDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'about' | 'annonces' | 'reviews'>('about');
  const [minPrice, setMinPrice] = useState<number>(0);
  const [errorType, setErrorType] = useState<'not_found' | 'unverified' | null>(null);

  const mapTutorFromDB = (tutorData: TutorFromDB): Tutor => {
    const availability = typeof tutorData.availability === 'string' 
      ? JSON.parse(tutorData.availability) 
      : tutorData.availability;
    
    return {
      id: tutorData.id,
      name: `${tutorData.user?.firstName || ''} ${tutorData.user?.lastName || ''}`.trim() || 'Tuteur Expert',
      subject: tutorData.specialties?.[0] || 'Tutorat général',
      rating: tutorData.rating || 4,
      reviews: tutorData.reviewsCount || 0,
      price: `À partir de €${minPrice || 30}`,
      status: availability?.online ? "En ligne" : "Disponible",
      emoji: "👨‍🏫",
      badge: getBadgeFromRating(tutorData.rating || 4),
      specialties: tutorData.specialties || [],
      gradient: getGradientFromSpecialties(tutorData.specialties || []),
      bio: tutorData.bio,
      experience: tutorData.experience,
      educationLevel: tutorData.educationLevel,
      profilePicture: tutorData.profilePicture
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
    
    if (specialties.some((s: string) => scienceSubjects.includes(s))) return "science-gradient";
    if (specialties.some((s: string) => mathSubjects.includes(s))) return "math-gradient";
    if (specialties.some((s: string) => languageSubjects.includes(s))) return "language-gradient";
    
    return "default-gradient";
  };

  // Fonction pour retourner à la page précédente
  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/recherche-tuteur');
    }
  };

  useEffect(() => {
    const fetchTutorData = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        setErrorType(null);
        
        // Utiliser la méthode getTutorById qui existe
        const tutorResponse = await tutorService.getTutorById(id);
        
        if (tutorResponse.success && tutorResponse.data) {
          const profileTutorId = tutorResponse.data.id;
          const annoncesResponse = await annonceService.getAnnoncesByTutor(profileTutorId);

          let calculatedMinPrice = 30;
          
          if (annoncesResponse.success && annoncesResponse.data.length > 0) {
            setAnnonces(annoncesResponse.data);
            const prices = annoncesResponse.data.map((a: AnnonceFromDB) => a.hourlyRate);
            calculatedMinPrice = Math.min(...prices);
          }
          
          setMinPrice(calculatedMinPrice);
          
          const mappedTutor = mapTutorFromDB(tutorResponse.data);
          mappedTutor.price = `À partir de €${calculatedMinPrice}`;
          
          setTutor(mappedTutor);
        } else {
          setTutor(null);
          // Détection améliorée du type d'erreur - utiliser existsButUnverified
          if (tutorResponse.existsButUnverified) {
            // Le profil existe mais n'est pas vérifié/complété
            setErrorType('unverified');
          } else {
            setErrorType('not_found');
          }
        }
      } catch (error) {
        console.error('Erreur lors du chargement du profil:', error);
        setTutor(null);
        setErrorType('not_found');
      } finally {
        setLoading(false);
      }
    };

    fetchTutorData();
  }, [id]);

  const handleContact = () => {
    console.log('Contacter le tuteur:', tutor?.id);
  };

  const handleBookSession = (annonceId?: string) => {
    console.log('Réserver avec le tuteur:', tutor?.id, 'Annonce:', annonceId);
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
          {errorType === 'unverified' ? (
            <>
              <div className={styles.unverifiedHeader}>
                <div className={styles.unverifiedIcon}>⏳</div>
                <h2>Profil en cours de validation</h2>
              </div>
              <p>Ce profil de tuteur n'est pas encore vérifié ou complété.</p>
              <div className={styles.unverifiedDetails}>
                <p>Le profil est actuellement :</p>
                <div className={styles.statusList}>
                  <div className={styles.statusItem}>
                    <span className={styles.statusIcon}>📝</span>
                    <span>En attente de vérification</span>
                  </div>
                  <div className={styles.statusItem}>
                    <span className={styles.statusIcon}>⏰</span>
                    <span>Validation en cours</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className={styles.notFoundHeader}>
                <div className={styles.notFoundIcon}>🔍</div>
                <h2>Tuteur non trouvé</h2>
              </div>
              <p>Le profil que vous recherchez n'existe pas ou a été supprimé.</p>
            </>
          )}
          
          <div className={styles.errorActions}>
            <button 
              onClick={handleGoBack}
              className={styles.primaryButton}
            >
              ← Retour
            </button>
          </div>
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
              onClick={handleGoBack}
              className={styles.backButton}
            >
              ← Retour
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
                    {tutor.name.split(' ').map((n: string) => n[0]).join('')}
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
                    {'★'.repeat(5).split('').map((star: string, index: number) => (
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
                  onClick={() => handleBookSession()}
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
                  <div className={styles.statValue}>{annonces.length}</div>
                  <div className={styles.statLabel}>annonces</div>
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
                className={`${styles.tab} ${activeTab === 'annonces' ? styles.active : ''}`}
                onClick={() => setActiveTab('annonces')}
              >
                Annonces ({annonces.length})
              </button>
              <button 
                className={`${styles.tab} ${activeTab === 'reviews' ? styles.active : ''}`}
                onClick={() => setActiveTab('reviews')}
              >
                Avis ({tutor.reviews})
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
                      {tutor.specialties.map((specialty: string, index: number) => (
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
                </div>
              )}

              {activeTab === 'annonces' && (
                <div className={styles.annoncesSection}>
                  <div className={styles.annoncesHeader}>
                    <h3>Mes annonces de cours</h3>
                    <p>Découvrez toutes mes offres de cours disponibles</p>
                  </div>

                  <div className={styles.annoncesGrid}>
                    {annonces.map((annonce: AnnonceFromDB) => (
                      <div key={annonce.id} className={styles.annonceCard}>
                        <div className={styles.annonceHeader}>
                          <h4>{annonce.title}</h4>
                          <div className={styles.annoncePrice}>€{annonce.hourlyRate}/heure</div>
                        </div>
                        <p className={styles.annonceDescription}>
                          {annonce.description}
                        </p>
                        <div className={styles.annonceDetails}>
                          <div className={styles.detail}>
                            <strong>Niveau:</strong> {annonce.level}
                          </div>
                          <div className={styles.detail}>
                            <strong>Mode:</strong> {annonce.teachingMode}
                          </div>
                          <div className={styles.detail}>
                            <strong>Matière:</strong> {annonce.subject}
                          </div>
                        </div>
                        <button 
                          onClick={() => handleBookSession(annonce.id)}
                          className={styles.reserveButton}
                        >
                          Réserver ce cours
                        </button>
                      </div>
                    ))}
                  </div>

                  {annonces.length === 0 && (
                    <div className={styles.noAnnonces}>
                      <p>Ce tuteur n'a pas encore d'annonces publiées.</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'reviews' && (
                <div className={styles.reviewsSection}>
                  <div className={styles.reviewsHeader}>
                    <div className={styles.ratingOverview}>
                      <div className={styles.overallScore}>
                        <div className={styles.score}>{tutor.rating}</div>
                        <div className={styles.scoreStars}>
                          {'★'.repeat(5).split('').map((star: string, index: number) => (
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TutorProfilePage;