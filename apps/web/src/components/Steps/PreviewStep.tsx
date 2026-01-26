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

interface Experience {
  id?: string;
  jobTitle: string;
  employmentType: string;
  company: string;
  location: string;
  startMonth: string;
  startYear: number | '';
  endMonth: string;
  endYear: number | '';
  isCurrent: boolean;
  description: string;
}

interface TimeSlot {
  startTime: string;
  endTime: string;
  allDay: boolean;
}

interface DayAvailability {
  date: string;
  timeSlots: TimeSlot[];
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

    // Fonction pour formater la période des diplômes
    const formatYearRange = (startYear: number | '', endYear: number | '', isCurrent: boolean) => {
        if (isCurrent) {
            return `${startYear} - En cours`;
        }
        return endYear ? `${startYear} - ${endYear}` : `${startYear}`;
    };

    // Fonction pour formater la période des expériences
    const formatExperiencePeriod = (startMonth: string, startYear: number | '', endMonth: string, endYear: number | '', isCurrent: boolean) => {
        if (isCurrent) {
            return `${startMonth} ${startYear} - En cours`;
        }
        return `${startMonth} ${startYear} - ${endMonth} ${endYear}`;
    };

    // Fonction pour trier les dates chronologiquement
    const sortDatesChronologically = (dates: DayAvailability[]): DayAvailability[] => {
        return [...dates].sort((a, b) => {
            return new Date(a.date).getTime() - new Date(b.date).getTime();
        });
    };

    // Fonction pour trier les créneaux horaires par heure de début
    const sortTimeSlotsChronologically = (timeSlots: TimeSlot[]): TimeSlot[] => {
        return [...timeSlots].sort((a, b) => {
            const getMinutes = (time: string) => {
            const [hours, minutes] = time.split(':').map(Number);
            return hours * 60 + minutes;
            };
            return getMinutes(a.startTime) - getMinutes(b.startTime);
        });
    };
    // Fonction pour formater l'affichage des dates
    const formatDateDisplay = (dateString: string): string => {
        const date = new Date(dateString);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const isToday = date.toDateString() === today.toDateString();
        const isTomorrow = date.toDateString() === tomorrow.toDateString();
        
        if (isToday) {
            return `Aujourd'hui (${date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })})`;
        } else if (isTomorrow) {
            return `Demain (${date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })})`;
        } else {
            return date.toLocaleDateString('fr-FR', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long',
                year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
            });
        }
    };

    // Vérifier s'il y a des diplômes multiples
    const hasMultipleDiplomas = profileData.diplomas && profileData.diplomas.length > 1;
    const hasSingleDiploma = profileData.diplomas && profileData.diplomas.length === 1;
    const firstDiploma = hasSingleDiploma ? profileData.diplomas[0] : null;

    // Vérifier s'il y a des expériences multiples
    const hasMultipleExperiences = profileData.experiences && profileData.experiences.length > 1;
    const hasSingleExperience = profileData.experiences && profileData.experiences.length === 1;
    const firstExperience = hasSingleExperience ? profileData.experiences[0] : null;

    // Obtenir les disponibilités triées
    const sortedSchedule = profileData.schedule 
        ? sortDatesChronologically(profileData.schedule)
        : [];

    // Fonction pour récupérer les compétences selon le rôle
    const getSkillsToDisplay = () => {
        // Compétences principales (skills générales)
        const mainSkills = profileData.skills || [];
        
        // Compétences spécifiques selon le rôle
        if (role === 'student') {
            // Pour les étudiants: montrer les compétences à acquérir
            const skillsToLearn = profileData.skillsToLearn || [];
            return {
                title: 'Compétences à acquérir',
                skills: [...new Set([...skillsToLearn, ...mainSkills])],
                type: 'learn'
            };
        } else {
            // Pour les tuteurs: montrer les compétences à enseigner
            const skillsToTeach = profileData.skillsToTeach || [];
            return {
                title: 'Compétences à enseigner',
                skills: [...new Set([...skillsToTeach, ...mainSkills])],
                type: 'teach'
            };
        }
    };

    const skillsData = getSkillsToDisplay();

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
                    {/* Description/Bio */}
                    {profileData.bio && (
                    <>
                        <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>Description générale</span>
                            <p className={styles.bioText}>{profileData.bio}</p>
                        </div>
                    </>
                    )}
                </div>
            </div>

            {/* Section Compétences spécifiques */}
            {skillsData.skills.length > 0 && (
                <>
                    <div className={styles.separator}></div>
                    <div className={styles.section}>
                        <h4 className={styles.sectionTitle}>{skillsData.title}</h4>
                        <div className={styles.infoItem}>
                            <div className={styles.tags}>
                                {skillsData.skills.map((skill: string, index: number) => (
                                    <span 
                                        key={index} 
                                        className={`${styles.tag} ${skillsData.type === 'learn' ? styles.learnTag : styles.teachTag}`}
                                    >
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Section Diplômes style pour plusieurs diplômes */}
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

            {/* Section Diplômes style pour un seul diplôme */}
            {(hasSingleDiploma || profileData.educationLevel || profileData.school || profileData.field) && 
            !hasMultipleDiplomas && 
            // Vérifier qu'il y a au moins une donnée significative
            (firstDiploma?.educationLevel || firstDiploma?.field || firstDiploma?.school || firstDiploma?.country || 
            profileData.educationLevel || profileData.field || profileData.school) && (
                <>
                    <div className={styles.separator}></div>
                    <div className={styles.section}>
                        <h4 className={styles.sectionTitle}>
                            {role === 'student' ? 'Parcours académique' : 'Diplôme'}
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

            {/* Section Expériences (tuteurs) - Style multiple */}
            {role === 'tutor' && hasMultipleExperiences && profileData.experiences.some((exp: Experience) => 
                exp.jobTitle || exp.company || exp.employmentType
            ) && (
                <>
                    <div className={styles.separator}></div>
                    <div className={styles.section}>
                        <h4 className={styles.sectionTitle}>Expériences professionnelles</h4>
                        <div className={styles.experiencesList}>
                            {profileData.experiences.map((experience: Experience, index: number) => (
                                // Afficher seulement les expériences qui ont au moins un champ rempli
                                (experience.jobTitle || experience.company || experience.employmentType) && (
                                    <div key={experience.id || index} className={styles.experienceItem}>
                                        <div className={styles.experienceHeader}>
                                            {experience.jobTitle && (
                                                <h5 className={styles.experienceTitle}>{experience.jobTitle}</h5>
                                            )}
                                            {/* Afficher la période seulement si startYear est rempli */}
                                            {experience.startYear && (
                                                <span className={styles.experiencePeriod}>
                                                    {formatExperiencePeriod(
                                                        experience.startMonth, 
                                                        experience.startYear, 
                                                        experience.endMonth, 
                                                        experience.endYear, 
                                                        experience.isCurrent
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                        
                                        {(experience.company || experience.employmentType || experience.location) && (
                                            <div className={styles.experienceDetails}>
                                                {experience.company && (
                                                    <p className={styles.experienceCompany}>
                                                        <strong>Entreprise:</strong> {experience.company}
                                                    </p>
                                                )}
                                                {experience.employmentType && (
                                                    <p className={styles.experienceType}>
                                                        <strong>Type:</strong> {experience.employmentType}
                                                    </p>
                                                )}
                                                {experience.location && (
                                                    <p className={styles.experienceLocation}>
                                                        <strong>Lieu:</strong> {experience.location}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                        
                                        {experience.description && (
                                            <div className={styles.experienceDescription}>
                                                <p>{experience.description}</p>
                                            </div>
                                        )}
                                    </div>
                                )
                            ))}
                        </div>
                    </div>
                </>
            )}

            {/* Section Expériences (tuteurs)*/}
            {role === 'tutor' && hasSingleExperience && 
            // Vérifier qu'il y a au moins une donnée significative
            (firstExperience?.jobTitle || firstExperience?.company || firstExperience?.employmentType) && (
                <>
                    <div className={styles.separator}></div>
                    <div className={styles.section}>
                        <h4 className={styles.sectionTitle}>Expérience professionnelle</h4>
                        <div className={styles.infoGrid}>
                            {/* Afficher chaque champ seulement s'il est rempli */}
                            {firstExperience.jobTitle && (
                                <div className={styles.infoItem}>
                                    <span className={styles.infoLabel}>Poste</span>
                                    <span className={styles.infoValue}>{firstExperience.jobTitle}</span>
                                </div>
                            )}
                            {firstExperience.company && (
                                <div className={styles.infoItem}>
                                    <span className={styles.infoLabel}>Entreprise</span>
                                    <span className={styles.infoValue}>{firstExperience.company}</span>
                                </div>
                            )}
                            {firstExperience.employmentType && (
                                <div className={styles.infoItem}>
                                    <span className={styles.infoLabel}>Type d'emploi</span>
                                    <span className={styles.infoValue}>{firstExperience.employmentType}</span>
                                </div>
                            )}
                            {firstExperience.location && (
                                <div className={styles.infoItem}>
                                    <span className={styles.infoLabel}>Lieu</span>
                                    <span className={styles.infoValue}>{firstExperience.location}</span>
                                </div>
                            )}
                            {/* Période pour l'expérience unique - seulement si startYear est rempli */}
                            {firstExperience.startYear && (
                                <div className={styles.infoItem}>
                                    <span className={styles.infoLabel}>Période</span>
                                    <span className={styles.infoValue}>
                                        {formatExperiencePeriod(
                                            firstExperience.startMonth, 
                                            firstExperience.startYear, 
                                            firstExperience.endMonth, 
                                            firstExperience.endYear, 
                                            firstExperience.isCurrent
                                        )}
                                    </span>
                                </div>
                            )}
                            {/* Description pour l'expérience unique */}
                            {firstExperience.description && (
                                <div className={styles.infoItem}>
                                    <span className={styles.infoLabel}>Description</span>
                                    <p className={styles.bioText}>{firstExperience.description}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* Disponibilités détaillées */}
            {role === 'tutor' && sortedSchedule.length > 0 && (
            <>
                <div className={styles.separator}></div>
                <div className={styles.section}>
                <h4 className={styles.sectionTitle}>Disponibilités détaillées</h4>
                <div className={styles.scheduleList}>
                    {sortedSchedule.map((day: DayAvailability, index: number) => {
                        // Trier aussi les créneaux horaires par heure de début
                        const sortedTimeSlots = sortTimeSlotsChronologically(day.timeSlots);
                        
                        return (
                            <div key={index} className={styles.scheduleItem}>
                                <div className={styles.infoLabel}>
                                    {formatDateDisplay(day.date)}
                                </div>
                                <div className={styles.scheduleSlots}>
                                    {sortedTimeSlots.map((slot: TimeSlot, slotIndex: number) => (
                                        <div key={slotIndex} className={styles.scheduleSlot}>
                                        {slot.allDay ? (
                                            <span className={styles.allDaySlot}>Toute la journée</span>
                                        ) : (
                                            <span className={styles.timeSlot}>
                                            {slot.startTime} - {slot.endTime}
                                            </span>
                                        )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
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