import React, { useEffect, useRef } from 'react';
import styles from './LocationStep.module.css';

interface LocationStepProps {
  profileData: any;
  setProfileData: (data: any) => void;
  role: string;
}

// Composant Slider Material UI
const MaterialSlider: React.FC<{
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}> = ({ value, min, max, step, onChange }) => {
  const percentage = ((value - min) / (max - min)) * 100;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(Number(e.target.value));
  };

  return (
    <div className={styles.sliderContainer}>
      <div className={styles.sliderBackground}></div>
      <div 
        className={styles.sliderProgress} 
        style={{ width: `${percentage}%` }}
      ></div>
      <div 
        className={styles.sliderThumb}
        style={{ left: `${percentage}%` }}
      ></div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleChange}
        className={styles.sliderInput}
      />
    </div>
  );
};

const LocationStep: React.FC<LocationStepProps> = ({
  profileData,
  setProfileData,
  role
}) => {
  const mapRef = useRef<HTMLDivElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfileData((prev: any) => ({
      ...prev,
      location: {
        ...prev.location,
        [name]: value
      }
    }));
    window.dispatchEvent(
      new CustomEvent('profileFieldUpdated', { detail: { field: name } })
    );
  };

  const handleRadiusChange = (value: number) => {
    setProfileData((prev: any) => ({
      ...prev,
      location: {
        ...prev.location,
        radius: value
      }
    }));
    window.dispatchEvent(
      new CustomEvent('profileFieldUpdated', { detail: { field: 'radius' } })
    );
  };

  // Simulation de carte avec canvas
  useEffect(() => {
    if (mapRef.current && role === 'tutor') {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 400;
      canvas.height = 300;
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.borderRadius = '8px';
      
      mapRef.current.innerHTML = '';
      mapRef.current.appendChild(canvas);

      if (ctx) {
        // Fond de carte
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Grille
        ctx.strokeStyle = '#e9ecef';
        ctx.lineWidth = 1;
        for (let i = 0; i < canvas.width; i += 20) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i, canvas.height);
          ctx.stroke();
        }
        for (let i = 0; i < canvas.height; i += 20) {
          ctx.beginPath();
          ctx.moveTo(0, i);
          ctx.lineTo(canvas.width, i);
          ctx.stroke();
        }
        
        // Cercle de rayon
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radiusPixels = (profileData.location.radius || 5) * 4;
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, radiusPixels, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(0, 123, 255, 0.1)';
        ctx.fill();
        ctx.strokeStyle = '#007bff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Point central
        ctx.beginPath();
        ctx.arc(centerX, centerY, 5, 0, 2 * Math.PI);
        ctx.fillStyle = '#007bff';
        ctx.fill();
        
        // Texte du rayon
        ctx.fillStyle = '#007bff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${profileData.location.radius || 5} km`, centerX, centerY - radiusPixels - 10);
        
        // Légende
        ctx.fillStyle = '#333';
        ctx.font = '12px Arial';
        ctx.fillText('Votre zone d\'intervention', centerX, 20);
      }
    }
  }, [profileData.location.radius, role]);

  const cities = [
    'L\'Hay-les-Roses, France',
    'Paris, France',
    'Lyon, France',
    'Marseille, France',
    'Toulouse, France',
    'Nice, France',
    'Nantes, France',
    'Strasbourg, France',
    'Montpellier, France',
    'Bordeaux, France'
  ];

  return (
    <div className={styles.container}>
      <h2>Votre localisation</h2>
      <p className={styles.subtitle}>
        Indiquez votre lieu de résidence {role === 'tutor' ? 'et votre zone d\'intervention' : ''}
      </p>

      <div className={styles.formGrid}>
        <div className={`${styles.formGroup} ${styles.fullWidth}`}>
          <label htmlFor="address" className={styles.label}>Adresse principale</label>
          <input
            id="address"
            name="address"
            value={profileData.location.address || ''}
            onChange={handleInputChange}
            className={styles.input}
            placeholder="96 Rue de Chevilly, 94240 L'Hay-les-Roses, France"
          />
        </div>

        <div className={`${styles.formGroup} ${styles.fullWidth}`}>
          <label htmlFor="city" className={styles.label}>Ville</label>
          <input
            type="text"
            id="city"
            name="city"
            value={profileData.location.city || ''}
            onChange={handleInputChange}
            className={styles.input}
            placeholder="L'Hay-les-Roses"
            list="cities"
          />
          <datalist id="cities">
            {cities.map(city => (
              <option key={city} value={city} />
            ))}
          </datalist>
        </div>

        {role === 'tutor' && (
          <>
            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
              <div className={styles.radiusHeader}>
                <label className={styles.label}>Rayon d'intervention</label>
                <span className={styles.radiusValue}>{profileData.location.radius || 5} km</span>
              </div>
              
              <div className={styles.rangeContainer}>
                <MaterialSlider
                  value={profileData.location.radius || 5}
                  min={5}
                  max={50}
                  step={1}
                  onChange={handleRadiusChange}
                />
                <div className={styles.rangeLabels}>
                  <span>5 km</span>
                  <span>50 km</span>
                </div>
              </div>
              <p className={styles.helpText}>
                Définissez la distance maximale que vous êtes prêt à parcourir pour des cours en présentiel
              </p>
            </div>

            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
              <label className={styles.label}>Carte de votre zone d'intervention</label>
              <div className={styles.mapContainer}>
                <div ref={mapRef} className={styles.mapPlaceholder}>
                  {/* La carte sera injectée ici via useEffect */}
                </div>
              </div>
              <p className={styles.helpText}>
                Le cercle bleu représente votre zone d'intervention de {profileData.location.radius || 5} km
              </p>
            </div>
          </>
        )}

        {role === 'student' && (
          <div className={`${styles.formGroup} ${styles.fullWidth}`}>
            <label className={styles.label}>Votre localisation</label>
            <div className={styles.mapContainer}>
              <div className={styles.studentMap}>
                🗺️ Carte interactive - Localisation étudiante
                <div className={styles.mapPin}>📍</div>
              </div>
            </div>
            <p className={styles.helpText}>
              Votre position sera affichée sur la carte
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LocationStep;