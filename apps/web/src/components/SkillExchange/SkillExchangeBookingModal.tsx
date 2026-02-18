import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './SkillExchangeBookingModal.module.css';
import authService from '../../services/authService';
import profileService from '../../services/profileService';
import type { AnnonceFromDB } from '../../services/annonceService';

interface Skill {
  id?: string;
  name: string;
  level?: string;
}

interface SkillExchangeBookingModalProps {
  tutorId: string;
  tutorProfileId: string; // Ajouter tutorProfileId
  tutorName: string;
  tutorSkillsToLearn: Skill[];
  tutorSkillsToOffer?: Skill[];
  tutorOfferings?: AnnonceFromDB[];
  onClose: () => void;
}

const SkillExchangeBookingModal: React.FC<SkillExchangeBookingModalProps> = ({
  tutorId,
  tutorProfileId,
  tutorName,
  tutorSkillsToLearn,
  tutorSkillsToOffer = [],
  tutorOfferings = [],
  onClose,
}) => {
  const navigate = useNavigate();
  const [userSkillsToTeach, setUserSkillsToTeach] = useState<Skill[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<Skill[]>([]);
  const [skillLevels, setSkillLevels] = useState<{ [key: string]: string }>({});
  const [courseDescription, setCourseDescription] = useState<string>('');
  const [selectedOfferingId, setSelectedOfferingId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userHasMatchingSkills, setUserHasMatchingSkills] = useState(false);

  // Fonction pour traduire les niveaux en français
  const translateLevel = (levelEn: string): string => {
    const levelMap: { [key: string]: string } = {
      'beginner': 'Débutant',
      'intermediate': 'Intermédiaire',
      'advanced': 'Avancé',
      'expert': 'Expert'
    };
    return levelMap[levelEn.toLowerCase()] || levelEn;
  };

  // Fonction helper pour normaliser un skill
  const normalizeSkill = (skill: any): Skill => {
    if (typeof skill === 'string') {
      return { name: skill };
    }
    return skill;
  };

  // Fonction helper pour normaliser un array de skills
  const normalizeSkills = (skills: any[]): Skill[] => {
    if (!Array.isArray(skills)) return [];
    return skills.map(normalizeSkill);
  };

  useEffect(() => {
    loadUserSkills();
  }, []);

  const loadUserSkills = async () => {
    try {
      setLoading(true);
      const currentUser = authService.getCurrentUser();
      
      if (!currentUser) {
        setError('Vous devez être connecté');
        return;
      }

      const profileResponse = await profileService.getProfile();
      
      if (profileResponse?.data?.profile) {
        const profile = profileResponse.data.profile;
        
        // Essayer différentes sources de compétences (priorité au pluriel depuis User)
        let skillsRaw: any[] = [];
        
        // 1. Depuis le profil (User.skillsToTeach - pluriel, priorité haute)
        if (profile.skillsToTeach && Array.isArray(profile.skillsToTeach) && profile.skillsToTeach.length > 0) {
          skillsRaw = profile.skillsToTeach;
        }
        // 2. Depuis l'utilisateur (User.skillsToTeach - pluriel via user objet)
        else if (profile.user?.skillsToTeach && Array.isArray(profile.user.skillsToTeach) && profile.user.skillsToTeach.length > 0) {
          skillsRaw = profile.user.skillsToTeach;
        }
        // 3. Depuis currentUser (authService)
        else if (currentUser.skillsToTeach && Array.isArray(currentUser.skillsToTeach) && currentUser.skillsToTeach.length > 0) {
          skillsRaw = currentUser.skillsToTeach;
        }
        // 4. Fallback: Depuis le profil (ProfileStudent.skillToTeach - singulier, si non vide)
        else if (profile.skillToTeach && Array.isArray(profile.skillToTeach)) {
          skillsRaw = profile.skillToTeach;
        }
        
        // Normaliser les compétences du tuteur directement
        const normalizedTutorSkills = normalizeSkills(tutorSkillsToLearn);
        
        // Normaliser les compétences (string → {name})
        const normalizedSkills: Skill[] = skillsRaw.map(skill => {
          if (typeof skill === 'string') {
            return { name: skill };
          }
          return skill;
        });
        
        setUserSkillsToTeach(normalizedSkills);
        
        // Vérifier si l'utilisateur a des compétences que le tuteur veut apprendre
        const hasMatch = normalizedSkills.some((userSkill: Skill) => {
          const match = normalizedTutorSkills.some((tutorSkill) => {
            return tutorSkill.name === userSkill.name;
          });
          return match;
        });
        
        setUserHasMatchingSkills(hasMatch);
        
        if (!hasMatch) {
          setError('Vous n\'avez aucune compétence que ce tuteur souhaite apprendre');
        }
      }
    } catch (err: any) {
      setError('Erreur lors du chargement de vos compétences');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedSkills.length === 0) {
      setError('Veuillez sélectionner au moins une compétence');
      return;
    }

    // Vérifier que toutes les compétences sélectionnées ont un niveau
    for (const skill of selectedSkills) {
      if (!skillLevels[skill.name]) {
        setError(`Veuillez indiquer votre niveau pour ${skill.name}`);
        return;
      }
    }

    if (!courseDescription.trim()) {
      setError('Veuillez décrire votre cours et les technologies enseignées');
      return;
    }

    if (tutorOfferings.length > 0 && !selectedOfferingId) {
      setError('Veuillez sélectionner un cours auprès du tuteur');
      return;
    }

    const selectedOffering = tutorOfferings.find(o => o.id === selectedOfferingId);

    // Rediriger vers la page de création d'échange avec les données
    navigate('/skill-exchange/create', {
      state: {
        tutorId,
        tutorProfileId, // Passer le tutorProfileId
        tutorName,
        skillsOffered: selectedSkills.map(skill => ({
          ...skill,
          level: skillLevels[skill.name],
        })),
        skillsRequested: normalizeSkills(tutorSkillsToOffer),
        tutorSkillsToLearn: normalizeSkills(tutorSkillsToLearn),
        courseDescription: courseDescription.trim(),
        selectedOffering: selectedOffering || null,
      },
    });
  };

  const toggleSkillSelection = (skill: Skill) => {
    setSelectedSkills(prev => {
      const isSelected = prev.some(s => s.name === skill.name);
      if (isSelected) {
        // Retirer la compétence
        const newSkills = prev.filter(s => s.name !== skill.name);
        // Retirer aussi le niveau associé
        const newLevels = { ...skillLevels };
        delete newLevels[skill.name];
        setSkillLevels(newLevels);
        return newSkills;
      } else {
        // Ajouter la compétence
        return [...prev, skill];
      }
    });
    setError(null);
  };

  const updateSkillLevel = (skillName: string, level: string) => {
    setSkillLevels(prev => ({
      ...prev,
      [skillName]: level
    }));
    setError(null);
  };

  // Normaliser les compétences du tuteur
  const normalizedTutorSkills = normalizeSkills(tutorSkillsToLearn);

  // Filtrer les compétences que l'utilisateur a et que le tuteur veut apprendre
  const matchingSkills = userSkillsToTeach.filter((userSkill) => {
    return normalizedTutorSkills.some((tutorSkill) => {
      return tutorSkill.name === userSkill.name;
    });
  });

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Échanger nos compétences</h2>
          <button className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        {loading ? (
          <div className={styles.loading}>Chargement de vos compétences...</div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            {error && <div className={styles.errorMessage}>{error}</div>}

            {!userHasMatchingSkills ? (
              <div className={styles.noMatchMessage}>
                <p>
                  Vous n'avez aucune compétence que <strong>{tutorName}</strong> souhaite
                  apprendre actuellement.
                </p>
                <p className={styles.hint}>
                  Ajoutez vos compétences dans votre profil pour pouvoir échanger.
                </p>
              </div>
            ) : (
              <>
                <div className={styles.infoBox}>
                  <p>
                    <strong>{tutorName}</strong> souhaite apprendre :
                  </p>
                  <div className={styles.skillsList}>
                    {normalizedTutorSkills.map((skill, index) => (
                      <span key={index} className={styles.skillBadge}>
                        {skill.name}
                      </span>
                    ))}
                  </div>
                </div>

                {tutorOfferings.length > 0 && (
                  <div className={styles.formGroup}>
                    <label htmlFor="offering-select">
                      Quel cours souhainez-vous suivre chez {tutorName} ?
                    </label>
                    <select
                      id="offering-select"
                      value={selectedOfferingId}
                      onChange={(e) => {
                        setSelectedOfferingId(e.target.value);
                        setError(null);
                      }}
                      className={styles.select}
                    >
                      <option value="">-- Sélectionnez un cours --</option>
                      {tutorOfferings.map((offering) => (
                        <option key={offering.id} value={offering.id}>
                          {offering.title} - {offering.subject} ({offering.level})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className={styles.formGroup}>
                  <label>
                    Quelles compétences pouvez-vous enseigner ?
                  </label>
                  <div className={styles.skillsGrid}>
                    {matchingSkills.map((skill, index) => {
                      const isSelected = selectedSkills.some(s => s.name === skill.name);
                      return (
                        <button
                          key={index}
                          type="button"
                          onClick={() => toggleSkillSelection(skill)}
                          className={`${styles.skillCard} ${isSelected ? styles.skillCardSelected : ''}`}
                        >
                          <span className={styles.skillCardIcon}>
                            {isSelected ? '✓' : '+'}
                          </span>
                          <span className={styles.skillCardName}>{skill.name}</span>
                        </button>
                      );
                    })}
                  </div>
                  {matchingSkills.length === 0 && (
                    <p className={styles.hint}>
                      Aucune correspondance trouvée entre vos compétences et ses besoins.
                    </p>
                  )}
                </div>

                {selectedSkills.length > 0 && (
                  <>
                    <div className={styles.formGroup}>
                      <label>Niveaux dans chaque compétence</label>
                      <div className={styles.skillLevels}>
                        {selectedSkills.map((skill, index) => (
                          <div key={index} className={styles.skillLevelItem}>
                            <label htmlFor={`level-${skill.name}`}>
                              <strong>{skill.name}</strong>
                            </label>
                            <select
                              id={`level-${skill.name}`}
                              value={skillLevels[skill.name] || ''}
                              onChange={(e) => updateSkillLevel(skill.name, e.target.value)}
                              className={styles.select}
                            >
                              <option value="">-- Sélectionnez votre niveau --</option>
                              <option value="beginner">Débutant</option>
                              <option value="intermediate">Intermédiaire</option>
                              <option value="advanced">Avancé</option>
                              <option value="expert">Expert</option>
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className={styles.formGroup}>
                      <label htmlFor="course-description">
                        Décrivez votre cours
                      </label>
                      <p className={styles.hint}>
                        Indiquez toutes les technologies et concepts que vous enseignerez, le contenu du cours, et votre approche pédagogique.
                      </p>
                      <textarea
                        id="course-description"
                        value={courseDescription}
                        onChange={(e) => {
                          setCourseDescription(e.target.value);
                          setError(null);
                        }}
                        placeholder="Ex: Je propose un cours complet sur Python couvrant la programmation orientée objet, les structure de données, et les frameworks web modernes comme Django..."
                        required
                        rows={5}
                        className={styles.textarea}
                      />
                    </div>

                    <div className={styles.priceInfo}>
                      <span className={styles.priceLabel}>Coût de l'échange :</span>
                      <span className={styles.priceValue}>0 EduCoins</span>
                      <span className={styles.freeTag}>Gratuit ✨</span>
                    </div>
                  </>
                )}
              </>
            )}

            <div className={styles.modalFooter}>
              <button type="button" onClick={onClose} className={styles.cancelButton}>
                Annuler
              </button>
              {userHasMatchingSkills && (
                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={selectedSkills.length === 0 || selectedSkills.some(s => !skillLevels[s.name]) || !courseDescription.trim() || (tutorOfferings.length > 0 && !selectedOfferingId)}
                >
                  Proposer l'échange de cours
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default SkillExchangeBookingModal;
