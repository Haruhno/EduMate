import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './DashboardPage.module.css';
import profileService from '../../services/profileService';
import authService from '../../services/authService';
import annonceService from '../../services/annonceService';
import EditAnnonceForm from '../../components/EditAnnonceForm/EditAnnonceForm';
import type { AnnonceFromDB } from '../../services/annonceService';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profileStatus, setProfileStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [annonces, setAnnonces] = useState<AnnonceFromDB[]>([]);
  const [editingAnnonce, setEditingAnnonce] = useState<AnnonceFromDB | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const currentUser = authService.getCurrentUser();
        setUser(currentUser);

        if (currentUser) {  
          const statusResponse = await profileService.getProfileStatus();
          console.log('📊 Statut profil reçu:', statusResponse);
          setProfileStatus(statusResponse.data);
          
          // Charger les annonces si c'est un tuteur
          if (currentUser.role === 'tutor') {
            try {
              const annoncesResponse = await annonceService.getMyAnnonces();
              console.log('📚 Annonces reçues:', annoncesResponse);
              setAnnonces(annoncesResponse.data || []);
            } catch (error) {
              console.error('Erreur lors du chargement des annonces:', error);
              setAnnonces([]);
            }
          }
          
          // Debug: Vérifier aussi le profil complet
          const fullProfile = await profileService.getProfile();
          console.log('👤 Profil complet reçu:', fullProfile);
        }
      } catch (error) {
        console.error('Erreur lors du chargement du dashboard:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const handleCompleteProfile = () => {
    navigate('/completer-profil', {
      state: {
        role: user?.role,
        firstName: user?.firstName,
        lastName: user?.lastName,
        email: user?.email
      }
    });
  };

  const handleEditAnnonce = (annonce: AnnonceFromDB) => {
    setEditingAnnonce(annonce);
  };

  const handleCancelEdit = () => {
    setEditingAnnonce(null);
  };

  const handleUpdateAnnonce = (updatedAnnonce: AnnonceFromDB) => {
    setAnnonces(prev => prev.map(annonce => 
      annonce.id === updatedAnnonce.id ? updatedAnnonce : annonce
    ));
    setEditingAnnonce(null);
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Chargement du tableau de bord...</div>
      </div>
    );
  }

  const isTutor = user?.role === 'tutor';
  const isStudent = user?.role === 'student';
  const hasCompleteProfile = profileStatus?.isCompleted;
  console.log('isCompleted:', hasCompleteProfile);

  return (
    <div className={styles.container}>
      {/* En-tête de bienvenue */}
      <div className={styles.welcomeSection}>
        <h1 className={styles.welcomeTitle}>
          Bonjour, {user?.firstName} {user?.lastName}
        </h1>
        <p className={styles.welcomeSubtitle}>
          Bienvenue sur votre tableau de bord {isTutor ? 'Tuteur' : 'Étudiant'}
        </p>

        {/* Bannière de profil incomplet */}
        {!hasCompleteProfile && (
          <div className={styles.profileBanner}>
            <div className={styles.bannerContent}>
              <div className={styles.bannerText}>
                <h3>Complétez votre profil</h3>
                <p>
                  {isTutor 
                    ? 'Finalisez votre profil pour commencer à recevoir des demandes de cours.'
                    : 'Complétez votre profil pour trouver le tuteur parfait.'
                  }
                </p>
              </div>
              <button 
                onClick={handleCompleteProfile}
                className={styles.bannerButton}
              >
                Compléter mon profil
              </button>
            </div>
            <div className={styles.progressBar}>
              <div 
                className={styles.progressFill} 
                style={{ width: `${profileStatus?.completionPercentage || 0}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* Statistiques rapides */}
      <div className={styles.statsGrid}>
        {isTutor && (
          <>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>📚</div>
              <div className={styles.statContent}>
                <h3 className={styles.statNumber}>0</h3>
                <p className={styles.statLabel}>Cours donnés</p>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>⭐</div>
              <div className={styles.statContent}>
                <h3 className={styles.statNumber}>0</h3>
                <p className={styles.statLabel}>Avis reçus</p>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>💼</div>
              <div className={styles.statContent}>
                <h3 className={styles.statNumber}>0</h3>
                <p className={styles.statLabel}>Demandes en attente</p>
              </div>
            </div>
          </>
        )}

        {isStudent && (
          <>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>🎯</div>
              <div className={styles.statContent}>
                <h3 className={styles.statNumber}>0</h3>
                <p className={styles.statLabel}>Cours suivis</p>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>📈</div>
              <div className={styles.statContent}>
                <h3 className={styles.statNumber}>0</h3>
                <p className={styles.statLabel}>Progrès cette semaine</p>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>🤝</div>
              <div className={styles.statContent}>
                <h3 className={styles.statNumber}>0</h3>
                <p className={styles.statLabel}>Tuteurs contactés</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Actions rapides */}
      <div className={styles.actionsSection}>
        <h2 className={styles.sectionTitle}>Actions rapides</h2>
        <div className={styles.actionsGrid}>
          <Link to="/mon-profil" className={styles.actionCard}>
            <div className={styles.actionIcon}>👤</div>
            <h3>Voir mon profil</h3>
            <p>Consulter et modifier vos informations</p>
          </Link>

          {isTutor && (
            <>
              <div className={styles.actionCard}>
                <div className={styles.actionIcon}>📅</div>
                <h3>Mes disponibilités</h3>
                <p>Gérer votre emploi du temps</p>
              </div>
              <div className={styles.actionCard}>
                <div className={styles.actionIcon}>💬</div>
                <h3>Messages</h3>
                <p>Consulter vos conversations</p>
              </div>
            </>
          )}

          {isStudent && (
            <>
              <div className={styles.actionCard}>
                <div className={styles.actionIcon}>🔍</div>
                <h3>Trouver un tuteur</h3>
                <p>Rechercher le professeur idéal</p>
              </div>
              <div className={styles.actionCard}>
                <div className={styles.actionIcon}>📖</div>
                <h3>Mes cours</h3>
                <p>Accéder à vos sessions</p>
              </div>
            </>
          )}

          <div className={styles.actionCard}>
            <div className={styles.actionIcon}>⚙️</div>
            <h3>Paramètres</h3>
            <p>Modifier vos préférences</p>
          </div>
        </div>
      </div>

      {/* NOUVEAU BLOC : Mes Annonces (pour les tuteurs) */}
      {isTutor && (
        <div className={styles.annoncesSection}>
          <h2 className={styles.sectionTitle}>Mes annonces de cours</h2>
          
          {annonces.length > 0 ? (
            <div className={styles.annoncesGrid}>
              {annonces.map((annonce) => (
                <div key={annonce.id} className={styles.annonceCard}>
                  <div className={styles.annonceHeader}>
                    <h3 className={styles.annonceTitle}>{annonce.title}</h3>
                    <span className={`${styles.statusBadge} ${annonce.isActive ? styles.active : styles.inactive}`}>
                      {annonce.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  <div className={styles.annonceDetails}>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Matière:</span>
                      <span className={styles.detailValue}>{annonce.subject}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Niveau:</span>
                      <span className={styles.detailValue}>{annonce.level}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Tarif:</span>
                      <span className={styles.detailValue}>{annonce.hourlyRate}€/h</span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Mode:</span>
                      <span className={styles.detailValue}>{annonce.teachingMode}</span>
                    </div>
                  </div>

                  {annonce.description && (
                    <p className={styles.annonceDescription}>
                      {annonce.description}
                    </p>
                  )}

                  <div className={styles.annonceActions}>
                    <button
                      onClick={() => handleEditAnnonce(annonce)}
                      className={styles.editButton}
                    >
                      Modifier
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.noAnnonces}>
              <h3>Vous n'avez pas encore créé d'annonce</h3>
              <p>Créez votre première annonce pour commencer à recevoir des demandes de cours</p>
              <Link to="/creer-annonce" className={styles.createAnnonceButton}>
                Créer une annonce
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Prochaines étapes pour les nouveaux utilisateurs */}
      {!hasCompleteProfile && (
        <div className={styles.nextSteps}>
          <h2 className={styles.sectionTitle}>Prochaines étapes</h2>
          <div className={styles.stepsList}>
            <div className={styles.stepItem}>
              <div className={styles.stepNumber}>1</div>
              <div className={styles.stepContent}>
                <h3>Complétez votre profil</h3>
                <p>Ajoutez vos informations personnelles et académiques</p>
              </div>
            </div>
            <div className={styles.stepItem}>
              <div className={styles.stepNumber}>2</div>
              <div className={styles.stepContent}>
                <h3>
                  {isTutor ? 'Définissez vos disponibilités' : 'Trouvez votre tuteur'}
                </h3>
                <p>
                  {isTutor 
                    ? 'Indiquez quand vous êtes disponible pour donner des cours'
                    : 'Recherchez des tuteurs selon vos besoins'
                  }
                </p>
              </div>
            </div>
            <div className={styles.stepItem}>
              <div className={styles.stepNumber}>3</div>
              <div className={styles.stepContent}>
                <h3>
                  {isTutor ? 'Recevez vos premières demandes' : 'Commencez vos cours'}
                </h3>
                <p>
                  {isTutor 
                    ? 'Les étudiants pourront vous contacter pour des cours'
                    : 'Planifiez votre première session avec votre tuteur'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de modification d'annonce */}
      {editingAnnonce && (
        <EditAnnonceForm
          annonce={editingAnnonce}
          onCancel={handleCancelEdit}
          onUpdate={handleUpdateAnnonce}
        />
      )}
    </div>
  );
};

export default DashboardPage;