import React, { useRef } from 'react';
import styles from './GeneralInfoStep.module.css';

interface GeneralInfoStepProps {
  profileData: any;
  setProfileData: (data: any) => void;
  role: string;
}

const GeneralInfoStep: React.FC<GeneralInfoStepProps> = ({
  profileData,
  setProfileData,
  role
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfileData((prev: any) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfileData((prev: any) => ({
          ...prev,
          profilePicture: e.target?.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const countryCodes = [
    { code: '+33', flag: '🇫🇷', name: 'France' },
    { code: '+32', flag: '🇧🇪', name: 'Belgique' },
    { code: '+41', flag: '🇨🇭', name: 'Suisse' },
    { code: '+1', flag: '🇺🇸', name: 'États-Unis' },
    { code: '+44', flag: '🇬🇧', name: 'Royaume-Uni' },
  ];

  return (
    <div className={styles.container}>
      <h2>Informations générales</h2>
      <p className={styles.subtitle}>
        Renseignez vos informations personnelles pour compléter votre profil
      </p>

      {/* Photo de profil */}
      <div className={styles.photoSection}>
        <div className={styles.photoContainer}>
          <div className={styles.photoWrapper}>
            <img 
              src={profileData.profilePicture} 
              alt="Profile" 
              className={styles.photo}
            />
            <div className={styles.photoOverlay}>
              <button 
                type="button"
                onClick={triggerFileInput}
                className={styles.changePhotoBtn}
              >
                📷
              </button>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className={styles.fileInput}
          />
          <button 
            type="button"
            onClick={triggerFileInput}
            className={styles.changePhotoText}
          >
            Changer de photo
          </button>
        </div>
      </div>

      <div className={styles.formGrid}>
        <div className={styles.formGroup}>
          <label htmlFor="firstName" className={styles.label}>Prénom</label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            value={profileData.firstName}
            onChange={handleInputChange}
            className={styles.input}
            placeholder="Leo"
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="lastName" className={styles.label}>Nom de famille</label>
          <input
            type="text"
            id="lastName"
            name="lastName"
            value={profileData.lastName}
            onChange={handleInputChange}
            className={styles.input}
            placeholder="Duponyl"
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="email" className={styles.label}>Email</label>
          <input
            type="email"
            id="email"
            name="email"
            value={profileData.email}
            onChange={handleInputChange}
            className={styles.input}
            placeholder="leo.duponyl@email.com"
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="phone" className={styles.label}>Téléphone</label>
          <div className={styles.phoneInput}>
            <select
              name="countryCode"
              value={profileData.countryCode}
              onChange={handleInputChange}
              className={styles.countryCode}
            >
              {countryCodes.map(country => (
                <option key={country.code} value={country.code}>
                  {country.flag} {country.code}
                </option>
              ))}
            </select>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={profileData.phone}
              onChange={handleInputChange}
              className={styles.phoneField}
              placeholder="6 12 34 56 78"
            />
          </div>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="gender" className={styles.label}>Genre</label>
          <select
            id="gender"
            name="gender"
            value={profileData.gender}
            onChange={handleInputChange}
            className={styles.select}
          >
            <option value="">Sélectionnez</option>
            <option value="female">Femme</option>
            <option value="male">Homme</option>
            <option value="other">Autre</option>
          </select>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="birthDate" className={styles.label}>Date de naissance</label>
          <input
            type="date"
            id="birthDate"
            name="birthDate"
            value={profileData.birthDate}
            onChange={handleInputChange}
            className={styles.input}
          />
        </div>

        <div className={`${styles.formGroup} ${styles.fullWidth}`}>
          <label htmlFor="address" className={styles.label}>Adresse personnelle</label>
          <textarea
            id="address"
            name="address"
            value={profileData.address}
            onChange={handleInputChange}
            className={styles.textarea}
            placeholder="96 Rue de Chevilly, 94240 L'Hay-les-Roses, France"
            rows={3}
          />
        </div>
      </div>
    </div>
  );
};

export default GeneralInfoStep;