import React from 'react';
import styles from './ExperienceStep.module.css';

interface ExperienceStepProps {
  profileData: any;
  setProfileData: (data: any) => void;
  role: string;
}

const ExperienceStep: React.FC<ExperienceStepProps> = ({
  profileData,
  setProfileData
}) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProfileData((prev: any) => ({
      ...prev,
      [name]: value
    }));
    window.dispatchEvent(
      new CustomEvent('profileFieldUpdated', { detail: { field: name } })
    );
  };

  const handleSpecialtyChange = (specialty: string) => {
    const updatedSpecialties = profileData.specialties.includes(specialty)
      ? profileData.specialties.filter((s: string) => s !== specialty)
      : [...profileData.specialties, specialty];
    
    setProfileData((prev: any) => ({
      ...prev,
      specialties: updatedSpecialties
    }));
    window.dispatchEvent(
      new CustomEvent('profileFieldUpdated', { detail: { field: name } })
    );
  };

  const specialties = [
    'Mathématiques', 'Physique', 'Chimie', 'SVT',
    'Français', 'Anglais', 'Espagnol', 'Histoire-Géographie',
    'Philosophie', 'Économie', 'Programmation', 'Médecine',
    'Droit', 'Marketing', 'Design'
  ];

  return (
    <div className={styles.container}>
      <h2>Votre expérience</h2>
      <p className={styles.subtitle}>
        Présentez votre parcours et vos compétences
      </p>

      <div className={styles.formGrid}>
        <div className={styles.formGroup}>
          <label htmlFor="experience" className={styles.label}>Expérience</label>
          <select
            id="experience"
            name="experience"
            value={profileData.experience}
            onChange={handleInputChange}
            className={styles.select}
          >
            <option value="">Sélectionnez</option>
            <option value="0-1">Moins d'1 an</option>
            <option value="1-3">1 à 3 ans</option>
            <option value="3-5">3 à 5 ans</option>
            <option value="5+">Plus de 5 ans</option>
          </select>
        </div>

        <div className={`${styles.formGroup} ${styles.fullWidth}`}>
          <label htmlFor="bio" className={styles.label}>Présentation</label>
          <textarea
            id="bio"
            name="bio"
            value={profileData.bio}
            onChange={handleInputChange}
            className={styles.textarea}
            placeholder="Décrivez votre parcours, votre méthode d'enseignement et vos spécialités..."
            rows={6}
          />
          <p className={styles.helpText}>
            Cette description apparaîtra sur votre profil public
          </p>
        </div>

        <div className={`${styles.formGroup} ${styles.fullWidth}`}>
          <label className={styles.label}>Spécialités</label>
          <div className={styles.specialtiesGrid}>
            {specialties.map(specialty => (
              <label key={specialty} className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={profileData.specialties.includes(specialty)}
                  onChange={() => handleSpecialtyChange(specialty)}
                  className={styles.checkbox}
                />
                <span className={styles.checkboxText}>{specialty}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExperienceStep;