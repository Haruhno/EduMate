import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import bookingService from '../../services/bookingService';
import tutorService from '../../services/tutorService';
import annonceService from '../../services/annonceService';
import blockchainService from '../../services/blockchainService';
import authService from '../../services/authService';
import type { TutorFromDB } from '../../services/tutorService';
import type { AnnonceFromDB } from '../../services/annonceService';
import styles from './BookingPage.module.css';

const BookingPage: React.FC = () => {
  const { tutorId } = useParams<{ tutorId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [tutor, setTutor] = useState<TutorFromDB | null>(null);
  const [selectedAnnonce, setSelectedAnnonce] = useState<AnnonceFromDB | null>(null);
  const [tutorSchedule, setTutorSchedule] = useState<any[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<Array<{
    date: string, 
    time: string, 
    duration: number,
    id: string
  }>>([]);
  const [defaultDuration, setDefaultDuration] = useState<number>(60);
  const [amount, setAmount] = useState<number>(0);
  const [studentNotes, setStudentNotes] = useState<string>('');
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [weekDays, setWeekDays] = useState<any[]>([]);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(new Date());
  const [showAllSlots, setShowAllSlots] = useState<boolean>(false);

  const annonceIdFromState = location.state?.annonceId;

  // Fonction pour générer un ID unique
  const generateId = () => Math.random().toString(36).substr(2, 9);

  // Convertir une heure en minutes
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Convertir des minutes en heure
  const minutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  // Fonction pour générer la semaine
  const generateWeekDays = (startDate: Date) => {
    const days = [];
    const dayOfWeek = startDate.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(startDate);
    monday.setDate(startDate.getDate() + diffToMonday);
    
    const dayNames = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
    const monthNames = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      
      const dayName = dayNames[i];
      const dayNumber = day.getDate();
      const month = monthNames[day.getMonth()];
      const dateString = day.toISOString().split('T')[0];
      
      days.push({
        dayName,
        dayNumber,
        month,
        date: dateString,
        displayName: `${dayName} ${dayNumber} ${month}`
      });
    }
    
    return days;
  };

  useEffect(() => {
    const initialWeek = generateWeekDays(currentWeekStart);
    setWeekDays(initialWeek);
  }, [currentWeekStart]);

  const goToPreviousWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentWeekStart(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentWeekStart(newDate);
  };

  const formatWeekPeriod = () => {
    const monday = weekDays[0];
    const sunday = weekDays[6];
    if (!monday || !sunday) return '';
    return `Du ${monday.dayNumber} au ${sunday.dayNumber} ${sunday.month}`;
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!tutorId) {
          navigate('/');
          return;
        }

        const tutorResp = await tutorService.getTutorById(tutorId);
        if (tutorResp.success && tutorResp.data) {
          setTutor(tutorResp.data);
          try {
            const profileResp = await tutorService.getTutorProfile(tutorResp.data.id);
            if (profileResp.success && profileResp.data?.schedule) {
              setTutorSchedule(profileResp.data.schedule || []);
            }
          } catch (scheduleError) {
            console.warn('Impossible de charger les disponibilités:', scheduleError);
          }
        }

        let selectedAnnonceToSet = null;
        if (annonceIdFromState) {
          try {
            const annonceResp = await annonceService.getAnnonce(annonceIdFromState);
            if (annonceResp.success && annonceResp.data) {
              selectedAnnonceToSet = annonceResp.data;
            }
          } catch (annonceError) {
            console.error('Erreur chargement annonce spécifique:', annonceError);
          }
        }

        if (!selectedAnnonceToSet) {
          const annoncesResp = await tutorService.getAnnoncesByTutor(tutorId);
          if (annoncesResp.success && annoncesResp.data) {
            const annoncesList = annoncesResp.data.annonces || annoncesResp.data;
            if (annoncesList.length > 0) {
              selectedAnnonceToSet = annoncesList[0];
            }
          }
        }

        if (selectedAnnonceToSet) {
          setSelectedAnnonce(selectedAnnonceToSet);
        }

        const currentUser = authService.getCurrentUser();
        if (currentUser?.id) {
          try {
            const balanceData = await blockchainService.getBalance();
            const available = Number(
              balanceData?.wallet?.available ?? 
              balanceData?.wallet?.availableCredits ?? 
              balanceData?.wallet?.available ?? 
              balanceData?.wallet?.balanceCredits ?? 
              balanceData?.wallet?.balance ?? 0
            );
            setBalance(available);
          } catch (balanceError) {
            console.error('Erreur chargement solde:', balanceError);
            setBalance(0);
          }
        }
      } catch (err: any) {
        console.error('Erreur chargement booking page:', err);
        setError('Erreur lors du chargement des données');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [tutorId, navigate, annonceIdFromState]);

  // Calcul du montant total
  useEffect(() => {
    if (selectedAnnonce) {
      const hourlyRate = selectedAnnonce.hourlyRate || 30;
      let totalAmount = 0;
      selectedSlots.forEach(slot => {
        totalAmount += (hourlyRate * slot.duration) / 60;
      });
      setAmount(parseFloat(totalAmount.toFixed(2)));
    }
  }, [selectedAnnonce, selectedSlots]);

  // Vérifier si un créneau est disponible
  const isSlotAvailable = (dayDate: string, timeSlot: string, durationMinutes: number): boolean => {
    if (!tutorSchedule || tutorSchedule.length === 0) return false;
    
    const daySchedule = tutorSchedule.find((day: any) => day.date === dayDate);
    if (!daySchedule || !daySchedule.timeSlots || daySchedule.timeSlots.length === 0) return false;
    
    const timeSlots = daySchedule.timeSlots;
    for (const slot of timeSlots) {
      if (canFitDuration(timeSlot, durationMinutes, slot)) {
        return true;
      }
    }
    
    return false;
  };

  const canFitDuration = (startTime: string, durationMinutes: number, slot: any): boolean => {
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = startTotalMinutes + durationMinutes;
    
    if (slot.allDay) {
      return endTotalMinutes <= 21 * 60;
    } else {
      const [slotStartHour, slotStartMinute] = slot.startTime.split(':').map(Number);
      const [slotEndHour, slotEndMinute] = slot.endTime.split(':').map(Number);
      const slotStartTotalMinutes = slotStartHour * 60 + slotStartMinute;
      const slotEndTotalMinutes = slotEndHour * 60 + slotEndMinute;
      
      return startTotalMinutes >= slotStartTotalMinutes && 
             endTotalMinutes <= slotEndTotalMinutes;
    }
  };

  // Vérifier si un créneau est exactement sélectionné
  const isSlotSelected = (dayDate: string, timeSlot: string): boolean => {
    return selectedSlots.some(slot => slot.date === dayDate && slot.time === timeSlot);
  };

  // Obtenir la durée d'un créneau sélectionné
  const getSlotDuration = (dayDate: string, timeSlot: string): number => {
    const slot = selectedSlots.find(s => s.date === dayDate && s.time === timeSlot);
    return slot ? slot.duration : defaultDuration;
  };

  // NOUVELLE FONCTION: Vérifier si un créneau est dans la plage d'un créneau sélectionné
  const isSlotInSelectedRange = (dayDate: string, timeSlot: string): boolean => {
    const slotStart = timeToMinutes(timeSlot);
    
    for (const selectedSlot of selectedSlots) {
      if (selectedSlot.date === dayDate) {
        const selectedStart = timeToMinutes(selectedSlot.time);
        const selectedEnd = selectedStart + selectedSlot.duration;
        
        // Vérifier si le créneau est DANS la plage du créneau sélectionné
        if (slotStart >= selectedStart && slotStart < selectedEnd) {
          return true;
        }
      }
    }
    
    return false;
  };

  // NOUVELLE FONCTION: Obtenir tous les créneaux dans la plage
  const getAllSlotsInSelectedRanges = (dayDate: string): string[] => {
    const allSlotsInRanges: string[] = [];
    
    selectedSlots.forEach(selectedSlot => {
      if (selectedSlot.date === dayDate) {
        const selectedStart = timeToMinutes(selectedSlot.time);
        const selectedEnd = selectedStart + selectedSlot.duration;
        
        // Ajouter tous les créneaux de 30 minutes dans la plage
        for (let minutes = selectedStart; minutes < selectedEnd; minutes += 30) {
          allSlotsInRanges.push(minutesToTime(minutes));
        }
      }
    });
    
    return [...new Set(allSlotsInRanges)].sort();
  };

  // Vérifier si un créneau est disponible (tenant compte des plages sélectionnées)
  const isSlotAvailableWithSelection = (dayDate: string, timeSlot: string, durationMinutes: number): boolean => {
    // Vérifier d'abord avec le tuteur
    if (!isSlotAvailable(dayDate, timeSlot, durationMinutes)) {
      return false;
    }
    
    // Vérifier si le créneau est dans une plage déjà sélectionnée
    if (isSlotInSelectedRange(dayDate, timeSlot)) {
      return false;
    }
    
    // Vérifier si le créneau chevauche une plage sélectionnée
    const slotStart = timeToMinutes(timeSlot);
    const slotEnd = slotStart + durationMinutes;
    
    for (const selectedSlot of selectedSlots) {
      if (selectedSlot.date === dayDate) {
        const selectedStart = timeToMinutes(selectedSlot.time);
        const selectedEnd = selectedStart + selectedSlot.duration;
        
        if (slotStart < selectedEnd && slotEnd > selectedStart) {
          return false;
        }
      }
    }
    
    return true;
  };

  const getAllAvailableTimeSlots = () => {
    const allSlots = new Set<string>();
    
    weekDays.forEach(day => {
      const slots = getAvailableSlotsForDay(day.date, defaultDuration);
      slots.forEach(slot => allSlots.add(slot));
    });
    
    if (allSlots.size === 0) {
      for (let hour = 8; hour <= 20; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          const [startHour, startMinute] = timeString.split(':').map(Number);
          const startTotalMinutes = startHour * 60 + startMinute;
          const endTotalMinutes = startTotalMinutes + defaultDuration;
          if (endTotalMinutes <= 21 * 60) {
            allSlots.add(timeString);
          }
        }
      }
    }
    
    return Array.from(allSlots).sort();
  };

  const getAvailableSlotsForDay = (dateString: string, durationMinutes: number): string[] => {
    if (!tutorSchedule || tutorSchedule.length === 0) return [];
    
    const daySchedule = tutorSchedule.find((day: any) => day.date === dateString);
    if (!daySchedule || !daySchedule.timeSlots || daySchedule.timeSlots.length === 0) return [];
    
    const availableSlots: string[] = [];
    const timeSlots = daySchedule.timeSlots;
    
    timeSlots.forEach((slot: any) => {
      if (slot.allDay) {
        for (let hour = 8; hour <= 20; hour++) {
          for (let minute = 0; minute < 60; minute += 30) {
            const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            if (canFitDuration(timeString, durationMinutes, slot)) {
              availableSlots.push(timeString);
            }
          }
        }
      } else {
        const startTime = slot.startTime;
        const endTime = slot.endTime;
        const [startHour, startMinute] = startTime.split(':').map(Number);
        const [endHour, endMinute] = endTime.split(':').map(Number);
        const startTotalMinutes = startHour * 60 + startMinute;
        const endTotalMinutes = endHour * 60 + endMinute;
        
        for (let minutes = startTotalMinutes; minutes < endTotalMinutes; minutes += 30) {
          const hour = Math.floor(minutes / 60);
          const minute = minutes % 60;
          const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          if (canFitDuration(timeString, durationMinutes, slot)) {
            availableSlots.push(timeString);
          }
        }
      }
    });
    
    return [...new Set(availableSlots)].sort();
  };

  const getInitialSlotsCount = () => {
    const allSlots = getAllAvailableTimeSlots();
    return Math.max(5, Math.ceil(allSlots.length / 2));
  };

  const getVisibleTimeSlots = () => {
    const allSlots = getAllAvailableTimeSlots();
    if (showAllSlots) return allSlots;
    return allSlots.slice(0, getInitialSlotsCount());
  };

  const handleShowMore = () => setShowAllSlots(true);
  const handleShowLess = () => setShowAllSlots(false);

  // Gestion de la sélection d'un créneau
  const handleSlotSelection = (dayDate: string, timeSlot: string) => {
    const existingSlotIndex = selectedSlots.findIndex(
      slot => slot.date === dayDate && slot.time === timeSlot
    );
    
    if (existingSlotIndex > -1) {
      setSelectedSlots(prev => prev.filter((_, index) => index !== existingSlotIndex));
    } else {
      if (isSlotAvailableWithSelection(dayDate, timeSlot, defaultDuration)) {
        setSelectedSlots(prev => [...prev, { 
          date: dayDate, 
          time: timeSlot, 
          duration: defaultDuration,
          id: generateId()
        }]);
      }
    }
  };

  // Obtenir les durées disponibles pour un créneau (tenant compte des plages)
  const getAvailableDurationsForSlot = (dayDate: string, timeSlot: string): number[] => {
    const availableDurations: number[] = [];
    const possibleDurations = [30, 60, 90, 120];
    
    possibleDurations.forEach(duration => {
      if (isSlotAvailableWithSelection(dayDate, timeSlot, duration)) {
        availableDurations.push(duration);
      }
    });
    
    return availableDurations;
  };

  // Changer la durée d'un créneau sélectionné
  const handleSlotDurationChange = (slotId: string, newDuration: number) => {
    const slot = selectedSlots.find(s => s.id === slotId);
    if (!slot) return;
    
    // Vérifier si la nouvelle durée est disponible
    if (isSlotAvailableWithSelection(slot.date, slot.time, newDuration)) {
      setSelectedSlots(prev => 
        prev.map(s => 
          s.id === slotId ? { ...s, duration: newDuration } : s
        )
      );
    }
  };

  const calculateEndTime = (startTime: string, durationMinutes: number): string => {
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const totalMinutes = startHour * 60 + startMinute + durationMinutes;
    const endHour = Math.floor(totalMinutes / 60);
    const endMinute = totalMinutes % 60;
    return `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
  };

  const formatAmount = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(value || 0);
  };

  const calculateBalanceAfter = () => balance - amount;

  const handleConfirm = async () => {
    setError(null);
    
    if (selectedSlots.length === 0) {
      setError('Veuillez sélectionner au moins un créneau');
      return;
    }
    
    if (!selectedAnnonce) {
      setError('Aucune annonce sélectionnée');
      return;
    }
    
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      navigate('/connexion');
      return;
    }
    
    if (balance < amount) {
      setError('Crédits insuffisants pour ces réservations');
      return;
    }
    
    setSubmitting(true);
    
    try {
      const hourlyRate = selectedAnnonce.hourlyRate || 30;
      const bookingPromises = selectedSlots.map(slot => {
        const slotAmount = (hourlyRate * slot.duration) / 60;
        
        const bookingData = {
          tutorId: tutorId as string,
          annonceId: selectedAnnonce.id,
          annonceTitle: selectedAnnonce.title,
          date: slot.date,
          time: slot.time,
          amount: parseFloat(slotAmount.toFixed(2)),
          duration: slot.duration,
          description: selectedAnnonce.description || '',
          studentNotes
        };
        
        return bookingService.createBooking(bookingData);
      });
      
      const results = await Promise.all(bookingPromises);
      const allSuccess = results.every(resp => resp?.success);
      
      if (allSuccess) {
        const messageState = {
          message: `${selectedSlots.length} réservation(s) créée(s) avec succès !`,
          bookingStatus: 'PENDING'
        };
        
        if (currentUser?.role === 'tutor') {
          navigate('/reservations', { state: messageState });
        } else {
          navigate('/blockchain', { state: messageState });
        }
      } else {
        setError('Erreur lors de la création de certaines réservations');
      }
    } catch (err: any) {
      console.error('Erreur réservation:', err);
      setError(err?.response?.data?.message || err?.message || 'Erreur lors de la réservation');
    } finally {
      setSubmitting(false);
    }
  };

  const clearAllSelections = () => setSelectedSlots([]);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.loadingContainer}>
            <div className={styles.loadingSpinner}></div>
            <p>Chargement...</p>
          </div>
        </div>
      </div>
    );
  }

  const allTimeSlots = getAllAvailableTimeSlots();

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            Réserver un cours avec{' '}
            {tutor && tutor.user && (
              <span className={styles.tutorName}>
                {tutor.user.firstName} {tutor.user.lastName}
              </span>
            )}
          </h1>
          {tutor && tutor.rating && (
            <div className={styles.tutorRating}>
              <span className={styles.stars}>★★★★★</span>
              <span className={styles.ratingValue}>{tutor.rating}</span>
              <span>({tutor.reviewsCount} avis)</span>
            </div>
          )}
        </div>

        <div className={styles.content}>
          <div className={styles.leftColumn}>
            {selectedAnnonce && (
              <div className={styles.formSection}>
                <h3 className={styles.sectionTitle}>Annonce sélectionnée</h3>
                <div className={styles.annoncePreview}>
                  <div className={styles.annonceHeader}>
                    <h4 className={styles.annonceTitle}>{selectedAnnonce.title}</h4>
                    <div className={styles.annoncePrice}>{selectedAnnonce.hourlyRate}🪙/h</div>
                  </div>
                  <p className={styles.annonceDescription}>
                    {selectedAnnonce.description}
                  </p>
                </div>
              </div>
            )}

            <div className={styles.formSection}>
              <div className={styles.availabilityHeader}>
                <div className={styles.weekNavigation}>
                  <button className={styles.navButton} onClick={goToPreviousWeek}>&lt;</button>
                  <div className={styles.weekPeriod}>{formatWeekPeriod()}</div>
                  <button className={styles.navButton} onClick={goToNextWeek}>&gt;</button>
                </div>
              </div>

              <div className={styles.availabilityTable}>
                <div className={styles.tableHeader}>
                  <div className={styles.timeColumn}></div>
                  {weekDays.map((day) => {
                    const hasSelectedSlots = selectedSlots.some(s => s.date === day.date);
                    const allSlotsInRanges = getAllSlotsInSelectedRanges(day.date);
                    
                    return (
                      <div 
                        key={day.date} 
                        className={`${styles.dayHeader} ${hasSelectedSlots ? styles.selectedDay : ''}`}
                        title={hasSelectedSlots ? `Plages sélectionnées: ${allSlotsInRanges.join(', ')}` : ''}
                      >
                        <div className={styles.dayName}>{day.dayName}</div>
                        <div className={styles.dayDate}>{day.dayNumber} {day.month}</div>
                      </div>
                    );
                  })}
                </div>
                
                <div className={styles.tableBody}>
                  {getVisibleTimeSlots().map((timeSlot) => (
                    <div key={timeSlot} className={styles.timeRow}>
                      <div className={styles.timeLabel}>{timeSlot}</div>
                      {weekDays.map((day) => {
                        const isSelected = isSlotSelected(day.date, timeSlot);
                        const isInSelectedRange = isSlotInSelectedRange(day.date, timeSlot);
                        const isAvailable = isSlotAvailableWithSelection(day.date, timeSlot, defaultDuration);
                        
                        let displaySymbol = '+';
                        let buttonClass = styles.slotButton;
                        let isDisabled = false;
                        
                        if (isSelected) {
                          displaySymbol = '✓';
                          buttonClass += ` ${styles.selected}`;
                        } else if (isInSelectedRange) {
                          displaySymbol = '';
                          buttonClass += ` ${styles.inRange}`;
                          isDisabled = true;
                        } else if (!isAvailable) {
                          displaySymbol = '—';
                          isDisabled = true;
                        }
                        
                        return (
                          <div key={`${day.date}-${timeSlot}`} className={styles.timeCell}>
                            {displaySymbol !== '—' ? (
                              <button
                                type="button"
                                className={buttonClass}
                                onClick={() => !isDisabled && handleSlotSelection(day.date, timeSlot)}
                                disabled={isDisabled}
                                title={
                                  isSelected ? `Sélectionné: ${day.displayName} à ${timeSlot}` :
                                  isInSelectedRange ? `Dans une plage sélectionnée` :
                                  `Sélectionner ${day.displayName} à ${timeSlot}`
                                }
                              >
                                {displaySymbol}
                              </button>
                            ) : (
                              <span className={styles.unavailableSlot}>—</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

                 {!showAllSlots && allTimeSlots.length > getInitialSlotsCount() && (
                  <div className={styles.showMoreContainer}>
                    <button className={styles.showMoreBtn} onClick={handleShowMore}>
                      Voir tous les créneaux ({allTimeSlots.length - getInitialSlotsCount()} autres)
                    </button>
                  </div>
                )}

                {showAllSlots && (
                  <div className={styles.showLessContainer}>
                    <button className={styles.showLessBtn} onClick={handleShowLess}>
                      Voir moins
                    </button>
                  </div>
                )}
              
              {selectedSlots.length > 0 && (
                <div className={styles.selectionDisplay}>
                  <div className={styles.selectionHeader}>
                    <span className={styles.selectionLabel}>Créneaux sélectionnés ({selectedSlots.length}) :</span>
                    <button className={styles.clearAllBtn} onClick={clearAllSelections}>
                      Tout effacer
                    </button>
                  </div>
                  <div className={styles.selectionList}>
                    {selectedSlots.map((slot) => {
                      const day = weekDays.find(d => d.date === slot.date);
                      const availableDurations = getAvailableDurationsForSlot(slot.date, slot.time);
                      const endTime = calculateEndTime(slot.time, slot.duration); // Calcul de l'heure de fin
                      
                      return (
                        <div key={slot.id} className={styles.selectionItem}>
                          <div className={styles.slotInfo}>
                            <div className={styles.slotTimeRange}>
                              <span className={styles.slotDate}>{day?.displayName}</span>
                              <div className={styles.timeRange}>
                                <span className={styles.startTime}>{slot.time}</span>
                                <span className={styles.timeSeparator}>→</span>
                                <span className={styles.endTime}>{endTime}</span>
                                <span className={styles.durationBadge}>{slot.duration}min</span>
                              </div>
                            </div>
                            <div className={styles.durationSelectorSmall}>
                              {availableDurations.map((dur) => {
                                const durEndTime = calculateEndTime(slot.time, dur);
                                return (
                                  <button
                                    key={dur}
                                    type="button"
                                    className={`${styles.durationBtnSmall} ${slot.duration === dur ? styles.active : ''}`}
                                    onClick={() => handleSlotDurationChange(slot.id, dur)}
                                    disabled={slot.duration === dur}
                                    title={`${dur} minutes (${slot.time} → ${durEndTime})`}
                                  >
                                    {dur}min
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          <div className={styles.slotActions}>
                            <span className={styles.slotPrice}>
                              {formatAmount((selectedAnnonce?.hourlyRate || 30) * slot.duration / 60)}🪙
                            </span>
                            <button 
                              className={styles.removeSlotBtn}
                              onClick={() => handleSlotSelection(slot.date, slot.time)}
                              title="Supprimer ce créneau"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className={styles.formSection}>
              <h3 className={styles.sectionTitle}>Durée par défaut pour les nouveaux créneaux</h3>
              <div className={styles.durationSelector}>
                {[30, 60, 90, 120].map((dur) => (
                  <button
                    key={dur}
                    type="button"
                    className={`${styles.durationBtn} ${defaultDuration === dur ? styles.active : ''}`}
                    onClick={() => setDefaultDuration(dur)}
                  >
                    {dur} min
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.formSection}>
              <h3 className={styles.sectionTitle}>Notes pour le tuteur (optionnel)</h3>
              <textarea
                value={studentNotes}
                onChange={(e) => setStudentNotes(e.target.value)}
                placeholder="Précisez vos objectifs, difficultés particulières ou toute autre information utile..."
                rows={3}
                className={styles.textarea}
              />
            </div>
          </div>

          <div className={styles.rightColumn}>
            <div className={styles.summarySection}>
              <h3 className={styles.summaryTitle}>Récapitulatif</h3>
              {selectedAnnonce && (
                <div className={styles.summaryGrid}>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>Matière</span>
                    <span className={styles.summaryValue}>{selectedAnnonce.subject}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>Niveau</span>
                    <span className={styles.summaryValue}>{selectedAnnonce.level}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>Mode</span>
                    <span className={styles.summaryValue}>{selectedAnnonce.teachingMode}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>Nombre de cours</span>
                    <span className={styles.summaryValue}>{selectedSlots.length}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>Durée totale</span>
                    <span className={styles.summaryValue}>
                      {selectedSlots.reduce((total, slot) => total + slot.duration, 0)} minutes
                    </span>
                  </div>
                </div>
              )}
              <div className={styles.total}>
                <span className={styles.totalLabel}>Coût total</span>
                <span className={styles.totalAmount}>{formatAmount(amount)}🪙</span>
              </div>
            </div>

            <div className={styles.balanceCard}>
              <h4 className={styles.balanceTitle}>Votre solde</h4>
              <div className={styles.balanceRow}>
                <span className={styles.balanceLabel}>Solde actuel</span>
                <span className={styles.balanceValue}>{formatAmount(balance)}🪙</span>
              </div>
              <div className={styles.balanceRow}>
                <span className={styles.balanceLabel}>Coût total</span>
                <span className={styles.balanceValue}>- {formatAmount(amount)}🪙</span>
              </div>
              <div className={styles.balanceAfter}>
                <span className={styles.balanceAfterLabel}>Solde après</span>
                <span className={`${styles.balanceAfterValue} ${calculateBalanceAfter() < 0 ? styles.negative : styles.positive}`}>
                  {formatAmount(calculateBalanceAfter())}🪙
                </span>
              </div>
              {calculateBalanceAfter() < 0 && (
                <div className={styles.alert}>
                  <div className={styles.alertIcon}>⚠️</div>
                  <div className={styles.alertText}>
                    <p><strong>Solde insuffisant</strong><br />Veuillez recharger votre portefeuille avant de réserver.</p>
                  </div>
                </div>
              )}
            </div>

            <div className={styles.note}>
              <p>
                <strong>Comment ça marche ?</strong><br />
                Sélectionnez plusieurs créneaux. Chaque créneau grise toute sa plage horaire. 
                Le montant total sera réservé immédiatement.
              </p>
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={() => navigate(-1)} disabled={submitting}>
            Annuler
          </button>
          <button
            className={styles.confirmBtn}
            onClick={handleConfirm}
            disabled={submitting || selectedSlots.length === 0 || !selectedAnnonce || calculateBalanceAfter() < 0}
          >
            {submitting ? (
              <>
                <span className={styles.spinner}></span> Création en cours...
              </>
            ) : (
              `Confirmer ${selectedSlots.length} réservation(s)`
            )}
          </button>
        </div>

        {error && (
          <div className={styles.error}>
            <div>❌</div>
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingPage;