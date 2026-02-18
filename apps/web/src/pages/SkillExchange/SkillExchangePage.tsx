import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  getSkillExchanges,
  acceptSkillExchange,
  rejectSkillExchange,
} from '../../services/skillExchangeService';
import type { SkillExchangeRequest } from '../../services/skillExchangeService';
import Toast from '../../components/Toast/Toast';
import { useToast } from '../../hooks/useToast';
import styles from './SkillExchangePage.module.css';

const SkillExchangePage: React.FC = () => {
  const [exchanges, setExchanges] = useState<SkillExchangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'sent' | 'received'>('sent');
  const [expandedSkills, setExpandedSkills] = useState<Set<string>>(new Set());
  const { toasts, success, error: showError, removeToast } = useToast();

  const normalizeSkills = (value: any): Array<{ name: string; level?: string }> => {
    if (!value) return [];
    if (Array.isArray(value)) {
      return value.filter((skill) => skill && skill.name);
    }
    if (Array.isArray(value.skills)) {
      return value.skills.filter((skill: any) => skill && skill.name);
    }
    if (value.name) {
      return [value];
    }
    return [];
  };

  const getSkillsList = (
    exchange: SkillExchangeRequest,
    key: 'offered' | 'requested'
  ): Array<{ name: string; level?: string }> => {
    if (key === 'offered' && exchange.skillsOffered?.length) {
      return exchange.skillsOffered;
    }
    if (key === 'requested' && exchange.skillsRequested?.length) {
      return exchange.skillsRequested;
    }

    const single = key === 'offered' ? exchange.skillOffered : exchange.skillRequested;
    return normalizeSkills(single as any);
  };

  const formatLevel = (level?: string) => {
    if (!level) return '';
    const normalized = level.toLowerCase();
    const levelMap: Record<string, string> = {
      beginner: 'Débutant',
      intermediate: 'Intermédiaire',
      advanced: 'Avancé',
      expert: 'Expert'
    };
    return levelMap[normalized] || level;
  };

  const toggleExpandedSkills = (exchangeId: string) => {
    const newExpanded = new Set(expandedSkills);
    if (newExpanded.has(exchangeId)) {
      newExpanded.delete(exchangeId);
    } else {
      newExpanded.add(exchangeId);
    }
    setExpandedSkills(newExpanded);
  };

  useEffect(() => {
    loadExchanges();
  }, []);

  const loadExchanges = async () => {
    try {
      setLoading(true);
      const response = await getSkillExchanges();
      setExchanges(response.data);
      setError(null);
    } catch (err: any) {
      setError('Erreur lors du chargement des échanges');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (id: string) => {
    try {
      await acceptSkillExchange(id);
      success('Échange accepté!');
      loadExchanges();
    } catch (err: any) {
      showError('Erreur lors de l\'acceptation');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectSkillExchange(id);
      success('Échange rejeté');
      loadExchanges();
    } catch (err: any) {
      showError('Erreur lors du rejet');
    }
  };

  const getCurrentUserId = () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return user.id;
    } catch {
      return null;
    }
  };

  const userId = getCurrentUserId();

  const sentExchanges = exchanges.filter((e) => e.studentId === userId);
  const receivedExchanges = exchanges.filter((e) => e.tutorId === userId);

  const displayedExchanges =
    activeTab === 'sent' ? sentExchanges : receivedExchanges;

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Chargement de vos échanges...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Échanges de Compétences</h1>
        <p className={styles.subtitle}>
          Gérez vos propositions d'échange de compétences gratuitement
        </p>
        <Link to="/recherche-tuteur" className={styles.findTutorLink}>
          🔍 Trouver un tuteur pour échanger nos compétences
        </Link>
      </div>

      {error && <div className={styles.errorMessage}>{error}</div>}

      <div className={styles.tabsContainer}>
        <button
          className={`${styles.tabButton} ${activeTab === 'sent' ? styles.active : ''}`}
          onClick={() => setActiveTab('sent')}
        >
          Envoyés
          <span className={styles.tabBadge}>{sentExchanges.length}</span>
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'received' ? styles.active : ''}`}
          onClick={() => setActiveTab('received')}
        >
          Reçus
          <span className={styles.tabBadge}>{receivedExchanges.length}</span>
        </button>
      </div>

      <div className={styles.exchangesList}>
        {displayedExchanges.length === 0 ? (
          <div className={styles.emptyState}>
            <p>
              {activeTab === 'sent'
                ? 'Vous n\'avez envoyé aucune demande d\'échange'
                : 'Vous n\'avez reçu aucune demande d\'échange'}
            </p>
          </div>
        ) : (
          displayedExchanges.map((exchange) => {
            const status = (exchange.status || 'pending').toLowerCase();
            const statusClass = 'status' + status.charAt(0).toUpperCase() + status.slice(1);
            const skillsToTeach = getSkillsList(exchange, 'offered');
            const skillsToLearn = getSkillsList(exchange, 'requested');
            const courseDescription =
              exchange.studentNotes ||
              exchange.description ||
              (exchange.skillRequested as any)?.description ||
              (exchange.skillOffered as any)?.description;
            
            return (
              <div 
                key={exchange.id} 
                className={`${styles.exchangeCard} ${styles[statusClass]}`}
              >
                <div className={styles.exchangeHeader}>
                  <h3>
                    {activeTab === 'sent'
                      ? `Échange proposé`
                      : `Nouvelle demande d'échange`}
                  </h3>
                  <span className={`${styles.statusBadge} ${styles[statusClass]}`}>
                    {status === 'pending' && 'En attente'}
                    {status === 'accepted' && 'Accepté'}
                    {status === 'rejected' && 'Rejeté'}
                    {status === 'completed' && 'Complété'}
                  </span>
                </div>

                {exchange.bookings && exchange.bookings.length > 0 && (
                  <div className={styles.exchangeTimeInfo}>
                    <div className={styles.timeItem}>
                      <span className={styles.timeIcon}>📅</span>
                      <span>{exchange.bookings[0].date}</span>
                    </div>
                    <div className={styles.timeItem}>
                      <span className={styles.timeIcon}>🕐</span>
                      <span>{exchange.bookings[0].time}</span>
                    </div>
                    <div className={styles.timeItem}>
                      <span className={styles.timeIcon}>⏱️</span>
                      <span>{exchange.bookings[0].duration} min</span>
                    </div>
                  </div>
                )}

                {exchange.tutorDescription && (
                  <div className={styles.tutorDescriptionBlock}>
                    <p className={styles.tutorDescriptionLabel}>📝 Description du tuteur</p>
                    <p className={styles.tutorDescriptionText}>{exchange.tutorDescription}</p>
                  </div>
                )}

                <div className={styles.exchangeSkills}>
                  <div className={styles.skillSection}>
                    <p className={styles.skillLabel}>📚 À enseigner</p>
                    {skillsToTeach.length > 0 ? (
                      <>
                        {skillsToTeach.slice(0, expandedSkills.has(`${exchange.id}-teach`) ? skillsToTeach.length : 5).map((skill, index) => (
                          <div key={`${skill.name}-${index}`} className={styles.skillItem}>
                            <span className={styles.skillName}>{skill.name}</span>
                            {skill.level && (
                              <span className={styles.skillLevel}>{formatLevel(skill.level)}</span>
                            )}
                          </div>
                        ))}
                        {skillsToTeach.length > 5 && (
                          <button 
                            className={styles.seeMoreButton}
                            onClick={() => toggleExpandedSkills(`${exchange.id}-teach`)}
                          >
                            {expandedSkills.has(`${exchange.id}-teach`) ? '- Voir moins' : `+ Voir plus (${skillsToTeach.length - 5})`}
                          </button>
                        )}
                      </>
                    ) : (
                      <div className={styles.skillItem}>
                        <span className={styles.skillName}>Aucune compétence</span>
                      </div>
                    )}
                  </div>

                  <div className={styles.skillSection}>
                    <p className={styles.skillLabel}>🎓 À apprendre</p>
                    {skillsToLearn.length > 0 ? (
                      <>
                        {skillsToLearn.slice(0, expandedSkills.has(`${exchange.id}-learn`) ? skillsToLearn.length : 5).map((skill, index) => (
                          <div key={`${skill.name}-${index}`} className={styles.skillItem}>
                            <span className={styles.skillName}>{skill.name}</span>
                            {skill.level && (
                              <span className={styles.skillLevel}>{formatLevel(skill.level)}</span>
                            )}
                          </div>
                        ))}
                        {skillsToLearn.length > 5 && (
                          <button 
                            className={styles.seeMoreButton}
                            onClick={() => toggleExpandedSkills(`${exchange.id}-learn`)}
                          >
                            {expandedSkills.has(`${exchange.id}-learn`) ? '- Voir moins' : `+ Voir plus (${skillsToLearn.length - 5})`}
                          </button>
                        )}
                      </>
                    ) : (
                      <div className={styles.skillItem}>
                        <span className={styles.skillName}>Aucune compétence</span>
                      </div>
                    )}
                  </div>
                </div>

                {courseDescription && (
                  <div className={styles.exchangeDescription}>
                    <p className={styles.descriptionLabel}>📝 Description du cours de l'étudiant</p>
                    <p className={styles.descriptionText}>{courseDescription}</p>
                  </div>
                )}

                {status === 'pending' && activeTab === 'received' && (
                  <div className={styles.exchangeActions}>
                    <button
                      className={`${styles.actionButton} ${styles.buttonAccept}`}
                      onClick={() => handleAccept(exchange.id!)}
                    >
                      Accepter
                    </button>
                    <button
                      className={`${styles.actionButton} ${styles.buttonReject}`}
                      onClick={() => handleReject(exchange.id!)}
                    >
                      Refuser
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Toast notifications */}
      <div className={styles.toastContainer}>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default SkillExchangePage;
