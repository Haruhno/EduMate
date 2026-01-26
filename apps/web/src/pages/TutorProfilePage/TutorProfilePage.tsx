import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import styles from './TutorProfilePage.module.css';
import tutorService from '../../services/tutorService';
import annonceService from '../../services/annonceService';
import authService from '../../services/authService';
import type { TutorFromDB } from '../../services/tutorService';
import type { AnnonceFromDB } from '../../services/annonceService';

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
  userId?: string; // Ajout de l'ID de l'utilisateur
}

interface Diploma {
  id: string;
  educationLevel: string;
  field: string;
  school: string;
  country: string;
  startYear: number;
  endYear: number | null;
  isCurrent: boolean;
  diplomaFile?: {
    name: string;
    path: string;
    size: number;
  } | null;
}

interface Experience {
  id: string;
  jobTitle: string;
  employmentType: string;
  company: string;
  location: string;
  startMonth: string;
  startYear: number;
  endMonth: string;
  endYear: number | null;
  isCurrent: boolean;
  description: string;
} 

const TutorProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [tutor, setTutor] = useState<Tutor | null>(null);
  const [user, setUser] = useState<any>(null);
  const [diplomas, setDiplomas] = useState<Diploma[]>([]);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [annonces, setAnnonces] = useState<AnnonceFromDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'about' | 'annonces' | 'reviews'>('about');
  const [minPrice, setMinPrice] = useState<number>(0);
  const [errorType, setErrorType] = useState<'not_found' | 'unverified' | null>(null);

  const annonceIdFromState = location.state?.annonceId;

  const formatYearRange = (startYear: number, endYear: number | null, isCurrent: boolean) => {
    if (isCurrent) {
      return `${startYear} - En cours`;
    }
    return endYear ? `${startYear} - ${endYear}` : `${startYear}`;
  };

  const formatExperiencePeriod = (startMonth: string, startYear: number, endMonth: string, endYear: number | null, isCurrent: boolean) => {
    if (isCurrent) {
      return `${startMonth} ${startYear} - En cours`;
    }
    return `${startMonth} ${startYear} - ${endMonth} ${endYear}`;
  };

  // Vérifier le nombre d'éléments
  const hasMultipleDiplomas = diplomas.length > 1;
  const hasSingleDiploma = diplomas.length === 1;
  const hasMultipleExperiences = experiences.length > 1;
  const hasSingleExperience = experiences.length === 1;
  const hasDiplomas = diplomas.length > 0;
  const hasExperiences = experiences.length > 0;

  // Vérifier si l'utilisateur courant est le tuteur lui-même
  const isCurrentUserTutor = () => {
    console.log('Debug - isCurrentUserTutor appelé');
    console.log('Debug - user:', user);
    console.log('Debug - tutor:', tutor);
    
    if (!user || !tutor) {
      console.log('Debug - user ou tutor est null');
      return false;
    }
    
    // Vérifier l'ID de l'utilisateur courant
    const currentUserId = user.id;
    const tutorUserId = tutor.userId; // ID de l'utilisateur associé au tuteur
    
    console.log('Debug - currentUserId:', currentUserId);
    console.log('Debug - tutorUserId:', tutorUserId);
    
    // Comparer les IDs d'utilisateur
    const isSameUser = currentUserId && tutorUserId && currentUserId === tutorUserId;
    
    console.log('Debug - isSameUser:', isSameUser);
    
    return isSameUser;
  };

  useEffect(() => {
    const loadUser = async () => {
      try {
        // Méthode 1: Vérifier si l'utilisateur est stocké dans le localStorage
        const userData = localStorage.getItem('user');
        if (userData) {
          setUser(JSON.parse(userData));
        }
        
        // Méthode 2: Utiliser authService pour récupérer l'utilisateur
        const currentUser = authService.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          console.log('Debug - Utilisateur chargé via authService:', currentUser);
        }
      } catch (error) {
        console.error('Erreur lors du chargement de l\'utilisateur:', error);
      }
    };

    loadUser();
  }, []);

  const mapTutorFromDB = (tutorData: TutorFromDB): Tutor => {
    const availability = typeof tutorData.availability === 'string' 
      ? JSON.parse(tutorData.availability) 
      : tutorData.availability;
    
    console.log('Debug - tutorData.user:', tutorData.user);
    
    return {
      id: tutorData.id,
      name: `${tutorData.user?.firstName || ''} ${tutorData.user?.lastName || ''}`.trim() || 'Tuteur Expert',
      subject: tutorData.specialties?.[0] || 'Tutorat général',
      rating: tutorData.rating || 4,
      reviews: tutorData.reviewsCount || 0,
      price: `À partir de ${minPrice || 30}`,
      status: availability?.online ? "En ligne" : "Disponible",
      emoji: "👨‍🏫",
      badge: getBadgeFromRating(tutorData.rating || 4),
      specialties: tutorData.specialties || [],
      gradient: getGradientFromSpecialties(tutorData.specialties || []),
      bio: tutorData.bio,
      experience: tutorData.experience,
      educationLevel: tutorData.educationLevel,
      profilePicture: tutorData.profilePicture,
      userId: tutorData.user?.id // Stocker l'ID de l'utilisateur associé
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
        
        console.log('Debug - Chargement du tuteur avec ID:', id);
        
        const tutorResponse = await tutorService.getTutorById(id);
        
        console.log('Debug - Réponse du tuteur:', tutorResponse);
        
        if (tutorResponse.success && tutorResponse.data) {
          
          const profileTutorId = tutorResponse.data.id;
          
          // Charger les annonces
          const annoncesResponse = await annonceService.getAnnoncesByTutor(profileTutorId);

          let calculatedMinPrice = 30;
          
          if (annoncesResponse.success && annoncesResponse.data.length > 0) {
            setAnnonces(annoncesResponse.data);
            const prices = annoncesResponse.data.map((a: AnnonceFromDB) => a.hourlyRate);
            calculatedMinPrice = Math.min(...prices);
          }
          
          setMinPrice(calculatedMinPrice);
          
          // Mapper le tuteur
          const mappedTutor = mapTutorFromDB(tutorResponse.data);
          mappedTutor.price = `À partir de ${calculatedMinPrice}`;
          
          setTutor(mappedTutor);
          
          // Charger les diplômes et expériences depuis la réponse du tuteur
          const tutorData = tutorResponse.data as any;
          
          if (tutorData.diplomas && Array.isArray(tutorData.diplomas)) {
            setDiplomas(tutorData.diplomas);
          } else {
            setDiplomas([]);
          }
          
          if (tutorData.experiences && Array.isArray(tutorData.experiences)) {
            setExperiences(tutorData.experiences);
          } else {
            setExperiences([]);
          }
          
        } else {
          console.log('❌ Tuteur non trouvé');
          setTutor(null);
          if (tutorResponse.existsButUnverified) {
            setErrorType('unverified');
          } else {
            setErrorType('not_found');
          }
        }
      } catch (error) {
        console.error('Erreur lors du chargement du tuteur:', error);
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
    if (isCurrentUserTutor()) {
      console.log('❌ Impossible de réserver avec soi-même');
      return;
    }

    const targetAnnonceId = annonceId || annonceIdFromState;

    const tutorProfileId = tutor?.id || undefined;
    
    if (tutorProfileId) {
      navigate(`/booking/${tutorProfileId}`, {
        state: {
          annonceId: targetAnnonceId || undefined, 
          tutorId: tutorProfileId
        }
      });
    } else {
      console.warn('Aucun id de profil tuteur disponible pour la réservation');
    }
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

  // Vérifier si l'utilisateur est le tuteur
  const isSelf = isCurrentUserTutor();
  console.log('Debug - Rendu, isSelf:', isSelf);

  return (
    <div className={styles.tutorProfilePage}>
      <div className={styles.container}>
        <div className={styles.headerContent}>
          <h1 className={styles.headerTitle}>Profil du Tuteur</h1>
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
                <span className={styles.price}>{tutor.price}🪙</span>
                <span className={styles.priceLabel}>par heure</span>
              </div>
              
              <div className={styles.actionButtons}>
                <button 
                  onClick={() => handleBookSession()}
                  className={`${styles.primaryButton} ${isSelf ? styles.disabledButton : ''}`}
                  disabled={isSelf}
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
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle1}>
                    <svg className={styles.sectionIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    À propos
                  </h3>
                  <p className={styles.bio}>
                    {tutor.bio || `${tutor.name} est un tuteur passionné spécialisé en ${tutor.subject}. Avec une approche pédagogique adaptée à chaque élève, il/elle s'engage à vous faire progresser et atteindre vos objectifs.`}
                  </p>

                  {/* Section Diplômes */}
                  {hasDiplomas && (
                    <div className={styles.section}>
                      <h3 className={styles.sectionTitle2}>
                        <svg className={styles.sectionIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path d="M12 14l9-5-9-5-9 5 9 5z" />
                          <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                        </svg>
                        {hasSingleDiploma ? 'Diplôme' : 'Diplômes'}
                      </h3>
                      
                      {hasSingleDiploma ? (
                        <div className={styles.infoGrid}>
                          {diplomas[0].educationLevel && (
                            <div className={styles.infoItem}>
                              <label>
                                <svg className={styles.infoIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path d="M12 14l9-5-9-5-9 5 9 5z" />
                                  <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                                </svg>
                                Niveau d'étude
                              </label>
                              <p>{diplomas[0].educationLevel}</p>
                            </div>
                          )}
                          {diplomas[0].field && (
                            <div className={styles.infoItem}>
                              <label>
                                <svg className={styles.infoIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Domaine
                              </label>
                              <p>{diplomas[0].field}</p>
                            </div>
                          )}
                          {diplomas[0].school && (
                            <div className={styles.infoItem}>
                              <label>
                                <svg className={styles.infoIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                                Établissement
                              </label>
                              <p>{diplomas[0].school}</p>
                            </div>
                          )}
                          {diplomas[0].country && (
                            <div className={styles.infoItem}>
                              <label>
                                <svg className={styles.infoIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                Pays
                              </label>
                              <p>{diplomas[0].country}</p>
                            </div>
                          )}
                          {diplomas[0].startYear && (
                            <div className={styles.infoItem}>
                              <label>
                                <svg className={styles.infoIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                Période
                              </label>
                              <p>
                                {formatYearRange(diplomas[0].startYear, diplomas[0].endYear, diplomas[0].isCurrent)}
                              </p>
                            </div>
                          )}
                          {diplomas[0].diplomaFile && (
                            <div className={styles.infoItem}>
                              <label>
                                <svg className={styles.infoIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                                </svg>
                                Diplôme
                              </label>
                              <a 
                                href={diplomas[0].diplomaFile.path} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className={styles.fileLink}
                              >
                                📎 {diplomas[0].diplomaFile.name}
                              </a>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className={styles.diplomasList}>
                          {diplomas.map((diploma, index) => (
                            <div key={diploma.id || index} className={styles.diplomaItem}>
                              <div className={styles.diplomaHeader}>
                                <h4 className={styles.diplomaTitle}>{diploma.educationLevel}</h4>
                                <span className={styles.diplomaPeriod}>
                                  {formatYearRange(diploma.startYear, diploma.endYear, diploma.isCurrent)}
                                </span>
                              </div>
                              <div className={styles.diplomaDetails}>
                                <p className={styles.diplomaField}><strong>Domaine:</strong> {diploma.field}</p>
                                <p className={styles.diplomaSchool}><strong>Établissement:</strong> {diploma.school}</p>
                                <p className={styles.diplomaCountry}><strong>Pays:</strong> {diploma.country}</p>
                              </div>
                              {diploma.diplomaFile && (
                                <div className={styles.diplomaFile}>
                                  <a 
                                    href={diploma.diplomaFile.path} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className={styles.fileLink}
                                  >
                                    📎 {diploma.diplomaFile.name}
                                  </a>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Section Expériences */}
                  {hasExperiences && (
                    <div className={styles.section}>
                      <h3 className={styles.sectionTitle3}>
                        <svg className={styles.sectionIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        {hasSingleExperience ? 'Expérience professionnelle' : 'Expériences professionnelles'}
                      </h3>
                      
                      {hasSingleExperience ? (
                        <div className={styles.infoGrid}>
                          {experiences[0].jobTitle && (
                            <div className={styles.infoItem}>
                              <label>
                                <svg className={styles.infoIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                Poste
                              </label>
                              <p>{experiences[0].jobTitle}</p>
                            </div>
                          )}
                          {experiences[0].company && (
                            <div className={styles.infoItem}>
                              <label>
                                <svg className={styles.infoIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                                Entreprise
                              </label>
                              <p>{experiences[0].company}</p>
                            </div>
                          )}
                          {experiences[0].employmentType && (
                            <div className={styles.infoItem}>
                              <label>
                                <svg className={styles.infoIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                Type d'emploi
                              </label>
                              <p>{experiences[0].employmentType}</p>
                            </div>
                          )}
                          {experiences[0].location && (
                            <div className={styles.infoItem}>
                              <label>
                                <svg className={styles.infoIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                Lieu
                              </label>
                              <p>{experiences[0].location}</p>
                            </div>
                          )}
                          {experiences[0].startYear && (
                            <div className={styles.infoItem}>
                              <label>
                                <svg className={styles.infoIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                Période
                              </label>
                              <p>
                                {formatExperiencePeriod(
                                  experiences[0].startMonth, 
                                  experiences[0].startYear, 
                                  experiences[0].endMonth, 
                                  experiences[0].endYear, 
                                  experiences[0].isCurrent
                                )}
                              </p>
                            </div>
                          )}
                          {experiences[0].description && (
                            <div className={styles.infoItem}>
                              <label>
                                <svg className={styles.infoIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Description
                              </label>
                              <div className={styles.experienceDescription}>
                                <div className={styles.experienceDescriptionText}>{experiences[0].description}</div>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className={styles.experiencesList}>
                          {experiences.map((experience, index) => (
                            <div key={experience.id || index} className={styles.experienceItem}>
                              <div className={styles.experienceHeader}>
                                <h4 className={styles.experienceTitle}>{experience.jobTitle}</h4>
                                <span className={styles.experiencePeriod}>
                                  {formatExperiencePeriod(
                                    experience.startMonth, 
                                    experience.startYear, 
                                    experience.endMonth, 
                                    experience.endYear, 
                                    experience.isCurrent
                                  )}
                                </span>
                              </div>
                              <div className={styles.experienceDetails}>
                                <p className={styles.experienceCompany}><strong>Entreprise:</strong> {experience.company}</p>
                                <p className={styles.experienceType}><strong>Type d'emploi:</strong> {experience.employmentType}</p>
                                <p className={styles.experienceLocation}><strong>Lieu:</strong> {experience.location}</p>
                              </div>
                              {experience.description && (
                                <div className={styles.experienceDescription}>
                                  <p className={styles.experienceDescriptionText}>{experience.description}</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'annonces' && (
                <div className={styles.annoncesSection}>
                  <div className={styles.annoncesHeader}>
                    <h3 className={styles.annoncesTitle}>
                      Mes Annonces de Cours
                    </h3>
                  </div>

                  {annonces.length > 0 ? (
                    <div className={styles.annoncesGrid}>
                      {annonces.map((annonce: AnnonceFromDB) => (
                        <div key={annonce.id} className={styles.annonceCard}>
                          <div className={styles.annonceHeader}>
                            <div className={styles.annonceTitleSection}>
                              <h4 className={styles.annonceTitle}>Cours de <span className={styles.subjectHighlight}>{annonce.subject}</span></h4>
                            </div>
                            <div className={annonce.hourlyRate > 50 ? styles.annoncePricePremium : styles.annoncePrice}>
                              <span className={styles.priceValue}>{annonce.hourlyRate}</span>
                              <span className={styles.priceCurrency}>🪙/heure</span>
                            </div>
                          </div>

                          <div className={styles.annonceDetails}>
                            <div className={styles.detailItem}>
                              <span className={styles.detailIcon}>🎯</span>
                              <div className={styles.detailContent}>
                                <span className={styles.detailLabel}>Niveau</span>
                                <span className={styles.detailValue}>{annonce.level}</span>
                              </div>
                            </div>
                            <div className={styles.detailItem}>
                              <span className={styles.detailIcon}>💻</span>
                              <div className={styles.detailContent}>
                                <span className={styles.detailLabel}>Mode</span>
                                <span className={styles.detailValue}>{annonce.teachingMode}</span>
                              </div>
                            </div>
                            <div className={styles.detailItem}>
                              <span className={styles.detailIcon}>⏱️</span>
                              <div className={styles.detailContent}>
                                <span className={styles.detailLabel}>Durée</span>
                                <span className={styles.detailValue}>60 min</span>
                              </div>
                            </div>
                            <div className={styles.detailItem}>
                              <span className={styles.detailIcon}>⭐</span>
                              <div className={styles.detailContent}>
                                <span className={styles.detailLabel}>Disponibilité</span>
                                <span className={styles.detailValue}>Immédiate</span>
                              </div>
                            </div>
                          </div>

                          <button 
                            onClick={() => handleBookSession(annonce.id)}
                            className={`${styles.reserveButton} ${isSelf ? styles.disabledButton : ''}`}
                            disabled={isSelf}
                          >
                            <span className={styles.buttonText}>
                              {isSelf ? 'Mon annonce' : 'Réserver ce cours →'}
                            </span>
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={styles.noAnnonces}>
                      <div className={styles.noAnnoncesIcon}>📭</div>
                      <h4 className={styles.noAnnoncesTitle}>Aucune annonce disponible</h4>
                      <p className={styles.noAnnoncesText}>
                        Ce tuteur n'a pas encore publié d'annonces. 
                        Contactez-le directement pour discuter d'un cours personnalisé.
                      </p>
                      <button 
                        onClick={handleContact}
                        className={styles.contactButton}
                      >
                        <span className={styles.contactIcon}>💬</span>
                        Contacter le tuteur
                      </button>
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