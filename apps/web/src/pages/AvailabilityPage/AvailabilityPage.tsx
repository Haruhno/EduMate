import React, { useState, useEffect, useRef } from 'react';
import styles from './AvailabilityPage.module.css';
import profileService from '../../services/profileService';

interface TimeSlot {
  startTime: string;
  endTime: string;
  allDay: boolean;
  types: ('online' | 'inPerson')[];
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
  const [newAvailability, setNewAvailability] = useState<TimeSlot>({ 
    startTime: '06:00', 
    endTime: '07:00', 
    allDay: false,
    types: ['online', 'inPerson']
  });
  const [clickedHour, setClickedHour] = useState<number | null>(null);
  const [isModifying, setIsModifying] = useState(false);
  const [modifyingSlotIndex, setModifyingSlotIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentProfileData, setCurrentProfileData] = useState<any>({});

  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [dropdownOpen, setDropdownOpen] = useState<{ startTime: boolean; endTime: boolean }>({ 
    startTime: false, 
    endTime: false 
  });

  const isInitialLoad = useRef(true);
  const hasLoadedFromDB = useRef(false);

  const formatDateToLocalString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

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

  const hourToTimeString = (hour: number): string => {
    return `${hour.toString().padStart(2, '0')}:00`;
  };

  const getNextAvailableTime = (hour: number): string => {
    const currentTime = hourToTimeString(hour);
    const index = timeOptions.indexOf(currentTime);
    if (index < timeOptions.length - 1) {
      return timeOptions[index + 1];
    }
    return timeOptions[timeOptions.length - 1];
  };

  const toggleSlotType = (type: 'online' | 'inPerson') => {
    setNewAvailability(prev => {
      const currentTypes = [...prev.types];
      if (currentTypes.includes(type)) {
        if (currentTypes.length > 1) {
          return {
            ...prev,
            types: currentTypes.filter(t => t !== type)
          };
        }
        return prev;
      } else {
        return {
          ...prev,
          types: [...currentTypes, type]
        };
      }
    });
  };

  // Retour aux couleurs originales
  const getSlotColor = (types: ('online' | 'inPerson')[]) => {
    if (types.includes('online') && types.includes('inPerson')) {
      return '#eff6ff'; 
    }
    if (types.includes('online')) {
      return '#d6f5dfff'; 
    }
    if (types.includes('inPerson')) {
      return '#fffbc0ff'; 
    }
    return '#d6f5dfff'; 
  };


  const getSlotLabel = (types: ('online' | 'inPerson')[]) => {
    if (types.includes('online') && types.includes('inPerson')) {
      return 'En ligne & Présentiel';
    }
    if (types.includes('online')) {
      return 'En ligne';
    }
    if (types.includes('inPerson')) {
      return 'Présentiel';
    }
    return 'Disponibilité';
  };

  useEffect(() => {
    const loadProfileData = async () => {
      if (hasLoadedFromDB.current) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await profileService.getProfile();
        
        if (response.success && response.data.profile) {
          const profile = response.data.profile;

          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const schedule = (profile.schedule || []).filter((day: DayAvailability) => {
            if (!day.date) return false;
            const dayDate = new Date(day.date);
            dayDate.setHours(0, 0, 0, 0);
            return dayDate >= today;
          });

          const newSelectedDates = new Set<string>();
          const newDayAvailabilities: { [key: string]: DayAvailability } = {};

          schedule.forEach((day: DayAvailability) => {
            if (day.date && day.timeSlots && day.timeSlots.length > 0) {
              newSelectedDates.add(day.date);
              newDayAvailabilities[day.date] = {
                date: day.date,
                timeSlots: day.timeSlots.map(slot => ({
                  startTime: slot.startTime || '06:00',
                  endTime: slot.endTime || '07:00',
                  allDay: !!slot.allDay,
                  types: slot.types || ['online', 'inPerson']
                }))
              };
            }
          });

          setSelectedDates(newSelectedDates);
          setDayAvailabilities(newDayAvailabilities);
          setCurrentProfileData({
            ...profile,
            schedule: schedule
          });
          hasLoadedFromDB.current = true;
          isInitialLoad.current = false;

          if (schedule.length !== (profile.schedule || []).length) {
            await profileService.saveProfile({
              ...profile,
              schedule: schedule
            });
          }
        } else {
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

  useEffect(() => {
    if (!isInitialLoad.current && profileData && Object.keys(profileData).length > 0 && 
        JSON.stringify(profileData) !== JSON.stringify(currentProfileData)) {
      
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
              endTime: slot.endTime || '07:00',
              allDay: !!slot.allDay,
              types: slot.types || ['online', 'inPerson']
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

  const updateParentProfileData = (updatedData: any) => {
    if (setProfileData) {
      setProfileData((prev: any) => ({ ...prev, ...updatedData }));
    }
  };

  const getWeekDays = () => {
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const startDate = new Date(currentWeek);
    startDate.setHours(0,0,0,0);
    
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

  const getAvailabilityForDate = (date: Date): DayAvailability | undefined => {
    const dateString = formatDateToLocalString(date);
    return dayAvailabilities[dateString];
  };

  const formatWeekRange = () => {
    const start = weekDays[0];
    const end = weekDays[6];
    return `${start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} - ${end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`;
  };

  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const getAvailabilityBlocks = (date: Date) => {
    const availability = getAvailabilityForDate(date);
    if (!availability || !availability.timeSlots) return [];

    const blocks: { start: number; end: number; slot: TimeSlot, slotIndex: number }[] = [];
    
    availability.timeSlots.forEach((slot, slotIndex) => {
      if (slot.allDay) {
        blocks.push({ start: 360, end: 1380, slot, slotIndex });
      } else {
        const startMinutes = timeToMinutes(slot.startTime);
        const endMinutes = timeToMinutes(slot.endTime);
        blocks.push({ start: startMinutes, end: endMinutes, slot, slotIndex });
      }
    });

    return blocks;
  };

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
    if (field === 'startTime') {
      setNewAvailability(prev => {
        let newEndTime = prev.endTime;
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

  const openModifyModal = (date: Date, slotIndex: number) => {
    if (isDateInPast(date)) {
      alert("Cette date est déjà passée. Veuillez choisir une autre disponibilité.");
      return;
    }
    
    const availability = getAvailabilityForDate(date);
    if (!availability || !availability.timeSlots[slotIndex]) return;
    
    setIsModifying(true);
    setModifyingSlotIndex(slotIndex);
    const existingSlot = availability.timeSlots[slotIndex];
    setNewAvailability({
      startTime: existingSlot.startTime,
      endTime: existingSlot.endTime,
      allDay: existingSlot.allDay,
      types: existingSlot.types
    });
    setClickedHour(null);
    setSelectedDateForModal(date);
    setShowAddModal(true);
  };

  const openAddModal = (date: Date, hour: number) => {
    if (isDateInPast(date)) {
      alert("Cette date est déjà passée. Veuillez choisir une autre disponibilité.");
      return;
    }
    
    setIsModifying(false);
    setModifyingSlotIndex(null);
    const startTime = hourToTimeString(hour);
    const endTime = getNextAvailableTime(hour);
    
    setNewAvailability({
      startTime: startTime,
      endTime: endTime,
      allDay: false,
      types: ['online', 'inPerson']
    });
    setClickedHour(hour);
    setSelectedDateForModal(date);
    setShowAddModal(true);
  };

  const openDeleteModal = (date: Date, slotIndex?: number) => {
    setDateToDelete(date);
    if (slotIndex !== undefined) {
      setModifyingSlotIndex(slotIndex);
    }
    setShowDeleteModal(true);
  };

  const addOrUpdateAvailability = () => {
    if (!selectedDateForModal || newAvailability.types.length === 0) return;

    const dateString = formatDateToLocalString(selectedDateForModal);
    const newSlot: TimeSlot = {
      startTime: newAvailability.allDay ? '00:00' : newAvailability.startTime,
      endTime: newAvailability.allDay ? '23:59' : newAvailability.endTime,
      allDay: newAvailability.allDay,
      types: newAvailability.types
    };

    setDayAvailabilities(prev => {
      const existing = prev[dateString];
      
      if (isModifying && modifyingSlotIndex !== null && existing) {
        const updatedTimeSlots = [...existing.timeSlots];
        updatedTimeSlots[modifyingSlotIndex] = newSlot;
        
        return {
          ...prev,
          [dateString]: {
            ...existing,
            timeSlots: updatedTimeSlots
          }
        };
      } 
      else if (existing) {
        return {
          ...prev,
          [dateString]: {
            ...existing,
            timeSlots: [...existing.timeSlots, newSlot]
          }
        };
      } 
      else {
        return {
          ...prev,
          [dateString]: {
            date: dateString,
            timeSlots: [newSlot]
          }
        };
      }
    });

    const saveToDatabase = async () => {
      try {
        let updatedSchedule = Array.isArray(currentProfileData?.schedule) 
          ? [...currentProfileData.schedule] 
          : [];
        
        const existingIndex = updatedSchedule.findIndex((d: any) => d.date === dateString);
        
        if (existingIndex >= 0) {
          const existingDay = updatedSchedule[existingIndex];
          let updatedTimeSlots = [...existingDay.timeSlots];
          
          if (isModifying && modifyingSlotIndex !== null) {
            updatedTimeSlots[modifyingSlotIndex] = newSlot;
          } else {
            updatedTimeSlots.push(newSlot);
          }
          
          updatedSchedule[existingIndex] = {
            ...existingDay,
            timeSlots: updatedTimeSlots
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
    setClickedHour(null);
    setIsModifying(false);
    setModifyingSlotIndex(null);
  };

  const removeAvailability = () => {
    if (!dateToDelete) return;
    
    const dateString = formatDateToLocalString(dateToDelete);

    setDayAvailabilities(prev => {
      const existing = prev[dateString];
      if (!existing) return prev;
      
      if (modifyingSlotIndex !== null) {
        const updatedTimeSlots = existing.timeSlots.filter((_: TimeSlot, index: number) => index !== modifyingSlotIndex);
        
        if (updatedTimeSlots.length === 0) {
          const newAvail = { ...prev };
          delete newAvail[dateString];
          setSelectedDates(prevDates => {
            const newSet = new Set(prevDates);
            newSet.delete(dateString);
            return newSet;
          });
          return newAvail;
        }
        
        return {
          ...prev,
          [dateString]: {
            ...existing,
            timeSlots: updatedTimeSlots
          }
        };
      }
      
      const newAvail = { ...prev };
      delete newAvail[dateString];
      setSelectedDates(prevDates => {
        const newSet = new Set(prevDates);
        newSet.delete(dateString);
        return newSet;
      });
      return newAvail;
    });

    const saveToDatabase = async () => {
      try {
        let updatedSchedule = Array.isArray(currentProfileData?.schedule) 
          ? [...currentProfileData.schedule] 
          : [];
        
        const existingIndex = updatedSchedule.findIndex((d: any) => d.date === dateString);
        
        if (existingIndex >= 0 && modifyingSlotIndex !== null) {
          const existingDay = updatedSchedule[existingIndex];
          const updatedTimeSlots = existingDay.timeSlots.filter((_: TimeSlot, index: number) => index !== modifyingSlotIndex);
          
          if (updatedTimeSlots.length === 0) {
            updatedSchedule = updatedSchedule.filter((d: any) => d.date !== dateString);
          } else {
            updatedSchedule[existingIndex] = {
              ...existingDay,
              timeSlots: updatedTimeSlots
            };
          }
        } else {
          updatedSchedule = updatedSchedule.filter((d: any) => d.date !== dateString);
        }

        await profileService.saveProfile({
          ...currentProfileData,
          schedule: updatedSchedule
        });
        
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
    setShowDeleteModal(false);
    setDateToDelete(null);
    setModifyingSlotIndex(null);
  };

  const isDateInPast = (date: Date) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    return date < today;
  };

  const hours = Array.from({ length: 18 }, (_, i) => 6 + i);

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
          <button className={styles.addButton} onClick={() => {
            setIsModifying(false);
            setModifyingSlotIndex(null);
            setNewAvailability({ 
              startTime: '06:00', 
              endTime: '07:00', 
              allDay: false,
              types: ['online', 'inPerson']
            });
            setSelectedDateForModal(new Date());
            setShowAddModal(true);
          }}>
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
                    const isInBlock = availabilityBlocks.some(block => 
                      hourMinutes >= block.start && hourMinutes < block.end
                    );

                    return (
                      <div
                        key={hour}
                        className={`${styles.hourCell} ${isPast ? styles.past : ''} ${isInBlock ? styles.hasAvailability : ''}`}
                        onClick={() => !isPast && !isInBlock && openAddModal(date, hour)}
                        title={!isPast ? 
                          (isInBlock ? 
                            `Cliquez sur le bloc pour modifier` : 
                            `Ajouter une disponibilité à ${hour}h`
                          ) : 
                          'Date passée'
                        }
                      >
                      {availabilityBlocks.map((block, blockIndex) => {
                      if (hourMinutes === block.start) {
                        const duration = block.end - block.start;
                        const height = (duration / 60) * 60;
                        const isShortSlot = duration <= 60;
                        const slotColor = getSlotColor(block.slot.types);
                        
                        return (
                          <div
                            key={blockIndex}
                            className={styles.availabilityBlock}
                            style={{
                              height: `${height}px`,
                              background: slotColor,
                              zIndex: 2
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              openModifyModal(date, block.slotIndex); 
                            }}
                          >
                            <div className={styles.availabilityContent}>
                              <div className={styles.availabilityLabel}>
                                Disponibilité
                                {!isShortSlot && (
                                  <>
                                    <div className={styles.availabilityTime}>
                                      {block.slot.allDay 
                                        ? 'Toute la journée' 
                                        : `${block.slot.startTime} - ${block.slot.endTime}`
                                      }
                                    </div>
                                    <div className={styles.availabilityType}>
                                      ({getSlotLabel(block.slot.types)})
                                    </div>
                                  </>
                                )}
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

      {showAddModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>
                {isModifying ? 'Modifier la disponibilité' : 'Ajouter une disponibilité'}
              </h3>
              <button
                className={styles.closeButton}
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedDateForModal(null);
                  setClickedHour(null);
                  setIsModifying(false);
                  setModifyingSlotIndex(null);
                }}
              >
                ×
              </button>
            </div>
            <div className={styles.modalContentWrapper}>
              <div className={styles.modalContent}>
                <div className={styles.selectedDate}>
                  {selectedDateForModal?.toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </div>

                <div className={styles.typeSelection}>
                  <label className={styles.typeLabel}>Type de cours :</label>
                  <div className={styles.typeOptions}>
                    <label className={`${styles.typeOption} ${newAvailability.types.includes('online') ? styles.selected : ''}`}>
                      <input
                        type="checkbox"
                        checked={newAvailability.types.includes('online')}
                        onChange={() => toggleSlotType('online')}
                        className={styles.typeCheckbox}
                      />
                      <span className={styles.typeText}>En ligne</span>
                    </label>
                    <label className={`${styles.typeOption} ${newAvailability.types.includes('inPerson') ? styles.selected : ''}`}>
                      <input
                        type="checkbox"
                        checked={newAvailability.types.includes('inPerson')}
                        onChange={() => toggleSlotType('inPerson')}
                        className={styles.typeCheckbox}
                      />
                      <span className={styles.typeText}>En présentiel</span>
                    </label>
                  </div>
                  {newAvailability.types.length === 0 && (
                    <div className={styles.typeError}>
                      Veuillez sélectionner au moins un type de cours
                    </div>
                  )}
                </div>

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
                          startTime: e.target.checked ? '00:00' : prev.startTime,
                          endTime: e.target.checked ? '23:59' : prev.endTime
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
                  {isModifying && (
                    <button
                      className={styles.deleteButton}
                      onClick={() => {
                        if (selectedDateForModal) {
                          openDeleteModal(selectedDateForModal, modifyingSlotIndex ?? undefined);
                        }
                        setShowAddModal(false);
                        setClickedHour(null);
                        setIsModifying(false);
                        setModifyingSlotIndex(null);
                      }}
                    >
                      Supprimer ce créneau
                    </button>
                  )}
                  <div className={styles.modalActionGroup}>
                    <button
                      className={styles.cancelButton}
                      onClick={() => {
                        setShowAddModal(false);
                        setSelectedDateForModal(null);
                        setClickedHour(null);
                        setIsModifying(false);
                        setModifyingSlotIndex(null);
                      }}
                    >
                      Annuler
                    </button>
                    <button
                      className={styles.confirmButton}
                      onClick={addOrUpdateAvailability}
                      disabled={!selectedDateForModal || newAvailability.types.length === 0}
                    >
                      {isModifying ? 'Mettre à jour' : 'Ajouter'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.deleteModal}>
            <div className={styles.deleteModalHeader}>
              <h3>Supprimer le créneau</h3>
            </div>
            <div className={styles.deleteModalContent}>
              <p className={styles.deleteModalText}>
                Êtes-vous sûr de vouloir supprimer {modifyingSlotIndex !== null ? 
                  `le créneau ${modifyingSlotIndex + 1}` : 
                  'cette disponibilité'} ?<br />
                <span className={styles.deleteModalSubtext}>
                  Cette action est irréversible.
                </span>
              </p>
            </div>
            <div className={styles.deleteModalActions}>
              <button
                className={styles.deleteModalCancel}
                onClick={() => {
                  setShowDeleteModal(false);
                  setModifyingSlotIndex(null);
                }}
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