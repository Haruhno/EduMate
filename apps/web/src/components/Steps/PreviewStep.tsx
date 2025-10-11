import React, { useEffect, useRef } from 'react';
import styles from './PreviewStep.module.css';
import defaultAvatar from '../../assets/images/avatar.jpg';

interface PreviewStepProps {
  profileData: any;
  role: string;
}

const PreviewStep: React.FC<PreviewStepProps> = ({ profileData, role }) => {
    const previewRef = useRef<HTMLDivElement>(null);
    const lastProfileDataRef = useRef<string>("");

    useEffect(() => {
        // On convertit le profil en chaîne pour détecter un vrai changement
        const currentProfileString = JSON.stringify(profileData);
        if (lastProfileDataRef.current !== currentProfileString) {
        lastProfileDataRef.current = currentProfileString;

        if (previewRef.current) {
            previewRef.current.scrollTo({
            top: previewRef.current.scrollHeight,
            behavior: "smooth"
            });
        }
        }
    }, [profileData]);

    return (
        <div className={styles.container} ref={previewRef}>
            <div className={styles.previewHeader}>
                <h3>Votre profil</h3>
            </div>
        
            <div className={styles.profileHeader}>
                <div className={styles.photoContainer}>
                    <img
                    src={profileData.profilePicture || defaultAvatar}
                    alt="Profile"
                    className={styles.photo}
                    onError={(e) => (e.currentTarget.src = defaultAvatar)}
                    />
                </div>
                <div className={styles.nameContainer}>
                    <h2 className={styles.profileName}>
                    {profileData.firstName || 'Prénom'} {profileData.lastName || 'Nom'}
                    </h2>
                    <p className={styles.roleBadge}>
                    {role === 'student' ? 'Étudiant' : 'Tuteur'}
                    </p>
                </div>
            </div>

            {/* Séparateur */}
            <div className={styles.separator}></div>

            {/* Informations générales */}
            <div className={styles.section}>
                <h4 className={styles.sectionTitle}>Informations personnelles</h4>
                <div className={styles.infoGrid}>
                {profileData.email && (
                    <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Email</span>
                    <span className={styles.infoValue}>{profileData.email}</span>
                    </div>
                )}
                {profileData.phone && (
                    <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Téléphone</span>
                    <span className={styles.infoValue}>{profileData.countryCode} {profileData.phone}</span>
                    </div>
                )}
                {profileData.gender && (
                    <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Genre</span>
                    <span className={styles.infoValue}>
                        {profileData.gender === 'female' ? 'Femme' : 
                        profileData.gender === 'male' ? 'Homme' : 
                        profileData.gender === 'other' ? 'Autre' : ''}
                    </span>
                    </div>
                )}
                {profileData.birthDate && (
                    <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Date de naissance</span>
                    <span className={styles.infoValue}>
                        {new Date(profileData.birthDate).toLocaleDateString('fr-FR')}
                    </span>
                    </div>
                )}
                {profileData.address && (
                    <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Adresse</span>
                    <span className={styles.infoValue}>
                    <span className={styles.infoValue}>{profileData.address}</span>
                    </span>
                    </div>
                )}
                </div>
            </div>

            {/* Éducation/Diplômes */}
            {(profileData.educationLevel || profileData.school || profileData.field) && (
                <>
                <div className={styles.separator}></div>
                <div className={styles.section}>
                    <h4 className={styles.sectionTitle}>
                    {role === 'student' ? 'Parcours académique' : 'Diplômes'}
                    </h4>
                    <div className={styles.infoGrid}>
                    {profileData.educationLevel && (
                        <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Niveau</span>
                        <span className={styles.infoValue}>{profileData.educationLevel}</span>
                        </div>
                    )}
                    {profileData.field && (
                        <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Domaine</span>
                        <span className={styles.infoValue}>{profileData.field}</span>
                        </div>
                    )}
                    {profileData.school && (
                        <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Établissement</span>
                        <span className={styles.infoValue}>{profileData.school}</span>
                        </div>
                    )}
                    {profileData.year && (
                        <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Année</span>
                        <span className={styles.infoValue}>{profileData.year}</span>
                        </div>
                    )}
                    </div>
                </div>
                </>
            )}

            {/* Expérience (tuteurs) */}
            {role === 'tutor' && (profileData.experience || profileData.bio || profileData.specialties?.length > 0) && (
                <>
                <div className={styles.separator}></div>
                <div className={styles.section}>
                    <h4 className={styles.sectionTitle}>Expérience</h4>
                    <div className={styles.infoGrid}>
                    {profileData.experience && (
                        <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Expérience</span>
                        <span className={styles.infoValue}>{profileData.experience}</span>
                        </div>
                    )}
                    {profileData.bio && (
                        <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Présentation</span>
                        <p className={styles.bioText}>{profileData.bio}</p>
                        </div>
                    )}
                    {profileData.specialties?.length > 0 && (
                        <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Spécialités</span>
                        <div className={styles.tags}>
                            {profileData.specialties.map((spec: string, index: number) => (
                            <span key={index} className={styles.tag}>{spec}</span>
                            ))}
                        </div>
                        </div>
                    )}
                    </div>
                </div>
                </>
            )}

            {/* Disponibilité (tuteurs) */}
            {role === 'tutor' && (profileData.availability.online || profileData.availability.inPerson) && (
                <>
                <div className={styles.separator}></div>
                <div className={styles.section}>
                    <h4 className={styles.sectionTitle}>Disponibilité</h4>
                    <div className={styles.availability}>
                    {profileData.availability.online && (
                        <span className={styles.availabilityBadge}>En ligne</span>
                    )}
                    {profileData.availability.inPerson && (
                        <span className={styles.availabilityBadge}>En présentiel</span>
                    )}
                    </div>
                </div>
                </>
            )}

            {/* Localisation */}
            {(profileData.location.address || profileData.location.city) && (
                <>
                <div className={styles.separator}></div>
                <div className={styles.section}>
                    <h4 className={styles.sectionTitle}>Localisation</h4>
                    <div className={styles.infoGrid}>
                    {profileData.location.address && (
                        <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Adresse</span>
                        <span className={styles.infoValue}>{profileData.location.address}</span>
                        </div>
                    )}
                    {profileData.location.city && (
                        <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Ville</span>
                        <span className={styles.infoValue}>{profileData.location.city}</span>
                        </div>
                    )}
                    {role === 'tutor' && profileData.location.radius && (
                        <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Rayon d'intervention</span>
                        <span className={styles.infoValue}>{profileData.location.radius} km</span>
                        </div>
                    )}
                    </div>
                </div>
                </>
            )}
        </div>
    );
};

export default PreviewStep;