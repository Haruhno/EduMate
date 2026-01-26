import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Circle, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import styles from './ProfilePage.module.css';
import profileService from '../../services/profileService';
import authService from '../../services/authService';
import type { ProfileData } from '../../services/profileService';

// Fix pour les icônes Leaflet dans React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapUpdaterProps {
  center: [number, number];
  radius?: number;
}

// Composant pour mettre à jour la carte
const MapUpdater: React.FC<MapUpdaterProps> = ({ center, radius = 5 }) => {
  const map = useMap();
  
  useEffect(() => {
    if (center && center[0] !== 0 && center[1] !== 0) {
      const zoom = radius ? Math.max(10, 13 - Math.log(radius)) : 13;
      map.setView(center, zoom);
    }
  }, [center, radius, map]);

  return null;
};

interface Diploma {
  id: string;
  educationLevel: string;
  field: string;
  school: string;
  country: string;
  startYear: number;
  endYear: number | null;
  isCurrent: boolean;
  diplomaFile?: {
    name: string;
    path: string;
    size: number;
  } | null;
}

interface Experience {
  id: string;
  jobTitle: string;
  employmentType: string;
  company: string;
  location: string;
  startMonth: string;
  startYear: number;
  endMonth: string;
  endYear: number | null;
  isCurrent: boolean;
  description: string;
}

// Composant de carte pour le profil
const ProfileMap: React.FC<{ 
  location: any; 
  isTutor: boolean;
}> = ({ location, isTutor }) => {
  const [mapCenter, setMapCenter] = useState<[number, number]>([48.7769, 2.3445]); // L'Haÿ-les-Roses par défaut
  const [isLoading, setIsLoading] = useState(true);

  // Fonction pour géocoder l'adresse si les coordonnées sont invalides
  const geocodeAddress = async (address: string): Promise<[number, number] | null> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      }
    } catch (error) {
      console.error('Erreur de géocodage:', error);
    }
    return null;
  };

  useEffect(() => {
    const loadMapCenter = async () => {
      setIsLoading(true);
      
      // Vérifie d'abord si on a des coordonnées valides (pas 0,0)
      if (location.coordinates?.lat !== 0 && location.coordinates?.lng !== 0) {
        console.log('Utilisation des coordonnées stockées:', location.coordinates);
        setMapCenter([location.coordinates.lat, location.coordinates.lng]);
      } 
      // Sinon, géocode l'adresse
      else if (location.address) {
        console.log('Géocodage de l\'adresse:', location.address);
        const coords = await geocodeAddress(location.address);
        if (coords) {
          setMapCenter(coords);
        } else {
          // Si échec, utilise L'Haÿ-les-Roses par défaut
          setMapCenter([48.7769, 2.3445]);
        }
      } 
      // Sinon, utilise les coordonnées par défaut
      else {
        setMapCenter([48.7769, 2.3445]);
      }
      
      setIsLoading(false);
    };

    loadMapCenter();
  }, [location]);

  if (isLoading) {
    return (
      <div className={styles.mapContainer} style={{ 
        height: '300px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px'
      }}>
        <div className={styles.spinner} style={{
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #FBBF24',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          animation: 'spin 1s linear infinite'
        }}></div>
        <span style={{ marginLeft: '10px' }}>Chargement de la carte...</span>
      </div>
    );
  }

  return (
    <div className={styles.mapContainer}>
      <MapContainer
        center={mapCenter}
        zoom={isTutor ? 13 : 14}
        style={{ height: '300px', width: '100%', borderRadius: '8px' }}
        scrollWheelZoom={false}
        className={styles.leafletMap}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={mapCenter} />
        
        {isTutor && location.radius && (
          <Circle
            center={mapCenter}
            radius={(location.radius || 5) * 1000}
            pathOptions={{
              fillColor: '#FBBF24',
              fillOpacity: 0.2,
              color: '#FB923C',
              weight: 2
            }}
          />
        )}
        
        <MapUpdater 
          center={mapCenter} 
          radius={isTutor ? location.radius : undefined}
        />
      </MapContainer>
    </div>
  );
};
  
const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [diplomas, setDiplomas] = useState<Diploma[]>([]);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [completionPercentage, setCompletionPercentage] = useState(0);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setIsLoading(true);
        const currentUser = authService.getCurrentUser();
        setUser(currentUser);

        if (currentUser) {
          const response = await profileService.getProfile();
          if (response.success && response.data.profile) {
            const profile = response.data.profile;
            setProfileData(profile);
            
            // Debug: vérifier les coordonnées
            console.log('Profile location:', profile.location);
            console.log('Coordinates:', profile.location?.coordinates);
            
            if (profile.diplomas && Array.isArray(profile.diplomas)) {
              setDiplomas(profile.diplomas);
            }
            
            if (profile.experiences && Array.isArray(profile.experiences)) {
              setExperiences(profile.experiences);
            }
            
            calculateCompletion(profile, currentUser);
          }
        }
      } catch (error) {
        console.error('Erreur lors du chargement du profil:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, []);

  const calculateCompletion = (profile: ProfileData, user: any) => {
    const checks: {name: string, completed: boolean}[] = [];

    // Les champs de l'utilisateur qui sont stockés dans user
    checks.push({name: 'firstName', completed: !!(user?.firstName && String(user.firstName).trim())});
    checks.push({name: 'lastName', completed: !!(user?.lastName && String(user.lastName).trim())});
    checks.push({name: 'email', completed: !!(user?.email && String(user.email).trim())});

    // Les champs du profil qui sont stockés dans profil
    checks.push({name: 'phone', completed: !!(profile?.phone && String(profile.phone).trim())});
    checks.push({name: 'birthDate', completed: !!profile?.birthDate});
    checks.push({name: 'gender', completed: !!(profile?.gender && String(profile.gender).trim())});
    checks.push({name: 'address', completed: !!(profile?.address && String(profile.address).trim())});
    checks.push({name: 'bio', completed: !!(profile?.bio && String(profile.bio).trim())});

    // Compétences maitrisées (pour tous)
    const skillsToTeachCompleted = !!(profile?.skillsToTeach && profile.skillsToTeach.length > 0);
    checks.push({name: 'skillsToTeach', completed: skillsToTeachCompleted});

    // Compétences à acquérir (pour tous)
    const skillsToLearnCompleted = !!(profile?.skillsToLearn && profile.skillsToLearn.length > 0);
    checks.push({name: 'skillsToLearn', completed: skillsToLearnCompleted});

    // Photo
    const photoCompleted = !!(profile?.profilePicture && profile.profilePicture !== '/assets/images/avatar.jpg');
    checks.push({name: 'profilePicture', completed: photoCompleted});

    // Education
    checks.push({name: 'diplomas', completed: !!(profile?.diplomas && profile.diplomas.length > 0)});

    // Experiences (seulement pour tuteur)
    if (user?.role === 'tutor') {
      checks.push({name: 'experiences', completed: !!(profile?.experiences && profile.experiences.length > 0)});
    }

    // Availability (seulement pour tuteur)
    if (user?.role === 'tutor') {
      const availabilityCompleted = !!(profile?.availability && (
        profile.availability.online === true || 
        profile.availability.inPerson === true
      ));
      checks.push({name: 'availability', completed: availabilityCompleted});
    }

    // Location - vérifie l'adresse ET des coordonnées valides (pas 0,0)
    const locationCompleted = !!(profile?.location?.address && String(profile.location.address).trim()) && 
      (profile.location.coordinates?.lat !== 0 || profile.location.coordinates?.lng !== 0);
    checks.push({name: 'location', completed: locationCompleted});

    // Calcul
    const completedFields = checks.filter(check => check.completed).length;
    const totalFields = checks.length;

    setCompletionPercentage(Math.round((completedFields / totalFields) * 100));
  };
  
  const handleEditProfile = () => {
    navigate('/completer-profil', {
      state: {
        role: user?.role,
        continueProfile: true,
        profileData: profileData
      }
    });
  };

  const formatYearRange = (startYear: number, endYear: number | null, isCurrent: boolean) => {
    if (isCurrent) {
      return `${startYear} - En cours`;
    }
    return endYear ? `${startYear} - ${endYear}` : `${startYear}`;
  };

  const formatExperiencePeriod = (startMonth: string, startYear: number, endMonth: string, endYear: number | null, isCurrent: boolean) => {
    if (isCurrent) {
      return `${startMonth} ${startYear} - En cours`;
    }
    return `${startMonth} ${startYear} - ${endMonth} ${endYear}`;
  };

  // Vérifier le nombre d'éléments
  const hasMultipleDiplomas = diplomas.length > 1;
  const hasSingleDiploma = diplomas.length === 1;
  const hasMultipleExperiences = experiences.length > 1;
  const hasSingleExperience = experiences.length === 1;
  
  // Vérifier si l'utilisateur a au moins une expérience professionnelle valide
  const hasValidExperiences = () => {
    if (experiences.length === 0) return false;
    
    // Vérifier si au moins une expérience a des données significatives
    return experiences.some(exp => 
      exp.jobTitle?.trim() || 
      exp.company?.trim() || 
      exp.employmentType?.trim()
    );
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <span>Chargement de votre profil...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Mon Profil</h1>
          <button onClick={handleEditProfile} className={styles.editButton}>
            <svg className={styles.editIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Modifier le profil
          </button>
        </div>
        
        {/* Barre de progression */}
        <div className={styles.progressSection}>
          <div className={styles.progressInfo}>
            <span className={styles.progressText}>
              <svg className={styles.progressIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Profil complété à {completionPercentage}%
            </span>
            <span className={styles.progressPercentage}>{completionPercentage}%</span>
          </div>
          <div className={styles.progressBar}>
            <div 
              className={styles.progressFill} 
              style={{ width: `${completionPercentage}%` }}
            ></div>
          </div>
        </div>
      </div>
   
      <div className={styles.profileContent}>
        {/* Section principale - Gauche */}
        <div className={styles.mainSection}>
          {/* Carte profil */}
          <div className={styles.section}>
            <div className={styles.profilePictureSection}>
              <img 
                src={profileData?.profilePicture || '/assets/images/avatar.jpg'} 
                alt="Photo de profil" 
                className={styles.profilePicture}
              />
              <div className={styles.profileInfo}>
                <div className={styles.roleBadge}>
                  {user?.role === 'student' ? 'Étudiant' : 'Tuteur'}
                </div>
                <h2 className={styles.userName}>
                  <svg className={styles.userIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {user?.firstName} {user?.lastName}
                </h2>
                <p className={styles.userEmail}>
                  <svg className={styles.emailIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {user?.email}
                </p>
              </div>
            </div>
          </div>

          {/* Informations personnelles */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>
              <svg className={styles.sectionIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Informations personnelles
            </h3>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <label>
                  <svg className={styles.infoIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  Téléphone
                </label>
                <p>{profileData?.phone || 'Non renseigné'}</p>
              </div>
              <div className={styles.infoItem}>
                <label>
                  <svg className={styles.infoIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Genre
                </label>
                <p>{profileData?.gender || 'Non renseigné'}</p>
              </div>
              <div className={styles.infoItem}>
                <label>
                  <svg className={styles.infoIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Date de naissance
                </label>
                <p>
                  {profileData?.birthDate 
                    ? new Date(profileData.birthDate).toLocaleDateString('fr-FR')
                    : 'Non renseignée'
                  }
                </p>
              </div>
              <div className={styles.infoItem}>
                <label>
                  <svg className={styles.infoIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Adresse
                </label>
                <p>{profileData?.address || 'Non renseignée'}</p>
              </div>
              {/* Section À propos */}
              {profileData?.bio && (
                <div className={styles.infoItemFullWidth}>
                  <label>
                    <svg className={styles.infoIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    À propos
                  </label>
                  <p className={styles.bio}>{profileData.bio}</p>
                </div>
              )}
            </div>
          </div>

          {/* Section Diplômes - Style multiple */}
          {hasMultipleDiplomas && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <svg className={styles.sectionIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                </svg>
                {user?.role === 'student' ? 'Parcours académique' : 'Diplômes'}
              </h3>
              <div className={styles.diplomasList}>
                {diplomas.map((diploma, index) => (
                  <div key={diploma.id || index} className={styles.diplomaItem}>
                    <div className={styles.diplomaHeader}>
                      <h4 className={styles.diplomaTitle}>{diploma.educationLevel}</h4>
                      <span className={styles.diplomaPeriod}>
                        {formatYearRange(diploma.startYear, diploma.endYear, diploma.isCurrent)}
                      </span>
                    </div>
                    <div className={styles.diplomaDetails}>
                      <p className={styles.diplomaField}><strong>Domaine:</strong> {diploma.field}</p>
                      <p className={styles.diplomaSchool}><strong>Établissement:</strong> {diploma.school}</p>
                      <p className={styles.diplomaCountry}><strong>Pays:</strong> {diploma.country}</p>
                    </div>
                    {diploma.diplomaFile && (
                      <div className={styles.diplomaFile}>
                        <a 
                          href={diploma.diplomaFile.path} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className={styles.fileLink}
                        >
                          📎 {diploma.diplomaFile.name}
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section Diplôme - Style unique */}
          {hasSingleDiploma && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <svg className={styles.sectionIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                </svg>
                Diplôme
              </h3>
              <div className={styles.infoGrid}>
                {diplomas[0].educationLevel && (
                  <div className={styles.infoItem}>
                    <label>
                      <svg className={styles.infoIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M12 14l9-5-9-5-9 5 9 5z" />
                        <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                      </svg>
                      Niveau d'étude
                    </label>
                    <p>{diplomas[0].educationLevel}</p>
                  </div>
                )}
                {diplomas[0].field && (
                  <div className={styles.infoItem}>
                    <label>
                      <svg className={styles.infoIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Domaine
                    </label>
                    <p>{diplomas[0].field}</p>
                  </div>
                )}
                {diplomas[0].school && (
                  <div className={styles.infoItem}>
                    <label>
                      <svg className={styles.infoIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      Établissement
                    </label>
                    <p>{diplomas[0].school}</p>
                  </div>
                )}
                {diplomas[0].country && (
                  <div className={styles.infoItem}>
                    <label>
                      <svg className={styles.infoIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Pays
                    </label>
                    <p>{diplomas[0].country}</p>
                  </div>
                )}
                {diplomas[0].startYear && (
                  <div className={styles.infoItem}>
                    <label>
                      <svg className={styles.infoIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Période
                    </label>
                    <p>
                      {formatYearRange(diplomas[0].startYear, diplomas[0].endYear, diplomas[0].isCurrent)}
                    </p>
                  </div>
                )}
                {diplomas[0].diplomaFile && (
                  <div className={styles.infoItem}>
                    <label>
                      <svg className={styles.infoIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                      </svg>
                      Diplôme
                    </label>
                    <a 
                      href={diplomas[0].diplomaFile.path} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className={styles.fileLink}
                    >
                      📎 {diplomas[0].diplomaFile.name}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section Expériences professionnelles - Style multiple */}
          {/* MODIFICATION: Afficher UNIQUEMENT s'il y a au moins une expérience valide */}
          {user?.role === 'tutor' && hasValidExperiences() && hasMultipleExperiences && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <svg className={styles.sectionIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Expériences professionnelles
              </h3>
              <div className={styles.experiencesList}>
                {experiences.map((experience, index) => (
                  <div key={experience.id || index} className={styles.experienceItem}>
                    <div className={styles.experienceHeader}>
                      <h4 className={styles.experienceTitle}>{experience.jobTitle}</h4>
                      <span className={styles.experiencePeriod}>
                        {formatExperiencePeriod(
                          experience.startMonth, 
                          experience.startYear, 
                          experience.endMonth, 
                          experience.endYear, 
                          experience.isCurrent
                        )}
                      </span>
                    </div>
                    <div className={styles.experienceDetails}>
                      <p className={styles.experienceCompany}><strong>Entreprise:</strong> {experience.company}</p>
                      <p className={styles.experienceType}><strong>Type d'emploi:</strong> {experience.employmentType}</p>
                      <p className={styles.experienceLocation}><strong>Lieu:</strong> {experience.location}</p>
                    </div>
                    {experience.description && (
                      <div className={styles.experienceDescription}>
                        <p className={styles.experienceDescriptionText}>{experience.description}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section Expérience professionnelle */}
          {/* MODIFICATION: Afficher UNIQUEMENT s'il y a au moins une expérience valide */}
          {user?.role === 'tutor' && hasValidExperiences() && hasSingleExperience && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <svg className={styles.sectionIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Expérience professionnelle
              </h3>
              <div className={styles.infoGrid}>
                {experiences[0].jobTitle && (
                  <div className={styles.infoItem}>
                    <label>
                      <svg className={styles.infoIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Poste
                    </label>
                    <p>{experiences[0].jobTitle}</p>
                  </div>
                )}
                {experiences[0].company && (
                  <div className={styles.infoItem}>
                    <label>
                      <svg className={styles.infoIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      Entreprise
                    </label>
                    <p>{experiences[0].company}</p>
                  </div>
                )}
                {experiences[0].employmentType && (
                  <div className={styles.infoItem}>
                    <label>
                      <svg className={styles.infoIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Type d'emploi
                    </label>
                    <p>{experiences[0].employmentType}</p>
                  </div>
                )}
                {experiences[0].location && (
                  <div className={styles.infoItem}>
                    <label>
                      <svg className={styles.infoIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Lieu
                    </label>
                    <p>{experiences[0].location}</p>
                  </div>
                )}
                {experiences[0].startYear && (
                  <div className={styles.infoItem}>
                    <label>
                      <svg className={styles.infoIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Période
                    </label>
                    <p>
                      {formatExperiencePeriod(
                        experiences[0].startMonth, 
                        experiences[0].startYear, 
                        experiences[0].endMonth, 
                        experiences[0].endYear, 
                        experiences[0].isCurrent
                      )}
                    </p>
                  </div>
                )}
                {experiences[0].description && (
                  <div className={styles.infoItem}>
                    <label>
                      <svg className={styles.infoIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Description
                    </label>
                    <div className={styles.experienceDescription}>
                      <div className={styles.experienceDescriptionText}>{experiences[0].description}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Section secondaire - Droite */}
        <div className={styles.sidebar}>
          {/* Section Compétences */}
          {(profileData?.skillsToTeach && profileData.skillsToTeach.length > 0 || profileData?.skillsToLearn && profileData.skillsToLearn.length > 0) && (
            <>
              {(profileData?.skillsToTeach && profileData.skillsToTeach.length > 0) && (
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>
                    <svg className={styles.sectionIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    Compétences maîtrisées
                  </h3>
                  <div className={styles.skillsContainer}>
                    {profileData.skillsToTeach.map((skill, index) => (
                      <span key={index} className={styles.skillTag}>
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Section Compétences à apprendre (pour tous) */}
              {profileData?.skillsToLearn && profileData.skillsToLearn.length > 0 && (
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>
                    <svg className={styles.sectionIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    Compétences à acquérir
                  </h3>
                  <div className={styles.skillsContainer}>
                    {profileData.skillsToLearn.map((skill, index) => (
                      <span key={index} className={`${styles.skillTag} ${styles.learningSkill}`}>
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Disponibilités */}
          {user?.role === 'tutor' && profileData?.availability && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <svg className={styles.sectionIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Disponibilités
              </h3>
              <div className={styles.availability}>
                <div className={styles.availabilityItem}>
                  <span className={`${styles.availabilityBadge} ${profileData.availability.online ? styles.available : styles.unavailable}`}>
                    {profileData.availability.online ? '✓' : '✗'} En ligne
                  </span>
                </div>
                <div className={styles.availabilityItem}>
                  <span className={`${styles.availabilityBadge} ${profileData.availability.inPerson ? styles.available : styles.unavailable}`}>
                    {profileData.availability.inPerson ? '✓' : '✗'} En présentiel
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Localisation */}
          {profileData?.location?.address && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <svg className={styles.sectionIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Localisation
              </h3>
              <div className={styles.locationSection}>
                <div className={styles.infoItem}>
                  <label>
                    <svg className={styles.infoIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Adresse
                  </label>
                  <p>{profileData.location.address}</p>
                  {profileData.location.city && (
                    <p className={styles.city}>{profileData.location.city}</p>
                  )}
                </div>
                
                {/* Carte Leaflet interactive avec géocodage automatique */}
                <ProfileMap 
                  location={profileData.location} 
                  isTutor={user?.role === 'tutor'} 
                />

                {user?.role === 'tutor' && profileData.location.radius && (
                  <div className={styles.infoItem}>
                    <label>
                      <svg className={styles.infoIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      Rayon d'intervention
                    </label>
                    <p>{profileData.location.radius} km</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;