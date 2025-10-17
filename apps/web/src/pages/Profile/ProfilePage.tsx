import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './ProfilePage.module.css';
import profileService from '../../services/profileService';
import authService from '../../services/authService';
import type { ProfileData } from '../../services/profileService';

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
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
            setProfileData(response.data.profile);
            calculateCompletion(response.data.profile);
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

  const calculateCompletion = (profile: ProfileData) => {
    let completedFields = 0;
    const totalFields = 8;

    if (profile.firstName?.trim()) completedFields++;
    if (profile.lastName?.trim()) completedFields++;
    if (profile.email?.trim()) completedFields++;
    if (profile.phone?.trim()) completedFields++;
    if (profile.birthDate) completedFields++;
    if (profile.gender) completedFields++;
    if (profile.address?.trim()) completedFields++;
    if (profile.educationLevel?.trim()) completedFields++;

    const percentage = Math.round((completedFields / totalFields) * 100);
    setCompletionPercentage(percentage);
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
      {/* Header simple et propre */}
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
        {/* Section principale */}
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
            </div>
          </div>

          {/* Section À propos */}
          {profileData?.bio && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <svg className={styles.sectionIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                À propos
              </h3>
              <p className={styles.bio}>{profileData.bio}</p>
            </div>
          )}

          {/* Section Disponibilités */}
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
        </div>

        {/* Section secondaire */}
        <div className={styles.sidebar}>
          {/* Carte Éducation */}
          {profileData?.educationLevel && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <svg className={styles.sectionIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                </svg>
                {user?.role === 'student' ? 'Études' : 'Diplômes'}
              </h3>
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <label>
                    <svg className={styles.infoIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    Niveau d'étude
                  </label>
                  <p className={styles.educationText}>{profileData.educationLevel}</p>
                </div>
                <div className={styles.infoItem}>
                  <label>
                    <svg className={styles.infoIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Établissement
                  </label>
                  <p className={styles.educationText} title={profileData.school}>
                    {profileData.school || 'Non renseigné'}
                  </p>
                </div>
                <div className={styles.infoItem}>
                  <label>
                    <svg className={styles.infoIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    Domaine
                  </label>
                  <p className={styles.educationText}>{profileData.field || 'Non renseigné'}</p>
                </div>
                <div className={styles.infoItem}>
                  <label>
                    <svg className={styles.infoIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Année
                  </label>
                  <p className={styles.educationText}>{profileData.year || 'Non renseignée'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Carte Localisation */}
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
                
                {/* Carte Leaflet */} 
                <div className={styles.mapContainer}>
                  <div className={styles.mapPlaceholder}>
                    <div className={styles.mapMarker}>
                      <svg className={styles.markerIcon} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </div>

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

          {/* Carte Spécialités */}
          {user?.role === 'tutor' && profileData?.specialties && profileData.specialties.length > 0 && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <svg className={styles.sectionIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Spécialités
              </h3>
              <div className={styles.specialties}>
                {profileData.specialties.map((specialty, index) => (
                  <span key={index} className={styles.specialtyTag}>
                    {specialty}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;