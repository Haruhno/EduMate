import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Circle, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import styles from './LocationStep.module.css';

// Fix pour les icônes Leaflet dans React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface LocationStepProps {
  profileData: any;
  setProfileData: (data: any) => void;
  role: string;
}

interface Suggestion {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    country?: string;
  };
}

// Composant pour mettre à jour la carte quand le rayon change
const MapUpdater: React.FC<{ center: [number, number]; radius: number }> = ({ center, radius }) => {
  const map = useMap();
  
  useEffect(() => {
    if (center && center[0] !== 0 && center[1] !== 0) {
      map.setView(center, Math.max(10, 13 - Math.log(radius)));
    }
  }, [center, radius, map]);

  return null;
};

// Slider jaune
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
      <div className={styles.sliderProgress} style={{ width: `${percentage}%` }}></div>
      <div className={styles.sliderThumb} style={{ left: `${percentage}%` }}></div>
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

const LocationStep: React.FC<LocationStepProps> = ({ profileData, setProfileData, role }) => {
  const [mapCenter, setMapCenter] = useState<[number, number]>([48.7769, 2.3445]); // L'Hay-les-Roses par défaut
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Fermer les suggestions quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current && 
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fonction pour rechercher des suggestions d'adresses
  const searchAddressSuggestions = async (query: string) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5&countrycodes=`
      );
      const data = await response.json();
      setSuggestions(data);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Erreur de recherche d\'adresses:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour sélectionner une suggestion
  const handleSuggestionSelect = (suggestion: Suggestion) => {
    const newCenter: [number, number] = [parseFloat(suggestion.lat), parseFloat(suggestion.lon)];
    setMapCenter(newCenter);
    
    // Mettre à jour les données de localisation
    setProfileData((prev: any) => ({
      ...prev,
      location: {
        ...prev.location,
        address: suggestion.display_name,
        city: suggestion.address?.city || suggestion.address?.town || suggestion.address?.village || suggestion.address?.municipality || '',
        latitude: suggestion.lat,
        longitude: suggestion.lon
      }
    }));

    setShowSuggestions(false);
    setSuggestions([]);
  };

  // Gérer le changement de l'adresse avec debounce
  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    
    setProfileData((prev: any) => ({
      ...prev,
      location: {
        ...prev.location,
        address: value
      }
    }));

    // Rechercher des suggestions après un délai
    const timeoutId = setTimeout(() => {
      searchAddressSuggestions(value);
    }, 300);

    return () => clearTimeout(timeoutId);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfileData((prev: any) => ({
      ...prev,
      location: {
        ...prev.location,
        [name]: value
      }
    }));
    window.dispatchEvent(new CustomEvent('profileFieldUpdated', { detail: { field: name } }));
  };

  const handleRadiusChange = (value: number) => {
    setProfileData((prev: any) => ({
      ...prev,
      location: {
        ...prev.location,
        radius: value
      }
    }));
    window.dispatchEvent(new CustomEvent('profileFieldUpdated', { detail: { field: 'radius' } }));
  };

  const cities = [
    "L'Hay-les-Roses, France",
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
        Indiquez votre lieu de résidence {role === 'tutor' ? "et votre zone d'intervention" : ''}
      </p>

      <div className={styles.formGrid}>
        <div className={`${styles.formGroup} ${styles.fullWidth}`}>
          <label htmlFor="address" className={styles.label}>Adresse principale</label>
          <div className={styles.autocompleteContainer}>
            <input
              ref={inputRef}
              id="address"
              name="address"
              value={profileData.location.address || ''}
              onChange={handleAddressChange}
              onFocus={() => {
                if (suggestions.length > 0) {
                  setShowSuggestions(true);
                }
              }}
              className={styles.input}
              placeholder="Commencez à taper votre adresse (rue, ville, pays)..."
              autoComplete="off"
            />
            {isLoading && (
              <div className={styles.loadingSpinner}>
                <div className={styles.spinner}></div>
              </div>
            )}
            {showSuggestions && suggestions.length > 0 && (
              <div ref={suggestionsRef} className={styles.suggestionsDropdown}>
                {suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className={styles.suggestionItem}
                    onClick={() => handleSuggestionSelect(suggestion)}
                  >
                    <div className={styles.suggestionText}>
                      {suggestion.display_name}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <p className={styles.helpText}>
            Tapez au moins 3 caractères pour voir les suggestions d'adresses internationales
          </p>
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
            placeholder="La ville sera automatiquement remplie"
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
                <span className={styles.radiusValue}>
                  {profileData.location.radius || 5} km
                </span>
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
                <MapContainer
                  center={mapCenter}
                  zoom={13}
                  style={{ height: '100%', width: '100%' }}
                  scrollWheelZoom={true}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://wikimedia.org/">Wikimedia</a>'
                    url="https://maps.wikimedia.org/osm-intl/{z}/{x}/{y}.png"
                  />
                  <Marker position={mapCenter} />
                  <Circle
                    center={mapCenter}
                    radius={(profileData.location.radius || 5) * 1000} // Conversion en mètres
                    pathOptions={{
                      fillColor: '#FBBF24',
                      fillOpacity: 0.2,
                      color: '#FB923C',
                      weight: 2
                    }}
                  />
                  <MapUpdater center={mapCenter} radius={profileData.location.radius || 5} />
                </MapContainer>
              </div>
              <p className={styles.helpText}>
                Le cercle jaune représente votre zone d'intervention de {profileData.location.radius || 5} km
              </p>
            </div>
          </>
        )}

        {role === 'student' && (
          <div className={`${styles.formGroup} ${styles.fullWidth}`}>
            <label className={styles.label}>Votre localisation</label>
            <div className={styles.mapContainer}>
              <MapContainer
                center={mapCenter}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://wikimedia.org/">Wikimedia</a>'
                  url="https://maps.wikimedia.org/osm-intl/{z}/{x}/{y}.png"
                />
                <Marker position={mapCenter} />
                <MapUpdater center={mapCenter} radius={5} />
              </MapContainer>
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