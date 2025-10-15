import React from 'react';
import styles from './AvailabilityStep.module.css';

interface AvailabilityStepProps {
  profileData: any;
  setProfileData: (data: any) => void;
  role: string;
}

const AvailabilityStep: React.FC<AvailabilityStepProps> = ({
  profileData,
  setProfileData
}) => {
  const handleAvailabilityChange = (type: 'online' | 'inPerson') => {
    setProfileData((prev: any) => ({
      ...prev,
      availability: {
        ...prev.availability,
        [type]: !prev.availability[type]
      }
    }));
    window.dispatchEvent(
      new CustomEvent('profileFieldUpdated', { detail: { field: name } })
    );
  };

  const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  const timeSlots = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];

  return (
    <div className={styles.container}>
      <h2>Votre disponibilité</h2>
      <p className={styles.subtitle}>
        Définissez vos créneaux disponibles pour les cours
      </p>

      <div className={styles.formGrid}>
        <div className={`${styles.formGroup} ${styles.fullWidth}`}>
          <label className={styles.label}>Type de cours</label>
          <div className={styles.availabilityTypes}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={profileData.availability.online}
                onChange={() => handleAvailabilityChange('online')}
                className={styles.checkbox}
              />
              <span className={styles.checkboxText}>En ligne</span>
            </label>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={profileData.availability.inPerson}
                onChange={() => handleAvailabilityChange('inPerson')}
                className={styles.checkbox}
              />
              <span className={styles.checkboxText}>En présentiel</span>
            </label>
          </div>
        </div>

        <div className={`${styles.formGroup} ${styles.fullWidth}`}>
          <label className={styles.label}>Calendrier de disponibilité</label>
          <div className={styles.calendar}>
            <div className={styles.calendarHeader}>
              <div className={styles.timeColumn}></div>
              {days.map(day => (
                <div key={day} className={styles.dayHeader}>{day}</div>
              ))}
            </div>
            
            <div className={styles.calendarBody}>
              {timeSlots.map(time => (
                <div key={time} className={styles.timeRow}>
                  <div className={styles.timeSlot}>{time}</div>
                  {days.map(day => (
                    <div key={day} className={styles.calendarCell}>
                      <input
                        type="checkbox"
                        className={styles.timeCheckbox}
                        onChange={(e) => {
                        }}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <p className={styles.helpText}>
            Cochez les créneaux où vous êtes disponible pour donner des cours
          </p>
        </div>
      </div>
    </div>
  );
};

export default AvailabilityStep;