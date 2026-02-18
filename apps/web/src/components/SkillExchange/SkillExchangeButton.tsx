import React, { useState } from 'react';
import type { Skill } from '../../types/skillExchangeTypes';
import './SkillExchangeButton.css';

interface SkillExchangeButtonProps {
  tutorId: string;
  tutorName: string;
  tutorSkillsToTeach?: Skill[];
  tutorSkillsToLearn?: Skill[];
  userSkillsToTeach?: Skill[];
  userSkillsToLearn?: Skill[];
  onExchangeCreated?: () => void;
}

const SkillExchangeButton: React.FC<SkillExchangeButtonProps> = ({
  tutorId,
  tutorName,
  tutorSkillsToTeach = [],
  tutorSkillsToLearn = [],
  userSkillsToTeach = [],
  onExchangeCreated,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedSkillToLearn, setSelectedSkillToLearn] = useState<Skill | null>(null);
  const [selectedSkillToTeach, setSelectedSkillToTeach] = useState<Skill | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Vérifier s'il existe au moins une correspondance possible
  const hasCommonSkills = userSkillsToTeach.some((userSkill) =>
    tutorSkillsToLearn.some((tutorSkill) => tutorSkill.name === userSkill.name)
  );

  const hasExchangeOpportunity =
    tutorSkillsToTeach.length > 0 && hasCommonSkills;

  const handleExchangeClick = () => {
    setShowModal(true);
    setError(null);
  };

  const handleConfirmExchange = async () => {
    if (!selectedSkillToLearn || !selectedSkillToTeach) {
      setError('Veuillez sélectionner les deux compétences');
      return;
    }

    setLoading(true);
    try {
      // Import dynamique du service pour éviter les dépendances circulaires
      const { createSkillExchange } = await import(
        '../../services/skillExchangeService'
      );

      const response = await createSkillExchange(tutorId, selectedSkillToTeach, selectedSkillToLearn);

      if (response.success) {
        setShowModal(false);
        setSelectedSkillToLearn(null);
        setSelectedSkillToTeach(null);
        setError(null);
        if (onExchangeCreated) {
          onExchangeCreated();
        }
        alert('Demande d\'échange créée avec succès!');
      } else {
        setError(response.message || 'Erreur lors de la création');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la création de l\'échange');
    } finally {
      setLoading(false);
    }
  };

  if (!hasExchangeOpportunity) {
    return null;
  }

  return (
    <>
      <button
        className="skill-exchange-button"
        onClick={handleExchangeClick}
        title="Échanger une compétence avec ce tuteur"
      >
        🔄 Échanger une compétence
      </button>

      {showModal && (
        <div className="skill-exchange-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="skill-exchange-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Échanger une compétence avec {tutorName}</h2>
              <button
                className="close-button"
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              {error && <div className="error-message">{error}</div>}

              {/* Compétence que le tuteur peut enseigner */}
              <div className="skill-selection">
                <label className="selection-label">
                  📚 Quelle compétence veux-tu apprendre de {tutorName.split(' ')[0]}&nbsp;?
                </label>
                <div className="skills-options">
                  {tutorSkillsToTeach.map((skill) => (
                    <button
                      key={skill.id}
                      className={`skill-option ${
                        selectedSkillToLearn?.id === skill.id ? 'selected' : ''
                      }`}
                      onClick={() => setSelectedSkillToLearn(skill)}
                    >
                      <span className="skill-option-name">{skill.name}</span>
                      {skill.level && (
                        <span className="skill-option-level">{skill.level}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Compétence que l'utilisateur peut enseigner */}
              <div className="skill-selection">
                <label className="selection-label">
                  🎓 Quelle compétence peux-tu enseigner à {tutorName.split(' ')[0]}&nbsp;?
                </label>
                <div className="skills-options">
                  {userSkillsToTeach
                    .filter((skill) =>
                      tutorSkillsToLearn.some((ts) => ts.name === skill.name)
                    )
                    .map((skill) => (
                      <button
                        key={skill.id}
                        className={`skill-option ${
                          selectedSkillToTeach?.id === skill.id ? 'selected' : ''
                        }`}
                        onClick={() => setSelectedSkillToTeach(skill)}
                      >
                        <span className="skill-option-name">{skill.name}</span>
                        {skill.level && (
                          <span className="skill-option-level">{skill.level}</span>
                        )}
                      </button>
                    ))}
                </div>
              </div>

              {selectedSkillToLearn && selectedSkillToTeach && (
                <div className="exchange-summary">
                  <p>
                    Tu vas apprendre <strong>{selectedSkillToLearn.name}</strong> de{' '}
                    <strong>{tutorName.split(' ')[0]}</strong>
                  </p>
                  <p>
                    et tu vas enseigner <strong>{selectedSkillToTeach.name}</strong> en échange
                  </p>
                  <p className="free-exchange">✨ Aucun coût pour cet échange ✨</p>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                className="button-cancel"
                onClick={() => setShowModal(false)}
              >
                Annuler
              </button>
              <button
                className="button-confirm"
                onClick={handleConfirmExchange}
                disabled={!selectedSkillToLearn || !selectedSkillToTeach || loading}
              >
                {loading ? 'En cours...' : 'Créer l\'échange'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SkillExchangeButton;
