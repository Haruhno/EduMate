import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './DashboardPage.module.css';
import profileService from '../../services/profileService';
import authService from '../../services/authService';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profileStatus, setProfileStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const currentUser = authService.getCurrentUser();
        setUser(currentUser);

        if (currentUser) {
          const status = await profileService.getProfileStatus();
          setProfileStatus(status);
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

  return (
    <div className={styles.container}>
      {/* En-tête de bienvenue */}
      <div className={styles.welcomeSection}>
        <h1 className={styles.welcomeTitle}>
          Bonjour, {user?.firstName} {user?.lastName} 👋
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
    </div>
  );
};

export default DashboardPage;