import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import styles from './RoleSelectionPage.module.css';

const RoleSelectionPage: React.FC = () => {
  const navigate = useNavigate();

  const handleRoleSelection = (role: 'student' | 'tutor') => {
    // Stocker le rôle temporairement ou le passer en paramètre
    navigate('/inscription', { state: { role } });
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.roleContainer}>
        <h1>Bienvenue chez EduMate</h1>
        <p className={styles.subtitle}>
          Pour personnaliser votre compte EduMate, choisissez votre profil
        </p>

        <div className={styles.roleCards}>
          <div 
            className={styles.roleCard}
            onClick={() => handleRoleSelection('student')}
          >
            <div className={styles.iconContainer}>
              <div className={styles.studentIcon}>📚</div>
            </div>
            <h3>Je suis étudiant</h3>
            <p>Trouvez le tuteur idéal pour progresser dans vos études</p>
            <div className={styles.arrow}>→</div>
          </div>

          <div 
            className={styles.roleCard}
            onClick={() => handleRoleSelection('tutor')}
          >
            <div className={styles.iconContainer}>
              <div className={styles.tutorIcon}>👨‍🏫</div>
            </div>
            <h3>Je suis tuteur</h3>
            <p>Partagez vos connaissances et augmentez vos revenus</p>
            <div className={styles.arrow}>→</div>
          </div>
        </div>

        <div className={styles.loginLink}>
          <span>
            Vous avez déjà un compte ?{' '}
            <Link to="/connexion" className={styles.link}>
              Connectez-vous
            </Link>
          </span>
        </div>
      </div>
    </div>
  );
};

export default RoleSelectionPage;