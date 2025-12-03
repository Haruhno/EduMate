import React, { useState, useEffect, useRef } from 'react';
import styles from './AvailabilityPage.module.css';
import profileService from '../../services/profileService';

interface TimeSlot {
  startTime: string;
  endTime: string;
  allDay: boolean;
}

interface DayAvailability {
  date: string;
  timeSlots: TimeSlot[];
}

interface AvailabilityPageProps {
  profileData?: any;
  setProfileData?: (data: any) => void;
  role?: string;
}

const AvailabilityPage: React.FC<AvailabilityPageProps> = ({ 
  profileData = {}, 
  setProfileData = () => {}
}) => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [dayAvailabilities, setDayAvailabilities] = useState<{[key: string]: DayAvailability}>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedDateForModal, setSelectedDateForModal] = useState<Date | null>(null);
  const [dateToDelete, setDateToDelete] = useState<Date | null>(null);
  const [newAvailability, setNewAvailability] = useState({ 
    startTime: '06:00', 
    endTime: '23:00', 
    allDay: false 
  });
  const [isLoading, setIsLoading] = useState(true);
  const [currentProfileData, setCurrentProfileData] = useState<any>({});

  // Références pour les dropdowns
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [dropdownOpen, setDropdownOpen] = useState<{ startTime: boolean; endTime: boolean }>({ 
    startTime: false, 
    endTime: false 
  });

  // Références pour éviter les boucles infinies
  const isInitialLoad = useRef(true);
  const hasLoadedFromDB = useRef(false);

  // Fonction pour formater une date en YYYY-MM-DD sans décalage de fuseau
  const formatDateToLocalString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Générer les options de temps (6h-23h avec pas de 30 minutes)
  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 6; hour <= 23; hour++) {
      options.push(`${hour.toString().padStart(2, '0')}:00`);
      if (hour < 23) {
        options.push(`${hour.toString().padStart(2, '0')}:30`);
      }
    }
    return options;
  };

  const timeOptions = generateTimeOptions();

  // CHARGEMENT DES DONNÉES DEPUIS LA BASE DE DONNÉES - UNE SEULE FOIS
  useEffect(() => {
    const loadProfileData = async () => {
      if (hasLoadedFromDB.current) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        console.log('Chargement des données depuis la base de données...');
        const response = await profileService.getProfile();
        
        if (response.success && response.data.profile) {
          const profile = response.data.profile;
          console.log('Données récupérées depuis la BD:', { 
            availability: profile.availability, 
            schedule: profile.schedule,
            scheduleLength: profile.schedule?.length || 0 
          });

          // Nettoyer les dates passées du schedule
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const schedule = (profile.schedule || []).filter((day: DayAvailability) => {
            if (!day.date) return false;
            const dayDate = new Date(day.date);
            dayDate.setHours(0, 0, 0, 0);
            return dayDate >= today;
          });

          // Mettre à jour les données locales
          const newSelectedDates = new Set<string>();
          const newDayAvailabilities: { [key: string]: DayAvailability } = {};

          schedule.forEach((day: DayAvailability) => {
            if (day.date && day.timeSlots && day.timeSlots.length > 0) {
              newSelectedDates.add(day.date);
              newDayAvailabilities[day.date] = {
                date: day.date,
                timeSlots: day.timeSlots.map(slot => ({
                  startTime: slot.startTime || '06:00',
                  endTime: slot.endTime || '23:00',
                  allDay: !!slot.allDay
                }))
              };
            }
          });

          setSelectedDates(newSelectedDates);
          setDayAvailabilities(newDayAvailabilities);
          setCurrentProfileData({
            ...profile,
            schedule: schedule // Utiliser le schedule nettoyé
          });
          hasLoadedFromDB.current = true;
          isInitialLoad.current = false;

          // Sauvegarder le schedule nettoyé si des dates passées ont été enlevées
          if (schedule.length !== (profile.schedule || []).length) {
            console.log('🔧 Nettoyage des dates passées automatique');
            await profileService.saveProfile({
              ...profile,
              schedule: schedule
            });
          }
        } else {
          console.log('Aucun profil trouvé dans la base de données');
          setCurrentProfileData({});
          hasLoadedFromDB.current = true;
          isInitialLoad.current = false;
        }
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
        hasLoadedFromDB.current = true;
        isInitialLoad.current = false;
      } finally {
        setIsLoading(false);
      }
    };

    loadProfileData();
  }, []);

  // Synchronisation UNIQUEMENT si les props changent depuis l'extérieur
  useEffect(() => {
    if (!isInitialLoad.current && profileData && Object.keys(profileData).length > 0 && 
        JSON.stringify(profileData) !== JSON.stringify(currentProfileData)) {
      console.log('🔄 Synchronisation avec les props parentes');
      
      const schedule = profileData?.schedule || [];
      const newSelectedDates = new Set<string>();
      const newDayAvailabilities: { [key: string]: DayAvailability } = {};

      schedule.forEach((day: DayAvailability) => {
        if (day.date && day.timeSlots && day.timeSlots.length > 0) {
          newSelectedDates.add(day.date);
          newDayAvailabilities[day.date] = {
            date: day.date,
            timeSlots: day.timeSlots.map(slot => ({
              startTime: slot.startTime || '06:00',
              endTime: slot.endTime || '23:00',
              allDay: !!slot.allDay
            }))
          };
        }
      });

      setSelectedDates(newSelectedDates);
      setDayAvailabilities(newDayAvailabilities);
      setCurrentProfileData(profileData);
    }

    if (isInitialLoad.current) {
      isInitialLoad.current = false;
    }
  }, [profileData]);

  // Fonction pour mettre à jour le parent de manière contrôlée
  const updateParentProfileData = (updatedData: any) => {
    if (setProfileData) {
      setProfileData((prev: any) => ({ ...prev, ...updatedData }));
    }
  };

  // Obtenir les jours de la semaine (toujours du lundi au dimanche)
  const getWeekDays = () => {
    const today = new Date();
    today.setHours(0,0,0,0);
    
    // Trouver le lundi de la semaine actuelle
    const startDate = new Date(currentWeek);
    startDate.setHours(0,0,0,0);
    
    // Ajuster pour commencer le lundi
    const dayOfWeek = startDate.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    startDate.setDate(startDate.getDate() + diffToMonday);

    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      days.push(d);
    }

    return days;
  };

  const weekDays = getWeekDays();

  // Navigation seulement vers le futur
  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeek(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setDate(newDate.getDate() - 7);
      } else {
        newDate.setDate(newDate.getDate() + 7);
      }
      return newDate;
    });
  };

  // Gérer le changement des types de cours
  const handleAvailabilityTypeChange = (type: 'online' | 'inPerson') => {
    const currentAvailability = currentProfileData?.availability || { online: false, inPerson: false };
    const newValue = !currentAvailability[type];
    const newAvailabilityData = { ...currentAvailability, [type]: newValue };

    console.log(`🔄 ${type} changé à:`, newValue);

    // Sauvegarder dans la base de données
    const updateProfile = async () => {
      try {
        await profileService.saveProfile({
          ...currentProfileData,
          availability: newAvailabilityData
        });
        // Recharger les données
        const response = await profileService.getProfile();
        if (response.success && response.data.profile) {
          setCurrentProfileData(response.data.profile);
          updateParentProfileData({ availability: newAvailabilityData });
        }
      } catch (error) {
        console.error('Erreur sauvegarde:', error);
      }
    };

    updateProfile();
  };

  // Obtenir les disponibilités pour une date
  const getAvailabilityForDate = (date: Date) => {
    const dateString = formatDateToLocalString(date);
    return dayAvailabilities[dateString];
  };

  // Couleur selon availability
  const getAvailabilityColor = () => {
    const availability = currentProfileData?.availability || {};
    if (availability.online && availability.inPerson) {
      return '#eff6ff';
    }
    if (availability.online) {
      return '#d6f5dfff';
    }
    if (availability.inPerson) {
      return '#fffbc0ff';
    }
    return '#6b7280';
  };

  const formatWeekRange = () => {
    const start = weekDays[0];
    const end = weekDays[6];
    return `${start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} - ${end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`;
  };

  // Convertir l'heure en minutes depuis minuit
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Obtenir les blocs de disponibilité pour une date
  const getAvailabilityBlocks = (date: Date) => {
    const availability = getAvailabilityForDate(date);
    if (!availability || !availability.timeSlots) return [];

    const blocks: { start: number; end: number; slot: TimeSlot }[] = [];
    
    availability.timeSlots.forEach(slot => {
      if (slot.allDay) {
        blocks.push({ start: 360, end: 1380, slot }); // 6h à 23h
      } else {
        const startMinutes = timeToMinutes(slot.startTime);
        const endMinutes = timeToMinutes(slot.endTime);
        blocks.push({ start: startMinutes, end: endMinutes, slot });
      }
    });

    return blocks;
  };

  // Obtenir les options de temps filtrées
  const getFilteredTimeOptions = (field: 'startTime' | 'endTime') => {
    if (field === 'startTime') {
      if (newAvailability.endTime) {
        return timeOptions.filter(time => time < newAvailability.endTime);
      }
    } else {
      if (newAvailability.startTime) {
        return timeOptions.filter(time => time > newAvailability.startTime);
      }
    }
    return timeOptions;
  };

  // Fermer les dropdowns en cliquant à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      Object.entries(dropdownRefs.current).forEach(([field, ref]) => {
        if (ref && !ref.contains(event.target as Node)) {
          setDropdownOpen(prev => ({
            ...prev,
            [field as 'startTime' | 'endTime']: false
          }));
        }
      });
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = (field: 'startTime' | 'endTime') => {
    setDropdownOpen(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleSelectOption = (field: 'startTime' | 'endTime', value: string) => {
    console.log(`⏰ Sélection ${field}:`, value);
    
    if (field === 'startTime') {
      setNewAvailability(prev => {
        let newEndTime = prev.endTime;
        // Ajuster l'heure de fin si nécessaire
        if (value >= prev.endTime) {
          const startIndex = timeOptions.indexOf(value);
          if (startIndex < timeOptions.length - 1) {
            newEndTime = timeOptions[startIndex + 1];
          }
        }
        return { ...prev, startTime: value, endTime: newEndTime };
      });
    } else {
      setNewAvailability(prev => {
        let newStartTime = prev.startTime;
        // Ajuster l'heure de début si nécessaire
        if (value <= prev.startTime) {
          const endIndex = timeOptions.indexOf(value);
          if (endIndex > 0) {
            newStartTime = timeOptions[endIndex - 1];
          }
        }
        return { ...prev, endTime: value, startTime: newStartTime };
      });
    }
    
    setDropdownOpen(prev => ({
      ...prev,
      [field]: false
    }));
  };

  const setDropdownRef = (field: 'startTime' | 'endTime') => (el: HTMLDivElement | null) => {
    dropdownRefs.current[field] = el;
  };

  const openAddModal = (date?: Date) => {
    if (date && isDateInPast(date)) {
      alert("Cette date est déjà passée. Veuillez choisir une autre disponibilité.");
      return;
    }
    
    const availability = date ? getAvailabilityForDate(date) : null;
    if (availability && availability.timeSlots.length > 0) {
      // Pré-remplir avec la première disponibilité existante
      const firstSlot = availability.timeSlots[0];
      setNewAvailability({
        startTime: firstSlot.startTime,
        endTime: firstSlot.endTime,
        allDay: firstSlot.allDay
      });
    } else {
      setNewAvailability({ 
        startTime: '06:00', 
        endTime: '23:00', 
        allDay: false 
      });
    }
    
    setSelectedDateForModal(date || null);
    setShowAddModal(true);
  };

  const openDeleteModal = (date: Date) => {
    setDateToDelete(date);
    setShowDeleteModal(true);
  };

  const addAvailability = () => {
    if (!selectedDateForModal) return;

    const dateString = formatDateToLocalString(selectedDateForModal);
    const newSlot = {
      startTime: newAvailability.allDay ? '00:00' : newAvailability.startTime,
      endTime: newAvailability.allDay ? '23:59' : newAvailability.endTime,
      allDay: newAvailability.allDay
    };

    console.log('➕ Ajout disponibilité:', { dateString, newSlot });

    // Mettre à jour state local
    setDayAvailabilities(prev => {
      const existing = prev[dateString];
      if (existing) {
        return {
          ...prev,
          [dateString]: {
            ...existing,
            timeSlots: [newSlot] // Remplace toutes les disponibilités existantes
          }
        };
      } else {
        return {
          ...prev,
          [dateString]: {
            date: dateString,
            timeSlots: [newSlot]
          }
        };
      }
    });

    // Sauvegarder dans la base de données
    const saveToDatabase = async () => {
      try {
        const updatedSchedule = Array.isArray(currentProfileData?.schedule) 
          ? [...currentProfileData.schedule] 
          : [];
        
        const existingIndex = updatedSchedule.findIndex((d: any) => d.date === dateString);
        
        if (existingIndex >= 0) {
          updatedSchedule[existingIndex] = {
            ...updatedSchedule[existingIndex],
            timeSlots: [newSlot]
          };
        } else {
          updatedSchedule.push({
            date: dateString,
            timeSlots: [newSlot]
          });
        }

        await profileService.saveProfile({
          ...currentProfileData,
          schedule: updatedSchedule
        });
        
        console.log('Disponibilité sauvegardée dans la BD');

        // Recharger les données
        const response = await profileService.getProfile();
        if (response.success && response.data.profile) {
          setCurrentProfileData(response.data.profile);
          updateParentProfileData({ schedule: updatedSchedule });
        }
      } catch (error) {
        console.error('Erreur sauvegarde:', error);
      }
    };

    saveToDatabase();
    setSelectedDates(prev => new Set([...Array.from(prev), dateString]));
    setShowAddModal(false);
    setSelectedDateForModal(null);
  };

  const removeAvailability = () => {
    if (!dateToDelete) return;
    
    const dateString = formatDateToLocalString(dateToDelete);
    console.log('Suppression disponibilité:', dateString);

    setDayAvailabilities(prev => {
      const newAvail = { ...prev };
      delete newAvail[dateString];
      return newAvail;
    });

    // Sauvegarder dans la base de données
    const saveToDatabase = async () => {
      try {
        const updatedSchedule = (currentProfileData?.schedule || []).filter((d: any) => d.date !== dateString);
        await profileService.saveProfile({
          ...currentProfileData,
          schedule: updatedSchedule
        });
        
        console.log('✅ Suppression sauvegardée dans la BD');

        // Recharger les données
        const response = await profileService.getProfile();
        if (response.success && response.data.profile) {
          setCurrentProfileData(response.data.profile);
          updateParentProfileData({ schedule: updatedSchedule });
        }
      } catch (error) {
        console.error('Erreur sauvegarde:', error);
      }
    };

    saveToDatabase();
    setSelectedDates(prev => {
      const newSet = new Set(prev);
      newSet.delete(dateString);
      return newSet;
    });
    
    setShowDeleteModal(false);
    setDateToDelete(null);
  };

  const isDateInPast = (date: Date) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    return date < today;
  };

  // Heures 06:00 -> 23:00
  const hours = Array.from({ length: 18 }, (_, i) => 6 + i);

  // Récupérer les valeurs actuelles pour l'affichage
  const currentAvailability = currentProfileData?.availability || { online: false, inPerson: false };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <p>Chargement de vos disponibilités...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1>Planifier vos disponibilités</h1>
          <p>Définissez vos créneaux disponibles pour les cours</p>
        </div>
        <div className={styles.availabilityTypes}>
          <div className={styles.typeSection}>
            <div className={styles.checkboxGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={currentAvailability.online}
                  onChange={() => handleAvailabilityTypeChange('online')}
                  className={styles.checkbox}
                />
                <span className={styles.checkboxText}>En ligne</span>
              </label>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={currentAvailability.inPerson}
                  onChange={() => handleAvailabilityTypeChange('inPerson')}
                  className={styles.checkbox}
                />
                <span className={styles.checkboxText}>En présentiel</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.calendarSection}>
        <div className={styles.calendarHeader}>
          <div className={styles.weekNavigation}>
            <button className={styles.navButton} onClick={() => navigateWeek('prev')}>
              ‹
            </button>
            <h2 className={styles.weekTitle}>{formatWeekRange()}</h2>
            <button className={styles.navButton} onClick={() => navigateWeek('next')}>
              ›
            </button>
          </div>
          <button className={styles.addButton} onClick={() => openAddModal()}>
            + Ajouter une disponibilité
          </button>
        </div>

        <div className={styles.calendar}>
          <div className={styles.daysHeader}>
            <div className={styles.timeHeader}>Heures</div>
            {weekDays.map((date, index) => {
              const availability = getAvailabilityForDate(date);
              const hasAvailability = availability && availability.timeSlots && availability.timeSlots.length > 0;
              const isPast = isDateInPast(date);
              
              return (
                <div key={index} className={`${styles.dayHeader} ${isPast ? styles.past : ''}`}>
                  <div className={styles.weekday}>
                    {date.toLocaleDateString('fr-FR', { weekday: 'short' })}
                  </div>
                  <div className={styles.date}>
                    {date.getDate()}
                  </div>
                  {hasAvailability && (
                    <div 
                      className={styles.availabilityDot} 
                      style={{ background: getAvailabilityColor() }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className={styles.calendarGrid}>
            <div className={styles.timeColumn}>
              {hours.map(hour => (
                <div key={hour} className={styles.hourSlot}>
                  {`${hour.toString().padStart(2, '0')}:00`}
                </div>
              ))}
            </div>

            {weekDays.map((date, dayIndex) => {
              const isPast = isDateInPast(date);
              const availabilityBlocks = getAvailabilityBlocks(date);

              return (
                <div key={dayIndex} className={styles.dayColumn}>
                  {hours.map((hour) => {
                    const hourMinutes = hour * 60;
                    
                    // Vérifier si cette heure fait partie d'un bloc de disponibilité
                    const isInBlock = availabilityBlocks.some(block => 
                      hourMinutes >= block.start && hourMinutes < block.end
                    );

                    return (
                      <div
                        key={hour}
                        className={`${styles.hourCell} ${isPast ? styles.past : ''}`}
                        onClick={() => !isPast && openAddModal(date)}
                        title={!isPast ? 'Ajouter / modifier disponibilité' : 'Date passée'}
                      >
                        {/* Afficher le bloc de disponibilité seulement sur la première heure du bloc */}
                        {isInBlock && availabilityBlocks.map((block, blockIndex) => {
                          if (hourMinutes === block.start) {
                            const duration = block.end - block.start;
                            const height = (duration / 60) * 60; // Hauteur en pixels
                            
                            return (
                              <div
                                key={blockIndex}
                                className={styles.availabilityBlock}
                                style={{
                                  height: `${height}px`,
                                  background: getAvailabilityColor(),
                                  zIndex: 2
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openAddModal(date);
                                }}
                              >
                                <div className={styles.availabilityContent}>
                                  <div className={styles.availabilityLabel}>Disponibilité
                                    <div className={styles.availabilityTime}>
                                      {block.slot.allDay 
                                        ? 'Toute la journée' 
                                        : `${block.slot.startTime} - ${block.slot.endTime}`
                                      }
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal d'ajout/modification avec style AvailabilityStep */}
      {showAddModal && (
      <div className={styles.modalOverlay}>
        <div className={styles.modal}>
          <div className={styles.modalHeader}>
            <h3>
              {selectedDateForModal 
                ? `Modifier la disponibilité pour le ${selectedDateForModal.toLocaleDateString('fr-FR', { 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric' 
                  })}` 
                : 'Ajouter une disponibilité'
              }
            </h3>
            <button
              className={styles.closeButton}
              onClick={() => {
                setShowAddModal(false);
                setSelectedDateForModal(null);
              }}
            >
              ×
            </button>
          </div>
          <div className={styles.modalContent}>
            {!selectedDateForModal && (
              <div className={styles.dateSelection}>
                <label className={styles.dateLabel}>Choisir une date</label>
                <input
                  type="date"
                  className={styles.dateInput}
                  min={formatDateToLocalString(new Date())}
                  onChange={(e) => {
                    if (e.target.value) {
                      const [year, month, day] = e.target.value.split('-').map(Number);
                      setSelectedDateForModal(new Date(year, month - 1, day));
                    }
                  }}
                />
              </div>
            )}

            {selectedDateForModal && (
              <>
                <div className={styles.selectedDate}>
                  {selectedDateForModal.toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </div>

                {/* Style AvailabilityStep pour la configuration des horaires */}
                <div className={styles.timeSlotConfig}>        
                  {!newAvailability.allDay && (
                    <div className={styles.timeInputs}>
                      <div className={styles.timeInputGroup}>
                        <label>De</label>
                        <div className={styles.customDropdown} ref={setDropdownRef('startTime')}>
                          <button
                            type="button"
                            className={styles.dropdownButton}
                            onClick={() => toggleDropdown('startTime')}
                          >
                            <span className={styles.dropdownText}>
                              {newAvailability.startTime}
                            </span>
                            <span className={styles.dropdownArrow}>▼</span>
                          </button>
                          {dropdownOpen.startTime && (
                            <div className={`${styles.dropdownMenu} ${styles.dropdownMenuUp}`}>
                              {getFilteredTimeOptions('startTime').map(time => (
                                <div
                                  key={time}
                                  className={`${styles.dropdownItem} ${newAvailability.startTime === time ? styles.selected : ''}`}
                                  onClick={() => handleSelectOption('startTime', time)}
                                >
                                  {time}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className={styles.timeSeparator}>
                        <span>—</span>
                      </div>
                      
                      <div className={styles.timeInputGroup}>
                        <label>À</label>
                        <div className={styles.customDropdown} ref={setDropdownRef('endTime')}>
                          <button
                            type="button"
                            className={styles.dropdownButton}
                            onClick={() => toggleDropdown('endTime')}
                          >
                            <span className={styles.dropdownText}>
                              {newAvailability.endTime}
                            </span>
                            <span className={styles.dropdownArrow}>▼</span>
                          </button>
                          {dropdownOpen.endTime && (
                            <div className={`${styles.dropdownMenu} ${styles.dropdownMenuUp}`}>
                              {getFilteredTimeOptions('endTime').map(time => (
                                <div
                                  key={time}
                                  className={`${styles.dropdownItem} ${newAvailability.endTime === time ? styles.selected : ''}`}
                                  onClick={() => handleSelectOption('endTime', time)}
                                >
                                  {time}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className={styles.timeSlotHeader}>
                    <label className={styles.allDayLabel}>
                      <input
                        type="checkbox"
                        checked={newAvailability.allDay}
                        onChange={(e) => setNewAvailability(prev => ({
                          ...prev,
                          allDay: e.target.checked,
                          startTime: e.target.checked ? '00:00' : '06:00',
                          endTime: e.target.checked ? '23:59' : '23:00'
                        }))}
                        className={styles.allDayCheckbox}
                      />
                      Toute la journée
                    </label>
                  </div>
                  
                  {newAvailability.allDay && (
                    <div className={styles.allDayBadge}>
                      Disponible toute la journée
                    </div>
                  )}
                </div>

                <div className={styles.modalActions}>
                  <button
                    className={styles.deleteButton}
                    onClick={() => {
                      if (getAvailabilityForDate(selectedDateForModal)) {
                        openDeleteModal(selectedDateForModal);
                      }
                      setShowAddModal(false);
                    }}
                    disabled={!getAvailabilityForDate(selectedDateForModal)}
                  >
                    Supprimer
                  </button>
                  <div className={styles.modalActionGroup}>
                    <button
                      className={styles.cancelButton}
                      onClick={() => {
                        setShowAddModal(false);
                        setSelectedDateForModal(null);
                      }}
                    >
                      Annuler
                    </button>
                    <button
                      className={styles.confirmButton}
                      onClick={addAvailability}
                      disabled={!selectedDateForModal}
                    >
                      Confirmer
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    )}

      {/* Modal de suppression amélioré */}
      {showDeleteModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.deleteModal}>
            <div className={styles.deleteModalHeader}>
              <h3>Supprimer la disponibilité</h3>
            </div>
            <div className={styles.deleteModalContent}>
              <p className={styles.deleteModalText}>
                Êtes-vous sûr de vouloir supprimer cette disponibilité ?<br />
                <span className={styles.deleteModalSubtext}>
                  Cette action est irréversible.
                </span>
              </p>
            </div>
            <div className={styles.deleteModalActions}>
              <button
                className={styles.deleteModalCancel}
                onClick={() => setShowDeleteModal(false)}
              >
                Annuler
              </button>
              <button
                className={styles.deleteModalConfirm}
                onClick={removeAvailability}
              >
                Oui, supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AvailabilityPage;