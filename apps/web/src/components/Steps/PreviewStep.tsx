import React, { useEffect, useRef } from 'react';
import styles from './PreviewStep.module.css';
import defaultAvatar from '../../assets/images/avatar.jpg';

interface PreviewStepProps {
  profileData: any;
  role: string;
}

interface Diploma {
  id?: string;
  educationLevel: string;
  field: string;
  school: string;
  country: string;
  startYear: number | '';
  endYear: number | '';
  isCurrent: boolean;
  diplomaFile?: any;
}

const PreviewStep: React.FC<PreviewStepProps> = ({ profileData, role }) => {
    const previewRef = useRef<HTMLDivElement>(null);
    const lastProfileDataRef = useRef<string>("");

    useEffect(() => {
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

    // Fonction pour formater la période
    const formatYearRange = (startYear: number | '', endYear: number | '', isCurrent: boolean) => {
        if (isCurrent) {
            return `${startYear} - En cours`;
        }
        return endYear ? `${startYear} - ${endYear}` : `${startYear}`;
    };

    // Vérifier s'il y a des diplômes multiples
    const hasMultipleDiplomas = profileData.diplomas && profileData.diplomas.length > 1;
    const hasSingleDiploma = profileData.diplomas && profileData.diplomas.length === 1;
    const firstDiploma = hasSingleDiploma ? profileData.diplomas[0] : null;

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
                            <span className={styles.infoValue}>{profileData.address}</span>
                        </div>
                    )}
                </div>
            </div>

            {/*  Section Diplômes style pout plusieurs diplômes */}
            {hasMultipleDiplomas && profileData.diplomas.some((diploma: Diploma) => 
                diploma.educationLevel || diploma.field || diploma.school || diploma.country
            ) && (
                <>
                    <div className={styles.separator}></div>
                    <div className={styles.section}>
                        <h4 className={styles.sectionTitle}>
                            {role === 'student' ? 'Parcours académique' : 'Diplômes'}
                        </h4>
                        <div className={styles.diplomasList}>
                            {profileData.diplomas.map((diploma: Diploma, index: number) => (
                                // Afficher seulement les diplômes qui ont au moins un champ rempli
                                (diploma.educationLevel || diploma.field || diploma.school || diploma.country) && (
                                    <div key={diploma.id || index} className={styles.diplomaItem}>
                                        <div className={styles.diplomaHeader}>
                                            {diploma.educationLevel && (
                                                <h5 className={styles.diplomaTitle}>{diploma.educationLevel}</h5>
                                            )}
                                            {/* Afficher la période seulement si startYear est rempli */}
                                            {diploma.startYear && (
                                                <span className={styles.diplomaPeriod}>
                                                    {formatYearRange(diploma.startYear, diploma.endYear, diploma.isCurrent)}
                                                </span>
                                            )}
                                        </div>
                                        {(diploma.field || diploma.school || diploma.country) && (
                                            <div className={styles.diplomaDetails}>
                                                {diploma.field && (
                                                    <p className={styles.diplomaField}>
                                                        <strong>Domaine:</strong> {diploma.field}
                                                    </p>
                                                )}
                                                {diploma.school && (
                                                    <p className={styles.diplomaSchool}>
                                                        <strong>Établissement:</strong> {diploma.school}
                                                    </p>
                                                )}
                                                {diploma.country && (
                                                    <p className={styles.diplomaCountry}>
                                                        <strong>Pays:</strong> {diploma.country}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                        {diploma.diplomaFile && (
                                            <div className={styles.diplomaFile}>
                                                <span className={styles.fileName}>
                                                    📎 {diploma.diplomaFile.name}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )
                            ))}
                        </div>
                    </div>
                </>
            )}

            {/*Section Diplômes style pour un seul diplôme*/}
            {(hasSingleDiploma || profileData.educationLevel || profileData.school || profileData.field) && 
            !hasMultipleDiplomas && 
            // Vérifier qu'il y a au moins une donnée significative
            (firstDiploma?.educationLevel || firstDiploma?.field || firstDiploma?.school || firstDiploma?.country || 
            profileData.educationLevel || profileData.field || profileData.school) && (
                <>
                    <div className={styles.separator}></div>
                    <div className={styles.section}>
                        <h4 className={styles.sectionTitle}>
                            {role === 'student' ? 'Parcours académique' : 'Diplômes'}
                        </h4>
                        <div className={styles.infoGrid}>
                            {/* Afficher chaque champ seulement s'il est rempli */}
                            {(firstDiploma?.educationLevel || profileData.educationLevel) && (
                                <div className={styles.infoItem}>
                                    <span className={styles.infoLabel}>Niveau</span>
                                    <span className={styles.infoValue}>
                                        {firstDiploma?.educationLevel || profileData.educationLevel}
                                    </span>
                                </div>
                            )}
                            {(firstDiploma?.field || profileData.field) && (
                                <div className={styles.infoItem}>
                                    <span className={styles.infoLabel}>Domaine</span>
                                    <span className={styles.infoValue}>
                                        {firstDiploma?.field || profileData.field}
                                    </span>
                                </div>
                            )}
                            {(firstDiploma?.school || profileData.school) && (
                                <div className={styles.infoItem}>
                                    <span className={styles.infoLabel}>Établissement</span>
                                    <span className={styles.infoValue}>
                                        {firstDiploma?.school || profileData.school}
                                    </span>
                                </div>
                            )}
                            {/* Année pour le diplôme unique - seulement si startYear est rempli */}
                            {firstDiploma?.startYear && (
                                <div className={styles.infoItem}>
                                    <span className={styles.infoLabel}>Période</span>
                                    <span className={styles.infoValue}>
                                        {formatYearRange(firstDiploma.startYear, firstDiploma.endYear, firstDiploma.isCurrent)}
                                    </span>
                                </div>
                            )}
                            {/* Année pour l'ancien système */}
                            {!firstDiploma && profileData.year && (
                                <div className={styles.infoItem}>
                                    <span className={styles.infoLabel}>Année</span>
                                    <span className={styles.infoValue}>{profileData.year}</span>
                                </div>
                            )}
                            {/* Pays pour le diplôme unique */}
                            {firstDiploma?.country && (
                                <div className={styles.infoItem}>
                                    <span className={styles.infoLabel}>Pays</span>
                                    <span className={styles.infoValue}>{firstDiploma.country}</span>
                                </div>
                            )}
                            {/* Fichier pour le diplôme unique */}
                            {firstDiploma?.diplomaFile && (
                                <div className={styles.infoItem}>
                                    <span className={styles.infoLabel}>Diplôme</span>
                                    <span className={styles.infoValue}>
                                        📎 {firstDiploma.diplomaFile.name}
                                    </span>
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
            {role === 'tutor' && profileData.availability && (profileData.availability.online || profileData.availability.inPerson) && (
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
            {profileData.location && (profileData.location.address || profileData.location.city) && (
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