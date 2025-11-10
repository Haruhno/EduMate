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

const GeneralInfoStep: React.FC<GeneralInfoStepProps> = ({
    profileData,
    setProfileData,
    role,
    errors,
    setErrors,
    setTouched
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const addressInputRef = useRef<HTMLInputElement>(null);
    const suggestionsRef = useRef<HTMLDivElement>(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [hasBeenValidated, setHasBeenValidated] = useState(false); 

    // États du recadrage
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [cropping, setCropping] = useState(false);
    const [imageToCrop, setImageToCrop] = useState<string | null>(null);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

    // États pour les suggestions d'adresse
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isLoadingAddress, setIsLoadingAddress] = useState(false);

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

    // Fonction pour formater les dates au format YYYY-MM-DD
    const formatDateForInput = (dateString: string): string => {
        if (!dateString) return '';
        
        try {
            // Si c'est déjà au format YYYY-MM-DD, retourner tel quel
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            return dateString;
            }
            
            // Sinon, convertir depuis le format ISO
            const date = new Date(dateString);
            if (isNaN(date.getTime())) {
            console.warn('Date invalide:', dateString);
            return '';
            }
            
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            
            return `${year}-${month}-${day}`;
        } catch (error) {
            console.error('Erreur formatage date:', error, dateString);
            return '';
        }
    };

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
            // Pour le dropdown du téléphone
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
            
            // Pour les suggestions d'adresse
            if (
                suggestionsRef.current && 
                !suggestionsRef.current.contains(event.target as Node) &&
                addressInputRef.current &&
                !addressInputRef.current.contains(event.target as Node)
            ) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Récupère zone du crop
    const onCropComplete = useCallback((_: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    // AJOUT: Fonction de validation complète
    const validateAllFields = () => {
        const newErrors: { [key: string]: string } = { ...errors };
        
        // Supprimer les anciennes erreurs des champs obligatoires
        delete newErrors.firstName;
        delete newErrors.lastName;
        delete newErrors.email;
        delete newErrors.birthDate;

        let hasAnyError = false;

        // Validation des champs obligatoires
        if (!profileData.firstName?.trim()) {
            newErrors.firstName = "⚠ Le prénom est obligatoire";
            hasAnyError = true;
        }

        if (!profileData.lastName?.trim()) {
            newErrors.lastName = "⚠ Le nom est obligatoire";
            hasAnyError = true;
        }

        if (!profileData.email?.trim()) {
            newErrors.email = "⚠ L'email est obligatoire";
            hasAnyError = true;
        } else if (!/\S+@\S+\.\S+/.test(profileData.email)) {
            newErrors.email = "⚠ L'adresse e-mail n'est pas valide";
            hasAnyError = true;
        }

        // Date de naissance obligatoire seulement pour les tuteurs
        if (role === 'tutor') {
            if (!profileData.birthDate) {
                newErrors.birthDate = "⚠ La date de naissance est obligatoire";
                hasAnyError = true;
            } else {
                const birthDate = new Date(profileData.birthDate);
                const today = new Date();
                const age = today.getFullYear() - birthDate.getFullYear();
                const monthDiff = today.getMonth() - birthDate.getMonth();
                const isBirthdayPassed = monthDiff > 0 || (monthDiff === 0 && today.getDate() >= birthDate.getDate());
                const actualAge = isBirthdayPassed ? age : age - 1;
                
                if (actualAge < 16) {
                    newErrors.birthDate = "⚠ Vous devez avoir au moins 16 ans pour être tuteur";
                    hasAnyError = true;
                }
            }
        }

        // Validation du téléphone (optionnel mais doit être valide si rempli)
        if (profileData.phone && profileData.phone.trim() !== '') {
            const digitsOnly = profileData.phone.replace(/\D/g, '');
            if (
                (profileData.phone.match(/\+/g)?.length || 0) > 1 ||
                digitsOnly.length < 8 ||
                digitsOnly.length > 15
            ) {
                newErrors.phone = 'Numéro de téléphone invalide';
                hasAnyError = true;
            }
        }

        setErrors(newErrors);
        setHasBeenValidated(true);
        return !hasAnyError;
    };

    // Exposer la fonction de validation au parent
    useEffect(() => {
        // @ts-ignore
        window.validateGeneralInfoStep = validateAllFields;
    }, [profileData, role]);

    // Fonction pour rechercher des suggestions d'adresses
    const searchAddressSuggestions = async (query: string) => {
        if (!query || query.length < 3) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        setIsLoadingAddress(true);
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
            setIsLoadingAddress(false);
        }
    };

    // Fonction pour sélectionner une suggestion d'adresse
    const handleAddressSuggestionSelect = (suggestion: Suggestion) => {
        setProfileData((prev: any) => ({
            ...prev,
            address: suggestion.display_name,
            // Optionnel: vous pouvez aussi stocker les coordonnées GPS si besoin
            location: {
                ...prev.location,
                latitude: suggestion.lat,
                longitude: suggestion.lon,
                city: suggestion.address?.city || suggestion.address?.town || suggestion.address?.village || suggestion.address?.municipality || ''
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
            address: value
        }));

        // Rechercher des suggestions après un délai
        const timeoutId = setTimeout(() => {
            searchAddressSuggestions(value);
        }, 300);

        return () => clearTimeout(timeoutId);
    };

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

        // SUPPRIMER: La validation en temps réel
        // validateField(name, value);

        // Si on a déjà validé une fois, revalider le champ modifié
        if (hasBeenValidated) {
            const newErrors = { ...errors };
            
            // Supprimer l'erreur pour ce champ s'il est maintenant valide
            if (value && value.trim() !== '') {
                delete newErrors[name];
                
                // Validation spécifique pour l'email
                if (name === 'email' && !/\S+@\S+\.\S+/.test(value)) {
                    newErrors.email = "L'adresse e-mail n'est pas valide";
                }
                
                // Validation spécifique pour la date de naissance des tuteurs
                if (name === 'birthDate' && role === 'tutor' && value) {
                    const birthDate = new Date(value);
                    const today = new Date();
                    const age = today.getFullYear() - birthDate.getFullYear();
                    const monthDiff = today.getMonth() - birthDate.getMonth();
                    const isBirthdayPassed = monthDiff > 0 || (monthDiff === 0 && today.getDate() >= birthDate.getDate());
                    const actualAge = isBirthdayPassed ? age : age - 1;
                    
                    if (actualAge < 16) {
                        newErrors.birthDate = "Vous devez avoir au moins 16 ans pour être tuteur";
                    } else {
                        delete newErrors.birthDate;
                    }
                }
            }
            
            setErrors(newErrors);
        }

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
        
        setProfileData((prev: any) => ({ 
            ...prev, 
            [name]: cleaned 
        }));

        // Si on a déjà validé une fois, revalider le téléphone
        if (hasBeenValidated && cleaned && cleaned.trim() !== '') {
            const digitsOnly = cleaned.replace(/\D/g, '');
            const newErrors = { ...errors };
            
            if ((cleaned.match(/\+/g)?.length || 0) > 1 || digitsOnly.length < 8 || digitsOnly.length > 15) {
                newErrors.phone = 'Numéro de téléphone invalide';
            } else {
                delete newErrors.phone;
            }
            
            setErrors(newErrors);
        }

        setTouched((prev) => ({
            ...prev,
            [name]: true
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
                                        backgroundColor: '#f8f9fa' 
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
                        Prénom <span className={styles.requiredMarker}>*</span>
                    </label>
                    <input
                        type="text"
                        id="firstName"
                        name="firstName"
                        placeholder="Entrez votre prénom"
                        value={profileData.firstName}
                        onChange={handleInputChange}
                        className={`${styles.input} ${hasBeenValidated && errors.firstName ? styles.inputError : ''}`} // ← MODIFICATION
                    />
                    {hasBeenValidated && errors.firstName && <p className={styles.errorText}>{errors.firstName}</p>} {/* ← MODIFICATION */}
                </div>

                {/* Nom */}
                <div className={styles.formGroup}>
                    <label htmlFor="lastName" className={styles.label}>
                        Nom <span className={styles.requiredMarker}>*</span>
                    </label>
                    <input
                        type="text"
                        id="lastName"
                        name="lastName"
                        placeholder="Entrez votre nom"
                        value={profileData.lastName}
                        onChange={handleInputChange}
                        className={`${styles.input} ${hasBeenValidated && errors.lastName ? styles.inputError : ''}`} // ← MODIFICATION
                    />
                    {hasBeenValidated && errors.lastName && <p className={styles.errorText}>{errors.lastName}</p>} {/* ← MODIFICATION */}
                </div>

                {/* Email */}
                <div className={styles.formGroup}>
                    <label htmlFor="email" className={styles.label}>
                        Email <span className={styles.requiredMarker}>*</span>
                    </label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        placeholder="exemple@mail.com"
                        value={profileData.email}
                        onChange={handleInputChange}
                        className={`${styles.input} ${hasBeenValidated && errors.email ? styles.inputError : ''}`} // ← MODIFICATION
                    />
                    {hasBeenValidated && errors.email && <p className={styles.errorText}>{errors.email}</p>} {/* ← MODIFICATION */}
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
                            className={`${styles.phoneField} ${hasBeenValidated && errors.phone ? styles.inputError : ''}`} // ← MODIFICATION
                        />
                    </div>

                    {hasBeenValidated && errors.phone && <p className={styles.errorText}>{errors.phone}</p>} {/* ← MODIFICATION */}
                </div>

                {/* Genre */}
                <div className={styles.formGroup}>
                    <label htmlFor="gender" className={styles.label}>
                        Genre
                    </label>
                    <select
                        id="gender"
                        name="gender"
                        value={profileData.gender}
                        onChange={handleInputChange}
                        className={styles.select}
                    >
                        <option value="">Sélectionnez</option>
                        <option value="Femme">Femme</option>
                        <option value="Homme">Homme</option>
                        <option value="Autre">Autre</option>
                        <option value="Autre">Je préfère ne pas répondre</option>
                    </select>
                </div>

                {/* Date de naissance */}
                <div className={styles.formGroup}>
                <label htmlFor="birthDate" className={styles.label}>
                    Date de naissance {role === 'tutor' && <span className={styles.requiredMarker}>*</span>}
                </label>
                <input
                    type="date"
                    id="birthDate"
                    name="birthDate"
                    value={formatDateForInput(profileData.birthDate)} // ← UTILISER LA FONCTION DE FORMATAGE
                    onChange={handleInputChange}
                    className={`${styles.input} ${hasBeenValidated && errors.birthDate ? styles.inputError : ''}`}
                    max={new Date().toISOString().split('T')[0]}
                />
                {hasBeenValidated && errors.birthDate && <p className={styles.errorText}>{errors.birthDate}</p>}
                </div>

                {/* Adresse avec suggestions */}
                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                    <label htmlFor="address" className={styles.label}>Adresse personnelle</label>
                    <div className={styles.autocompleteContainer}>
                        <input
                            ref={addressInputRef}
                            type="text"
                            id="address"
                            name="address"
                            value={profileData.address}
                            onChange={handleAddressChange}
                            onFocus={() => {
                                if (suggestions.length > 0) {
                                    setShowSuggestions(true);
                                }
                            }}
                            className={styles.inputAdress}
                            placeholder="Commencez à taper votre adresse (rue, ville, pays)..."
                            autoComplete="off"
                        />
                        {isLoadingAddress && (
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
                                        onClick={() => handleAddressSuggestionSelect(suggestion)}
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
                 {/* Description */}
                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                    <label htmlFor="description" className={styles.label}>À propos</label>
                    <textarea
                        id="bio"
                        name="bio"
                        placeholder="Décrivez-vous en quelques mots... (votre parcours, vos centres d'intérêt, etc.)"
                        value={profileData.bio || ''}
                        onChange={handleInputChange}
                        className={styles.textarea}
                        rows={4}
                    />
                </div>
            </div>

            {/* Indication des champs obligatoires */}
            <div className={styles.requiredInfo}>
                <span className={styles.requiredMarker}>*</span> Champs obligatoires
            </div>
        </div>
    );
};

export default GeneralInfoStep;