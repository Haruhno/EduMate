import React, { useState, useEffect } from 'react';
import './SkillsManager.css';

interface Skill {
  id: string;
  name: string;
  level?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

interface SkillsManagerProps {
  initialSkillsToTeach?: Skill[];
  initialSkillsToLearn?: Skill[];
  onUpdate: (skillsToTeach: Skill[], skillsToLearn: Skill[]) => Promise<void>;
}

const SKILL_LEVELS = [
  { value: 'beginner', label: 'Débutant' },
  { value: 'intermediate', label: 'Intermédiaire' },
  { value: 'advanced', label: 'Avancé' },
  { value: 'expert', label: 'Expert' },
];

const COMMON_SKILLS = [
  'Mathématiques',
  'Physique',
  'Chimie',
  'Français',
  'Anglais',
  'Espagnol',
  'Histoire',
  'Géographie',
  'Philosophie',
  'SVT',
  'Informatique',
  'Programmation',
  'Python',
  'JavaScript',
  'React',
  'Node.js',
  'Java',
  'SQL',
  'Marketing',
  'Comptabilité',
  'Économie',
  'Droit',
];

const SkillsManager: React.FC<SkillsManagerProps> = ({
  initialSkillsToTeach = [],
  initialSkillsToLearn = [],
  onUpdate,
}) => {
  const [skillsToTeach, setSkillsToTeach] = useState<Skill[]>(initialSkillsToTeach);
  const [skillsToLearn, setSkillsToLearn] = useState<Skill[]>(initialSkillsToLearn);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillLevel, setNewSkillLevel] = useState<'beginner' | 'intermediate' | 'advanced' | 'expert'>('intermediate');
  const [activeTab, setActiveTab] = useState<'teach' | 'learn'>('teach');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setSkillsToTeach(initialSkillsToTeach);
  }, [initialSkillsToTeach]);

  useEffect(() => {
    setSkillsToLearn(initialSkillsToLearn);
  }, [initialSkillsToLearn]);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const addSkill = (type: 'teach' | 'learn') => {
    if (!newSkillName.trim()) {
      setMessage({ type: 'error', text: 'Veuillez entrer un nom de compétence' });
      return;
    }

    const newSkill: Skill = {
      id: generateId(),
      name: newSkillName.trim(),
      level: newSkillLevel,
    };

    if (type === 'teach') {
      if (skillsToTeach.some((s) => s.name.toLowerCase() === newSkillName.toLowerCase())) {
        setMessage({ type: 'error', text: 'Cette compétence existe déjà' });
        return;
      }
      setSkillsToTeach([...skillsToTeach, newSkill]);
    } else {
      if (skillsToLearn.some((s) => s.name.toLowerCase() === newSkillName.toLowerCase())) {
        setMessage({ type: 'error', text: 'Cette compétence existe déjà' });
        return;
      }
      setSkillsToLearn([...skillsToLearn, newSkill]);
    }

    setNewSkillName('');
    setNewSkillLevel('intermediate');
    setMessage(null);
  };

  const removeSkill = (type: 'teach' | 'learn', skillId: string) => {
    if (type === 'teach') {
      setSkillsToTeach(skillsToTeach.filter((s) => s.id !== skillId));
    } else {
      setSkillsToLearn(skillsToLearn.filter((s) => s.id !== skillId));
    }
  };

  const updateSkillLevel = (type: 'teach' | 'learn', skillId: string, level: string) => {
    if (type === 'teach') {
      setSkillsToTeach(
        skillsToTeach.map((s) =>
          s.id === skillId ? { ...s, level: level as Skill['level'] } : s
        )
      );
    } else {
      setSkillsToLearn(
        skillsToLearn.map((s) =>
          s.id === skillId ? { ...s, level: level as Skill['level'] } : s
        )
      );
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      await onUpdate(skillsToTeach, skillsToLearn);
      setMessage({ type: 'success', text: 'Compétences enregistrées avec succès !' });
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Erreur lors de l\'enregistrement',
      });
    } finally {
      setSaving(false);
    }
  };

  const getLevelLabel = (level?: string) => {
    return SKILL_LEVELS.find((l) => l.value === level)?.label || 'Non défini';
  };

  const getLevelColor = (level?: string) => {
    switch (level) {
      case 'beginner':
        return '#95a5a6';
      case 'intermediate':
        return '#3498db';
      case 'advanced':
        return '#9b59b6';
      case 'expert':
        return '#e74c3c';
      default:
        return '#7f8c8d';
    }
  };

  return (
    <div className="skills-manager">
      <div className="skills-manager-header">
        <h2>Gérer mes compétences</h2>
        <p className="skills-description">
          Indiquez ce que vous pouvez enseigner et ce que vous souhaitez apprendre pour faciliter les
          échanges de compétences.
        </p>
      </div>

      {message && (
        <div className={`message message-${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="skills-tabs">
        <button
          className={`skills-tab ${activeTab === 'teach' ? 'active' : ''}`}
          onClick={() => setActiveTab('teach')}
        >
          📚 Je peux enseigner ({skillsToTeach.length})
        </button>
        <button
          className={`skills-tab ${activeTab === 'learn' ? 'active' : ''}`}
          onClick={() => setActiveTab('learn')}
        >
          🎓 Je veux apprendre ({skillsToLearn.length})
        </button>
      </div>

      <div className="skills-content">
        {/* Formulaire d'ajout */}
        <div className="add-skill-form">
          <div className="form-row">
            <div className="form-group">
              <label>Compétence</label>
              <input
                type="text"
                list="common-skills"
                value={newSkillName}
                onChange={(e) => setNewSkillName(e.target.value)}
                placeholder="Ex: Python, Mathématiques..."
                className="skill-input"
              />
              <datalist id="common-skills">
                {COMMON_SKILLS.map((skill) => (
                  <option key={skill} value={skill} />
                ))}
              </datalist>
            </div>

            <div className="form-group">
              <label>Niveau</label>
              <select
                value={newSkillLevel}
                onChange={(e) => setNewSkillLevel(e.target.value as any)}
                className="skill-select"
              >
                {SKILL_LEVELS.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => addSkill(activeTab)}
              className="btn-add-skill"
            >
              + Ajouter
            </button>
          </div>
        </div>

        {/* Liste des compétences */}
        <div className="skills-list">
          {activeTab === 'teach' && (
            <>
              {skillsToTeach.length === 0 ? (
                <div className="empty-state">
                  <p>Aucune compétence à enseigner pour le moment.</p>
                  <p className="hint">Ajoutez vos compétences ci-dessus pour les partager avec d'autres !</p>
                </div>
              ) : (
                skillsToTeach.map((skill) => (
                  <div key={skill.id} className="skill-card">
                    <div className="skill-info">
                      <span className="skill-name">{skill.name}</span>
                      <span
                        className="skill-level-badge"
                        style={{ backgroundColor: getLevelColor(skill.level) }}
                      >
                        {getLevelLabel(skill.level)}
                      </span>
                    </div>
                    <div className="skill-actions">
                      <select
                        value={skill.level || 'intermediate'}
                        onChange={(e) => updateSkillLevel('teach', skill.id, e.target.value)}
                        className="skill-level-select"
                      >
                        {SKILL_LEVELS.map((level) => (
                          <option key={level.value} value={level.value}>
                            {level.label}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => removeSkill('teach', skill.id)}
                        className="btn-remove-skill"
                        title="Supprimer"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))
              )}
            </>
          )}

          {activeTab === 'learn' && (
            <>
              {skillsToLearn.length === 0 ? (
                <div className="empty-state">
                  <p>Aucune compétence à apprendre pour le moment.</p>
                  <p className="hint">Ajoutez les compétences que vous souhaitez acquérir !</p>
                </div>
              ) : (
                skillsToLearn.map((skill) => (
                  <div key={skill.id} className="skill-card">
                    <div className="skill-info">
                      <span className="skill-name">{skill.name}</span>
                      <span
                        className="skill-level-badge"
                        style={{ backgroundColor: getLevelColor(skill.level) }}
                      >
                        Niveau souhaité: {getLevelLabel(skill.level)}
                      </span>
                    </div>
                    <div className="skill-actions">
                      <select
                        value={skill.level || 'intermediate'}
                        onChange={(e) => updateSkillLevel('learn', skill.id, e.target.value)}
                        className="skill-level-select"
                      >
                        {SKILL_LEVELS.map((level) => (
                          <option key={level.value} value={level.value}>
                            {level.label}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => removeSkill('learn', skill.id)}
                        className="btn-remove-skill"
                        title="Supprimer"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </div>

        {/* Bouton d'enregistrement */}
        <div className="skills-actions">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-save-skills"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer les compétences'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SkillsManager;
