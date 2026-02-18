import React from 'react';
import type { Skill } from '../../types/skillExchangeTypes';
import './TutorSkillsDisplay.css';

interface TutorSkillsDisplayProps {
  skillsToTeach?: Skill[];
  skillsToLearn?: Skill[];
}

const getLevelColor = (level?: string): string => {
  switch (level) {
    case 'beginner':
      return '#87CEEB';
    case 'intermediate':
      return '#FFD700';
    case 'advanced':
      return '#FF8C00';
    case 'expert':
      return '#FF4500';
    default:
      return '#9CA3AF';
  }
};

const getLevelLabel = (level?: string): string => {
  switch (level) {
    case 'beginner':
      return 'Débutant';
    case 'intermediate':
      return 'Intermédiaire';
    case 'advanced':
      return 'Avancé';
    case 'expert':
      return 'Expert';
    default:
      return '';
  }
};

const TutorSkillsDisplay: React.FC<TutorSkillsDisplayProps> = ({
  skillsToTeach = [],
  skillsToLearn = [],
}) => {
  return (
    <div className="tutor-skills-display">
      {/* Compétences à enseigner */}
      {skillsToTeach && skillsToTeach.length > 0 && (
        <div className="skills-section">
          <h3 className="skills-title">📚 Compétences à enseigner</h3>
          <div className="skills-list">
            {skillsToTeach.map((skill, index) => (
              <div key={index} className="skill-badge">
                <span className="skill-name">{skill.name}</span>
                {skill.level && (
                  <span
                    className="skill-level"
                    style={{ backgroundColor: getLevelColor(skill.level) }}
                  >
                    {getLevelLabel(skill.level)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Compétences à apprendre */}
      {skillsToLearn && skillsToLearn.length > 0 && (
        <div className="skills-section">
          <h3 className="skills-title">🎓 Compétences à apprendre</h3>
          <div className="skills-list">
            {skillsToLearn.map((skill, index) => (
              <div key={index} className="skill-badge skill-learn">
                <span className="skill-name">{skill.name}</span>
                {skill.level && (
                  <span
                    className="skill-level"
                    style={{ backgroundColor: getLevelColor(skill.level) }}
                  >
                    {getLevelLabel(skill.level)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TutorSkillsDisplay;
