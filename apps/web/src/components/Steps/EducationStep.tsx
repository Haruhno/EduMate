import React, { useRef } from 'react';
import styles from './EducationStep.module.css';

interface EducationStepProps {
  profileData: any;
  setProfileData: (data: any) => void;
  role: string;
}

const EducationStep: React.FC<EducationStepProps> = ({
  profileData,
  setProfileData,
  role
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProfileData((prev: any) => ({
      ...prev,
      [name]: value
    }));
    window.dispatchEvent(
      new CustomEvent('profileFieldUpdated', { detail: { field: name } })
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileData((prev: any) => ({
        ...prev,
        diplomaFile: file
      }));
      window.dispatchEvent(
        new CustomEvent('profileFieldUpdated', { detail: { field: name } })
        );
    }
  };

  const educationLevels = [
    'Brevet des collèges',
    'Baccalauréat',
    'Bac+2 (BTS, DUT)',
    'Licence',
    'Master',
    'Doctorat',
    'Autre'
  ];

  const fields = [
    'Informatique',
    'Mathématiques',
    'Physique',
    'Chimie',
    'Biologie',
    'Économie',
    'Droit',
    'Médecine',
    'Ingénierie',
    'Autre'
  ];

  return (
    <div className={styles.container}>
      <h2>{role === 'student' ? 'Vos études' : 'Vos diplômes'}</h2>
      <p className={styles.subtitle}>
        {role === 'student' 
          ? 'Renseignez votre parcours académique' 
          : 'Ajoutez vos diplômes et certifications'
        }
      </p>

      <div className={styles.formGrid}>
        <div className={styles.formGroup}>
          <label htmlFor="educationLevel" className={styles.label}>
            {role === 'student' ? 'Niveau d\'études' : 'Niveau du diplôme'}
          </label>
          <select
            id="educationLevel"
            name="educationLevel"
            value={profileData.educationLevel}
            onChange={handleInputChange}
            className={styles.select}
          >
            <option value="">Sélectionnez</option>
            {educationLevels.map(level => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="field" className={styles.label}>Domaine</label>
          <select
            id="field"
            name="field"
            value={profileData.field}
            onChange={handleInputChange}
            className={styles.select}
          >
            <option value="">Sélectionnez</option>
            {fields.map(field => (
              <option key={field} value={field}>{field}</option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="school" className={styles.label}>
            {role === 'student' ? 'Établissement' : 'Établissement de formation'}
          </label>
          <input
            type="text"
            id="school"
            name="school"
            value={profileData.school}
            onChange={handleInputChange}
            className={styles.input}
            placeholder="Université Paris-Saclay"
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="year" className={styles.label}>Année</label>
          <input
            type="text"
            id="year"
            name="year"
            value={profileData.year}
            onChange={handleInputChange}
            className={styles.input}
            placeholder="2023-2024"
          />
        </div>

        {role === 'tutor' && (
          <div className={`${styles.formGroup} ${styles.fullWidth}`}>
            <label className={styles.label}>Diplôme ou certificat</label>
            <div className={styles.fileUpload}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className={styles.fileInput}
              />
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={styles.uploadButton}
              >
                📎 Téléverser un fichier
              </button>
              {profileData.diplomaFile && (
                <span className={styles.fileName}>
                  {profileData.diplomaFile.name}
                </span>
              )}
            </div>
            <p className={styles.helpText}>
              Formats acceptés : PDF, JPG, PNG (max. 5MB)
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EducationStep;