import React, { useRef, useState, useEffect, useCallback } from 'react';
import styles from './GeneralInfoStep.module.css';
import defaultAvatar from '../../assets/images/avatar.jpg';
import { allCountries } from 'country-telephone-data';
import Cropper from "react-easy-crop";
import { getCroppedImg } from "../../utils/cropImage"; 

interface GeneralInfoStepProps {
  profileData: any;
  setProfileData: (data: any) => void;
  role: string;
  errors: { [key: string]: string };
  setErrors: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
  touched: { [key: string]: boolean };
  setTouched: React.Dispatch<React.SetStateAction<{ [key: string]: boolean }>>; 
}

const GeneralInfoStep: React.FC<GeneralInfoStepProps> = ({
    profileData,
    setProfileData,
    role,
    errors,
    setErrors,
    touched,
    setTouched
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    // États du recadrage
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [cropping, setCropping] = useState(false);
    const [imageToCrop, setImageToCrop] = useState<string | null>(null);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

    // Génère la liste des pays
    const countries = (allCountries as any[]).map((country) => ({
        name: country.name,
        code: country.dialCode,
        flag: getFlagEmoji(country.iso2.toUpperCase()),
        iso2: country.iso2.toUpperCase(),
    }));

    // Convertit un code ISO en emoji drapeau 
    function getFlagEmoji(countryCode: string) {
        const codePoints = countryCode
            .toUpperCase()
            .split('')
            .map((char) => 127397 + char.charCodeAt(0));
        return String.fromCodePoint(...codePoints);
    }

    // Définit la France par défaut au chargement
    useEffect(() => {
        const france = countries.find((c) => c.iso2 === 'FR');
        if (france && !profileData.countryCode) {
            setProfileData((prev: any) => ({
                ...prev,
                countryCode: france.code,
            }));
        }
    }, [countries, profileData.countryCode, setProfileData]);

    // Ferme le dropdown quand on clique dehors
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Récupère zone du crop
    const onCropComplete = useCallback((_: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    // Quand utilisateur choisit une image
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Vérifier la taille du fichier (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                setErrors((prev) => ({
                    ...prev,
                    profilePicture: 'L\'image est trop volumineuse (max 5MB)'
                }));
                return;
            }

            // Vérifier le type de fichier
            if (!file.type.startsWith('image/')) {
                setErrors((prev) => ({
                    ...prev,
                    profilePicture: 'Veuillez sélectionner une image valide'
                }));
                return;
            }

            const imageUrl = URL.createObjectURL(file);
            setImageToCrop(imageUrl);
            setCropping(true);
        }
    };

    // Valider le recadrage
    const handleCropConfirm = async () => {
        try {
            if (!imageToCrop || !croppedAreaPixels) return;

            const croppedImg = await getCroppedImg(imageToCrop, croppedAreaPixels);
            setProfileData((prev: any) => ({
                ...prev,
                profilePicture: croppedImg,
            }));
            
            // Nettoyer les URLs créées
            URL.revokeObjectURL(imageToCrop);
            setCropping(false);
            setImageToCrop(null);
            
            // Supprimer l'erreur si elle existait
            setErrors((prev) => {
                const updated = { ...prev };
                delete updated.profilePicture;
                return updated;
            });
        } catch (e) {
            console.error('Erreur lors du recadrage:', e);
            setErrors((prev) => ({
                ...prev,
                profilePicture: 'Erreur lors du recadrage de l\'image'
            }));
        }
    };

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setProfileData((prev: any) => ({
            ...prev,
            [name]: value,
        }));

        // Supprimer l'erreur si corrigé
        setErrors((prev) => {
            const updated = { ...prev };
            delete updated[name];
            return updated;
        });

        // Marquer comme touché
        setTouched((prev) => ({
            ...prev,
            [name]: true
        }));

        // Déclencher l'événement pour le scroll automatique
        window.dispatchEvent(
            new CustomEvent('profileFieldUpdated', { detail: { field: name } })
        );
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const cleaned = value.replace(/[^\d+]/g, '');
        const digitsOnly = cleaned.replace(/\D/g, '');

        // Validation
        if (cleaned !== '' && 
            ((cleaned.match(/\+/g)?.length || 0) > 1 || digitsOnly.length < 8 || digitsOnly.length > 15)
        ) {
            setErrors((prev) => ({
                ...prev,
                phone: 'Numéro de téléphone invalide',
            }));
        } else {
            setErrors((prev) => {
                const updated = { ...prev };
                delete updated.phone;
                return updated;
            });
        }

        setProfileData((prev: any) => ({ 
            ...prev, 
            [name]: cleaned 
        }));

        setTouched((prev) => ({
            ...prev,
            phone: true
        }));

        window.dispatchEvent(
            new CustomEvent('profileFieldUpdated', { detail: { field: name } })
        );
    };

    const hasCustomPhoto = () => {
        if (!profileData.profilePicture) return false;
        if (profileData.profilePicture === defaultAvatar || profileData.profilePicture.includes('avatar'))
            return false;
        if (profileData.profilePicture.startsWith('data:image')) return true;
        if (profileData.profilePicture.startsWith('http')) return true;
        return false;
    };

    const triggerFileInput = () => fileInputRef.current?.click();

    const handleCountrySelect = (code: string) => {
        setProfileData((prev: any) => ({ ...prev, countryCode: code }));
        setDropdownOpen(false);
    };

    const handleCancelCrop = () => {
        if (imageToCrop) {
            URL.revokeObjectURL(imageToCrop);
        }
        setCropping(false);
        setImageToCrop(null);
        
        // Réinitialiser le fichier input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className={styles.container}>
            <h2>Informations générales</h2>
            <p className={styles.subtitle}>
                Renseignez vos informations personnelles pour compléter votre profil
            </p>

            {/* --- Photo de profil --- */}
            <div className={styles.photoSection}>
                <div className={styles.photoContainer}>
                    <div className={styles.photoWrapper}>
                        <img
                            src={profileData.profilePicture || defaultAvatar}
                            alt="Profile"
                            className={styles.photo}
                            onError={(e) => {
                                e.currentTarget.src = defaultAvatar;
                                setProfileData((prev: any) => ({
                                    ...prev,
                                    profilePicture: defaultAvatar
                                }));
                            }}
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

                    <div className={styles.photoActions}>
                        <button
                            type="button"
                            onClick={triggerFileInput}
                            className={styles.changePhotoText}
                        >
                            Changer de photo
                        </button>

                        {hasCustomPhoto() && (
                            <button
                                type="button"
                                onClick={() =>
                                    setProfileData((prev: any) => ({
                                        ...prev,
                                        profilePicture: defaultAvatar,
                                    }))
                                }
                                className={styles.deletePhotoText}
                            >
                                Supprimer la photo
                            </button>
                        )}
                    </div>
                    
                    {errors.profilePicture && (
                        <p className={styles.errorText}>{errors.profilePicture}</p>
                    )}
                </div>
            </div>

            {/* --- Modale de recadrage --- */}
            {cropping && (
                <div className={styles.cropModal}>
                    <div className={styles.cropModalOverlay} onClick={handleCancelCrop} />
                    <div className={styles.cropModalContent}>
                        <div className={styles.cropHeader}>
                            <h3>Recadrez votre photo</h3>
                            <p>Ajustez la position et la taille de votre photo de profil</p>
                        </div>
                        
                        <div className={styles.cropContainer}>
                            <Cropper
                                image={imageToCrop!}
                                crop={crop}
                                zoom={zoom}
                                aspect={1}
                                cropShape="round"
                                onCropChange={setCrop}
                                onZoomChange={setZoom}
                                onCropComplete={onCropComplete}
                                showGrid={false}
                                style={{
                                    containerStyle: {
                                        backgroundColor: '#f8f9fa' // Fond gris clair au lieu de noir
                                    }
                                }}
                            />
                        </div>
                        
                        <div className={styles.cropControls}>
                            <div className={styles.zoomControl}>
                                <span className={styles.zoomLabel}>Zoom</span>
                                <div className={styles.zoomSliderContainer}>
                                    <input
                                        type="range"
                                        min={1}
                                        max={3}
                                        step={0.1}
                                        value={zoom}
                                        onChange={(e) => setZoom(Number(e.target.value))}
                                        className={styles.zoomSlider}
                                        style={{
                                        '--slider-progress': `${((zoom - 1) / (3 - 1)) * 100}%`
                                        } as React.CSSProperties}
                                    />
                                    </div>
                                <span className={styles.zoomValue}>{zoom.toFixed(1)}x</span>
                            </div>
                            
                            <div className={styles.cropActions}>
                                <button 
                                    onClick={handleCancelCrop}
                                    className={styles.cancelButton}
                                >
                                    Annuler
                                </button>
                                <button 
                                    onClick={handleCropConfirm}
                                    className={styles.confirmButton}
                                >
                                    Valider
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Formulaire --- */}
            <div className={styles.formGrid}>
                {/* Prénom */}
                <div className={styles.formGroup}>
                    <label htmlFor="firstName" className={styles.label}>
                        Prénom <span>*</span>
                    </label>
                    <input
                        type="text"
                        id="firstName"
                        name="firstName"
                        placeholder="Entrez votre prénom"
                        value={profileData.firstName}
                        onChange={handleInputChange}
                        className={`${styles.input} ${errors.firstName ? styles.inputError : ''}`}
                    />
                    {errors.firstName && <p className={styles.errorText}>{errors.firstName}</p>}
                </div>

                {/* Nom */}
                <div className={styles.formGroup}>
                    <label htmlFor="lastName" className={styles.label}>
                        Nom <span>*</span>
                    </label>
                    <input
                        type="text"
                        id="lastName"
                        name="lastName"
                        placeholder="Entrez votre nom"
                        value={profileData.lastName}
                        onChange={handleInputChange}
                        className={`${styles.input} ${errors.lastName ? styles.inputError : ''}`}
                    />
                    {errors.lastName && <p className={styles.errorText}>{errors.lastName}</p>}
                </div>

                {/* Email */}
                <div className={styles.formGroup}>
                    <label htmlFor="email" className={styles.label}>
                        Email <span>*</span>
                    </label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        placeholder="exemple@mail.com"
                        value={profileData.email}
                        onChange={handleInputChange}
                        className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                    />
                    {errors.email && <p className={styles.errorText}>{errors.email}</p>}
                </div>

                {/* Téléphone */}
                <div className={styles.formGroup}>
                    <label htmlFor="phone" className={styles.label}>Téléphone</label>
                    
                    <div className={styles.phoneInput} ref={dropdownRef}>
                        <div className={styles.customDropdown}>
                            <button
                                type="button"
                                className={styles.dropdownButton}
                                onClick={() => setDropdownOpen(!dropdownOpen)}
                            >
                                {(() => {
                                    const selectedCountry = countries.find((c) => c.code === profileData.countryCode);
                                    if (selectedCountry) {
                                        return `${selectedCountry.flag} +${selectedCountry.code}`;
                                    }
                                    return '🇫🇷 +33';
                                })()}
                            </button>

                            {dropdownOpen && (
                                <ul className={styles.dropdownList}>
                                    {countries.map((country) => (
                                        <li
                                            key={country.code}
                                            className={styles.dropdownItem}
                                            onClick={() => handleCountrySelect(country.code)}
                                        >
                                            {country.flag} {country.name} (+{country.code})
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <input
                            id="phone"
                            type="tel"
                            name="phone"
                            placeholder="Numéro de téléphone"
                            value={profileData.phone}
                            onChange={handlePhoneChange}
                            className={`${styles.phoneField} ${errors.phone ? styles.inputError : ''}`}
                        />
                    </div>

                    {errors.phone && <p className={styles.errorText}>{errors.phone}</p>}
                </div>

                {/* Genre */}
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
                        <option value="prefer_not_to_say">Je préfère ne pas répondre</option>
                    </select>
                </div>

                {/* Date de naissance */}
                <div className={styles.formGroup}>
                    <label htmlFor="birthDate" className={styles.label}>Date de naissance</label>
                    <input
                        type="date"
                        id="birthDate"
                        name="birthDate"
                        value={profileData.birthDate}
                        onChange={handleInputChange}
                        className={styles.input}
                        max={new Date().toISOString().split('T')[0]}
                    />
                </div>

                {/* Adresse */}
                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                    <label htmlFor="address" className={styles.label}>Adresse personnelle</label>
                    <input
                        type="text"
                        id="address"
                        name="address"
                        value={profileData.address}
                        onChange={handleInputChange}
                        className={styles.input}
                        placeholder="Rue, ville, code postal..."
                    />
                </div>
            </div>

            <div className={styles.requiredInfo}>
                <span>*</span> Champs obligatoires
            </div>
        </div>
    );
};

export default GeneralInfoStep;