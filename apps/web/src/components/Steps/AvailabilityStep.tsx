import React, { useState, useEffect, useRef } from 'react';
import styles from './AvailabilityStep.module.css';

interface AvailabilityStepProps {
  profileData: any;
  setProfileData: (data: any) => void;
  role: string;
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

const AvailabilityStep: React.FC<AvailabilityStepProps> = ({
  profileData,
  setProfileData
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [dayAvailabilities, setDayAvailabilities] = useState<{[key: string]: DayAvailability}>({});
  const dropdownRefs = useRef<{ [key: string]: { [key: number]: { startTime?: HTMLDivElement | null; endTime?: HTMLDivElement | null } } }>({});
  const [dropdownOpen, setDropdownOpen] = useState<{ [key: string]: { [key: number]: { startTime: boolean; endTime: boolean } } }>({});
  const [isInitialized, setIsInitialized] = useState(false);
  const isInitialLoad = useRef(true);

  const formatDateToLocalString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Vérifier si au moins une option de disponibilité est cochée
  const hasAvailabilityTypeSelected = profileData.availability?.online || profileData.availability?.inPerson;

  useEffect(() => {
    if (!isInitialized && isInitialLoad.current) {
      console.log('Initialisation AvailabilityStep');
      
      // Nettoyer les dates passées du schedule
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const schedule = (profileData.schedule || []).filter((day: DayAvailability) => {
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
              startTime: slot.startTime || '09:00',
              endTime: slot.endTime || '17:00',
              allDay: slot.allDay || false
            }))
          };
        }
      });

      setSelectedDates(newSelectedDates);
      setDayAvailabilities(newDayAvailabilities);
      setIsInitialized(true);
      isInitialLoad.current = false;
      
      console.log('Disponibilités initialisées:', newDayAvailabilities);
    }
  }, [profileData.schedule, isInitialized]);

  // Sauvegarde automatique avec nettoyage des dates passées
  useEffect(() => {
    if (isInitialized && !isInitialLoad.current) {
      console.log('🔄 Sauvegarde des disponibilités');
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const scheduleData = Object.values(dayAvailabilities)
        .filter(day => {
          if (!day || !day.date) return false;
          const [year, month, dayNum] = day.date.split('-').map(Number);
          const dayDate = new Date(year, month - 1, dayNum);
          dayDate.setHours(0, 0, 0, 0);
          return dayDate >= today;
        })
        .filter(day => day && day.date && day.timeSlots && day.timeSlots.length > 0)
        .map(day => ({
          date: day.date,
          timeSlots: day.timeSlots.map(slot => ({
            startTime: slot.startTime || '09:00',
            endTime: slot.endTime || '17:00',
            allDay: slot.allDay || false
          }))
        }));

      setProfileData((prev: any) => ({
        ...prev,
        availability: {
          online: prev.availability?.online || false,
          inPerson: prev.availability?.inPerson || false
        },
        schedule: scheduleData  
      }));
    }
  }, [dayAvailabilities, isInitialized, setProfileData]);

  const handleAvailabilityChange = (type: 'online' | 'inPerson') => {
    const newValue = !profileData.availability?.[type];
    console.log(`Changement ${type}:`, newValue);
    
    setProfileData((prev: any) => ({
      ...prev,
      availability: {
        ...prev.availability,
        [type]: newValue
      }
    }));
  };

  // Calendrier
  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const days = [];
    
    // Calculer le décalage pour commencer au bon jour de la semaine
    let startOffset = firstDay.getDay() - 1; 
    if (startOffset < 0) startOffset = 6;
    
    // Ajouter les jours du mois précédent pour compléter la première semaine
    for (let i = startOffset; i > 0; i--) {
      const date = new Date(year, month, -i + 1);
      days.push({ date, isCurrentMonth: false });
    }
    
    // Ajouter tous les jours du mois courant
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      days.push({ date, isCurrentMonth: true });
    }
    
    return days;
  };

  const days = getDaysInMonth();
  
  // Générer les options de 6h à 23h
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

  // Heures par défaut de 6h à 23h
  const toggleDateSelection = (date: Date) => {
    if (!date) return;
    
    const dateString = formatDateToLocalString(date);
    console.log('Toggle date:', dateString, 'Date originale:', date);
    
    // Empêcher la sélection des dates passées
    if (isDateInPast(date)) {
      return;
    }
    
    setSelectedDates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dateString)) {
        newSet.delete(dateString);
        setDayAvailabilities(prevAvail => {
          const newAvailabilities = { ...prevAvail };
          delete newAvailabilities[dateString];
          return newAvailabilities;
        });
      } else {
        newSet.add(dateString);
        setDayAvailabilities(prevAvail => ({
          ...prevAvail,
          [dateString]: {
            date: dateString,
            timeSlots: [{
              startTime: '09:00', 
              endTime: '17:00',  
              allDay: false
            }]
          }
        }));
      }
      return newSet;
    });
  };

  // Mettre à jour pour 6h-23h
  const toggleAllDay = (dateString: string, slotIndex: number) => {
    console.log('🌞 Toggle toute la journée:', dateString);
    
    setDayAvailabilities(prev => {
      const dayAvailability = prev[dateString];
      if (!dayAvailability) return prev;

      const updatedTimeSlots = [...dayAvailability.timeSlots];
      const currentAllDay = updatedTimeSlots[slotIndex].allDay;
      
      updatedTimeSlots[slotIndex] = {
        ...updatedTimeSlots[slotIndex],
        allDay: !currentAllDay,
        startTime: !currentAllDay ? '00:00' : '06:00',
        endTime: !currentAllDay ? '23:59' : '23:00'
      };

      return {
        ...prev,
        [dateString]: {
          ...dayAvailability,
          timeSlots: updatedTimeSlots
        }
      };
    });
  };

  // Ajouter un créneau avec 6h-23h
  const addTimeSlot = (dateString: string) => {
    console.log('➕ Ajout créneau pour:', dateString);
    
    setDayAvailabilities(prev => {
      const dayAvailability = prev[dateString];
      if (!dayAvailability) return prev;

      const lastEndTime = dayAvailability.timeSlots.reduce((latest, slot) => {
        return slot.endTime > latest ? slot.endTime : latest;
      }, '06:00');

      const lastEndIndex = timeOptions.indexOf(lastEndTime);
      if (lastEndIndex === -1 || lastEndIndex >= timeOptions.length - 2) {
        return prev;
      }

      const newStartTime = timeOptions[lastEndIndex + 1];
      const newEndTime = timeOptions[lastEndIndex + 2];

      return {
        ...prev,
        [dateString]: {
          ...dayAvailability,
          timeSlots: [
            ...dayAvailability.timeSlots,
            {
              startTime: newStartTime,
              endTime: newEndTime,
              allDay: false
            }
          ]
        }
      };
    });
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      if (direction === 'prev') {
        newMonth.setMonth(prev.getMonth() - 1);
      } else {
        newMonth.setMonth(prev.getMonth() + 1);
      }
      return newMonth;
    });
  };

  // Fermer les dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      Object.entries(dropdownRefs.current).forEach(([dateStr, slots]) => {
        Object.entries(slots).forEach(([slotIndexStr, refs]) => {
          const slotIndex = parseInt(slotIndexStr);
          Object.entries(refs).forEach(([field, ref]) => {
            if (ref && !ref.contains(event.target as Node)) {
              setDropdownOpen(prev => ({
                ...prev,
                [dateStr]: {
                  ...prev[dateStr],
                  [slotIndex]: {
                    ...prev[dateStr]?.[slotIndex],
                    [field as 'startTime' | 'endTime']: false
                  }
                }
              }));
            }
          });
        });
      });
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = (dateString: string, slotIndex: number, field: 'startTime' | 'endTime') => {
    setDropdownOpen(prev => ({
      ...prev,
      [dateString]: {
        ...prev[dateString],
        [slotIndex]: {
          ...prev[dateString]?.[slotIndex],
          [field]: !prev[dateString]?.[slotIndex]?.[field]
        }
      }
    }));
  };

  const handleSelectOption = (dateString: string, slotIndex: number, field: 'startTime' | 'endTime', value: string) => {
    console.log(`⏰ Sélection ${field}:`, value);
    updateTimeSlot(dateString, slotIndex, field, value);
    setDropdownOpen(prev => ({
      ...prev,
      [dateString]: {
        ...prev[dateString],
        [slotIndex]: {
          ...prev[dateString]?.[slotIndex],
          [field]: false
        }
      }
    }));
  };

  const setDropdownRef = (dateString: string, slotIndex: number, field: 'startTime' | 'endTime') => (el: HTMLDivElement | null) => {
    if (!dropdownRefs.current[dateString]) {
      dropdownRefs.current[dateString] = {};
    }
    if (!dropdownRefs.current[dateString][slotIndex]) {
      dropdownRefs.current[dateString][slotIndex] = {};
    }
    dropdownRefs.current[dateString][slotIndex][field] = el;
  };

  const getFilteredTimeOptions = (dateString: string, slotIndex: number, field: 'startTime' | 'endTime') => {
    const dayAvailability = dayAvailabilities[dateString];
    if (!dayAvailability) return timeOptions;

    const timeSlot = dayAvailability.timeSlots[slotIndex];
    if (!timeSlot) return timeOptions;

    if (field === 'startTime') {
      if (timeSlot.endTime) {
        return timeOptions.filter(time => time < timeSlot.endTime);
      }
    } else {
      if (timeSlot.startTime) {
        return timeOptions.filter(time => time > timeSlot.startTime);
      }
    }

    return timeOptions;
  };

  const updateTimeSlot = (dateString: string, slotIndex: number, field: keyof TimeSlot, value: any) => {
    console.log(`🔄 Update ${field} pour ${dateString}:`, value);
    
    setDayAvailabilities(prev => {
      const dayAvailability = prev[dateString];
      if (!dayAvailability) return prev;

      const updatedTimeSlots = [...dayAvailability.timeSlots];
      const currentSlot = updatedTimeSlots[slotIndex];
      
      let newStartTime = currentSlot.startTime;
      let newEndTime = currentSlot.endTime;
      
      if (field === 'startTime') {
        newStartTime = value;
        if (newStartTime >= newEndTime) {
          const startIndex = timeOptions.indexOf(newStartTime);
          if (startIndex < timeOptions.length - 1) {
            newEndTime = timeOptions[startIndex + 1];
          }
        }
      } else if (field === 'endTime') {
        newEndTime = value;
        if (newEndTime <= newStartTime) {
          const endIndex = timeOptions.indexOf(newEndTime);
          if (endIndex > 0) {
            newStartTime = timeOptions[endIndex - 1];
          }
        }
      }
      
      updatedTimeSlots[slotIndex] = {
        ...currentSlot,
        startTime: newStartTime,
        endTime: newEndTime
      };

      return {
        ...prev,
        [dateString]: {
          ...dayAvailability,
          timeSlots: updatedTimeSlots
        }
      };
    });
  };

  const removeTimeSlot = (dateString: string, slotIndex: number) => {
    console.log('➖ Suppression créneau:', dateString, slotIndex);
    
    setDayAvailabilities(prev => {
      const dayAvailability = prev[dateString];
      if (!dayAvailability) return prev;

      const updatedTimeSlots = dayAvailability.timeSlots.filter((_, index) => index !== slotIndex);
      
      if (updatedTimeSlots.length === 0) {
        const newAvailabilities = { ...prev };
        delete newAvailabilities[dateString];
        setSelectedDates(prev => {
          const newSet = new Set(prev);
          newSet.delete(dateString);
          return newSet;
        });
        return newAvailabilities;
      }

      return {
        ...prev,
        [dateString]: {
          ...dayAvailability,
          timeSlots: updatedTimeSlots
        }
      };
    });
  };

  const isDateSelected = (date: Date) => {
    const dateString = formatDateToLocalString(date);
    return selectedDates.has(dateString);
  };

  const isDateInPast = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const isDateDisabled = (date: Date) => {
    return isDateInPast(date);
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  };

  const sortDatesChronologically = (dates: Set<string>): string[] => {
    return Array.from(dates).sort((a, b) => {
      return new Date(a).getTime() - new Date(b).getTime();
    });
  };

  return (
    <div className={styles.container}>
      <h2>Vos disponibilités</h2>
      <p className={styles.subtitle}>
        Définissez vos créneaux disponibles pour les cours (6h - 23h)
      </p>

      <div className={styles.formGrid}>
        <div className={`${styles.formGroup} ${styles.fullWidth}`}>
          <label className={styles.label}>Type de cours</label>
          <div className={styles.availabilityTypes}>
            <div className={styles.checkboxRow}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={profileData.availability?.online || false}
                  onChange={() => handleAvailabilityChange('online')}
                  className={styles.checkbox}
                />
                <span className={styles.checkboxText}>En ligne</span>
              </label>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={profileData.availability?.inPerson || false}
                  onChange={() => handleAvailabilityChange('inPerson')}
                  className={styles.checkbox}
                />
                <span className={styles.checkboxText}>En présentiel</span>
              </label>
            </div>
          </div>
        </div>

        {/* Calendrier mensuel */}
        {hasAvailabilityTypeSelected && (
          <div className={`${styles.formGroup} ${styles.fullWidth}`}>
            <label className={styles.label}>Sélectionnez vos jours disponibles</label>
            
            <div className={styles.calendar}>
              <div className={styles.calendarHeader}>
                <button 
                  className={styles.navButton}
                  onClick={() => navigateMonth('prev')}
                >
                  ‹
                </button>
                <h3 className={styles.monthTitle}>
                  {formatMonthYear(currentMonth)}
                </h3>
                <button 
                  className={styles.navButton}
                  onClick={() => navigateMonth('next')}
                >
                  ›
                </button>
              </div>

              <div className={styles.weekDays}>
                {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
                  <div key={day} className={styles.weekDay}>{day}</div>
                ))}
              </div>

              <div className={styles.calendarGrid}>
                {days.map(({ date, isCurrentMonth }, index) => {
                  const disabled = isDateDisabled(date);
                  
                  return (
                    <button
                      key={index}
                      className={`${styles.calendarDay} ${
                        !isCurrentMonth ? styles.otherMonth : ''
                      } ${isDateSelected(date) ? styles.selected : ''} ${
                        disabled ? styles.disabled : ''
                      }`}
                      onClick={() => !disabled && isCurrentMonth && toggleDateSelection(date)}
                      disabled={disabled || !isCurrentMonth}
                      title={date.toLocaleDateString('fr-FR', { 
                        weekday: 'long', 
                        day: 'numeric', 
                        month: 'long' 
                      })}
                    >
                      <span className={styles.dayNumber}>
                        {date.getDate()}
                      </span>
                      {isDateSelected(date) && (
                        <div className={styles.selectedIndicator}>✓</div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Configuration des horaires */}
        {hasAvailabilityTypeSelected && selectedDates.size > 0 && (
          <div className={`${styles.formGroup} ${styles.fullWidth}`}>
            <label className={styles.label}>
              Configurez vos horaires pour les jours sélectionnés ({selectedDates.size})
            </label>
            
            <div className={styles.timeSlotsContainer}>
              {sortDatesChronologically(selectedDates).map(dateStr => {
                const date = new Date(dateStr);
                const dayAvailability = dayAvailabilities[dateStr];
                
                if (!dayAvailability) return null;
                
                return (
                  <div key={dateStr} className={styles.dateSection}>
                    <div className={styles.dateHeader}>
                      <h4 className={styles.dateTitle}>
                        {date.toLocaleDateString('fr-FR', { 
                          weekday: 'long', 
                          day: 'numeric', 
                          month: 'long',
                          year: 'numeric'
                        })}
                      </h4>
                      <button
                        className={styles.removeDateButton}
                        onClick={() => toggleDateSelection(date)}
                      >
                        ×
                      </button>
                    </div>
                    
                    <div className={styles.timeSlotsList}>
                      {dayAvailability.timeSlots.map((timeSlot, slotIndex) => (
                        <div key={slotIndex} className={styles.timeSlotConfig}>
                          <div className={styles.timeSlotHeader}>
                            <label className={styles.allDayLabel}>
                              <input
                                type="checkbox"
                                checked={timeSlot.allDay}
                                onChange={() => toggleAllDay(dateStr, slotIndex)}
                                className={styles.allDayCheckbox}
                              />
                              Toute la journée
                            </label>
                            {dayAvailability.timeSlots.length > 1 && (
                              <button
                                className={styles.removeSlotButton}
                                onClick={() => removeTimeSlot(dateStr, slotIndex)}
                              >
                                Supprimer
                              </button>
                            )}
                          </div>
                          
                          {!timeSlot.allDay && (
                            <div className={styles.timeInputs}>
                              <div className={styles.timeInputGroup}>
                                <label>De</label>
                                <div className={styles.customDropdown} ref={setDropdownRef(dateStr, slotIndex, 'startTime')}>
                                  <button
                                    type="button"
                                    className={styles.dropdownButton}
                                    onClick={() => toggleDropdown(dateStr, slotIndex, 'startTime')}
                                  >
                                    <span className={styles.dropdownText}>
                                      {timeSlot.startTime}
                                    </span>
                                    <span className={styles.dropdownArrow}>▼</span>
                                  </button>
                                  {dropdownOpen[dateStr]?.[slotIndex]?.startTime && (
                                    <div className={styles.dropdownMenu}>
                                      {getFilteredTimeOptions(dateStr, slotIndex, 'startTime').map(time => (
                                        <div
                                          key={time}
                                          className={`${styles.dropdownItem} ${timeSlot.startTime === time ? styles.selected : ''}`}
                                          onClick={() => handleSelectOption(dateStr, slotIndex, 'startTime', time)}
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
                                <div className={styles.customDropdown} ref={setDropdownRef(dateStr, slotIndex, 'endTime')}>
                                  <button
                                    type="button"
                                    className={styles.dropdownButton}
                                    onClick={() => toggleDropdown(dateStr, slotIndex, 'endTime')}
                                  >
                                    <span className={styles.dropdownText}>
                                      {timeSlot.endTime}
                                    </span>
                                    <span className={styles.dropdownArrow}>▼</span>
                                  </button>
                                  {dropdownOpen[dateStr]?.[slotIndex]?.endTime && (
                                    <div className={styles.dropdownMenu}>
                                      {getFilteredTimeOptions(dateStr, slotIndex, 'endTime').map(time => (
                                        <div
                                          key={time}
                                          className={`${styles.dropdownItem} ${timeSlot.endTime === time ? styles.selected : ''}`}
                                          onClick={() => handleSelectOption(dateStr, slotIndex, 'endTime', time)}
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
                          
                          {timeSlot.allDay && (
                            <div className={styles.allDayBadge}>
                              Disponible toute la journée
                            </div>
                          )}
                        </div>
                      ))}
                      
                      <button
                        className={styles.addSlotButton}
                        onClick={() => addTimeSlot(dateStr)}
                      >
                        + Ajouter un autre créneau
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AvailabilityStep;