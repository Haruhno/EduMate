import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './CreateSkillExchange.module.css';
import Toast from '../../components/Toast/Toast';
import { useToast } from '../../hooks/useToast';
import blockchainService from '../../services/blockchainService';
import authService from '../../services/authService';
import tutorService from '../../services/tutorService';
import type { AnnonceFromDB } from '../../services/annonceService';

interface LocationState {
  tutorId: string;
  tutorProfileId: string; // Ajouter tutorProfileId
  tutorName: string;
  skillsOffered?: Array<{
    name: string;
    level: string;
  }>;
  skillsRequested?: Array<{
    name: string;
  }>;
  tutorSkillsToLearn?: Array<{
    name: string;
  }>;
  courseDescription?: string;
  selectedOffering?: AnnonceFromDB | null;
  // Legacy support
  skillOffered?: {
    name: string;
    level: string;
  };
  skillRequested?: {
    name: string;
  };
  description?: string;
}

interface SelectedSlot {
  date: string;
  time: string;
  duration: number;
  id: string;
}

const CreateSkillExchange: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;
  
  // Supporter les deux formats (ancien et nouveau)
  const skillsOffered = state?.skillsOffered || (state?.skillOffered ? [state.skillOffered] : []);
  const selectedOffering = state?.selectedOffering || null;
  
  // Les skills à apprendre viennent des spécialités du tuteur du cours sélectionné
  // Essayer plusieurs sources pour récupérer les specialties
  const skillsRequested = 
    (selectedOffering?.tutor?.specialties && selectedOffering.tutor.specialties.length > 0 && 
     selectedOffering.tutor.specialties.map((specialty: string) => ({ name: specialty }))) ||
    (selectedOffering?.subjects && Array.isArray(selectedOffering.subjects) && selectedOffering.subjects.length > 0 &&
     selectedOffering.subjects.map((subject: string) => ({ name: subject }))) ||
    state?.skillsRequested || 
    (state?.skillRequested ? [state.skillRequested] : []) ||
    (state?.tutorSkillsToLearn && Array.isArray(state.tutorSkillsToLearn) && state.tutorSkillsToLearn.length > 0 ? state.tutorSkillsToLearn : []) ||
    [];
  const tutorSkillsToLearn = state?.tutorSkillsToLearn || [];
  const courseDescription = state?.courseDescription || state?.description || '';

  
  
  const [selectedSlots, setSelectedSlots] = useState<SelectedSlot[]>([]);
  const [defaultDuration, setDefaultDuration] = useState(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tutorSchedule, setTutorSchedule] = useState<any[]>([]);
  const [weekDays, setWeekDays] = useState<any[]>([]);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(new Date());
  const [showAllSlots, setShowAllSlots] = useState(false);
  const [studentNotes, setStudentNotes] = useState('');
  const { toasts, success, error: showError, removeToast } = useToast();

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const minutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  // Fonction pour traduire les niveaux en français
  const translateLevel = (levelEn: string): string => {
    const levelMap: { [key: string]: string } = {
      'beginner': 'Débutant',
      'intermediate': 'Intermédiaire',
      'advanced': 'Avancé',
      'expert': 'Expert'
    };
    return levelMap[levelEn.toLowerCase()] || levelEn;
  };

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
    setShowAllSlots(false);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentWeekStart(newDate);
    setShowAllSlots(false);
  };

  const formatWeekPeriod = () => {
    const monday = weekDays[0];
    const sunday = weekDays[6];
    if (!monday || !sunday) return '';
    return `Du ${monday.dayNumber} au ${sunday.dayNumber} ${sunday.month}`;
  };

  useEffect(() => {
    loadTutorSchedule();
  }, [state?.tutorProfileId]);

  useEffect(() => {
    if (!state || !state.tutorId || (skillsOffered.length === 0)) {
      navigate('/skill-exchange');
    }
  }, [state, navigate, skillsOffered]);

  const loadTutorSchedule = async () => {
    try {
      // Utiliser tutorProfileId au lieu de tutorId
      const profileId = state?.tutorProfileId || state?.tutorId;
      
      if (!profileId) {
        return;
      }
      
      // Charger le profile du tuteur avec le bon ID
      const profileResp = await tutorService.getTutorProfile(profileId);
      
      if (profileResp.success && profileResp.data?.schedule) {
        setTutorSchedule(profileResp.data.schedule || []);
      }
    } catch (err) {
    }
  };

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

  // Vérifier si un créneau est dans le passé
  const isSlotInPast = (dayDate: string, timeSlot: string): boolean => {
    const now = new Date();
    const [hours, minutes] = timeSlot.split(':').map(Number);
    const slotDateTime = new Date(dayDate);
    slotDateTime.setHours(hours, minutes, 0, 0);
    
    return slotDateTime <= now;
  };

  // Vérifier si un créneau est disponible (tenant compte des plages sélectionnées)
  const isSlotAvailableWithSelection = (dayDate: string, timeSlot: string, durationMinutes: number): boolean => {
    // Vérifier d'abord si le créneau n'est pas dans le passé
    if (isSlotInPast(dayDate, timeSlot)) {
      return false;
    }
    
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

  const isSlotSelected = (date: string, time: string): boolean => {
    return selectedSlots.some(slot => slot.date === date && slot.time === time);
  };

  const isSlotInSelectedRange = (date: string, time: string): boolean => {
    for (const slot of selectedSlots) {
      if (slot.date === date) {
        const slotMinutes = timeToMinutes(time);
        const selectedMinutes = timeToMinutes(slot.time);
        const endMinutes = selectedMinutes + slot.duration;
        
        if (slotMinutes > selectedMinutes && slotMinutes < endMinutes) {
          return true;
        }
      }
    }
    return false;
  };

  const handleSlotSelection = (date: string, time: string) => {
    const isAlreadySelected = isSlotSelected(date, time);
    
    if (isAlreadySelected) {
      setSelectedSlots(prev => prev.filter(slot => !(slot.date === date && slot.time === time)));
    } else {
      if (isSlotAvailableWithSelection(date, time, defaultDuration)) {
        const newSlot: SelectedSlot = {
          date,
          time,
          duration: defaultDuration,
          id: generateId()
        };
        setSelectedSlots(prev => [...prev, newSlot]);
      }
    }
  };

  const getAvailableSlotsForDay = (dateString: string, durationMinutes: number): string[] => {
    if (!tutorSchedule || tutorSchedule.length === 0) {
      return [];
    }
    
    const daySchedule = tutorSchedule.find((day: any) => day.date === dateString);
    if (!daySchedule) {
      return [];
    }
    if (!daySchedule.timeSlots || daySchedule.timeSlots.length === 0) {
      return [];
    }
    
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

  const getInitialSlotsCount = () => {
    const allSlots = getAllAvailableTimeSlots();
    return Math.max(5, Math.ceil(allSlots.length / 2));
  };

  const getVisibleTimeSlots = () => {
    const allSlots = getAllAvailableTimeSlots();
    if (showAllSlots) return allSlots;
    return allSlots.slice(0, getInitialSlotsCount());
  };

  const handleShowMore = () => {
    setShowAllSlots(true);
  };

  const handleShowLess = () => {
    setShowAllSlots(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedSlots.length === 0) {
      setError('Veuillez sélectionner au moins un créneau horaire');
      return;
    }

    if (!skillsRequested || skillsRequested.length === 0) {
      setError('Aucune compétence à apprendre. Veuillez recommencer votre sélection.');
      return;
    }

    if (!skillsOffered || skillsOffered.length === 0) {
      setError('Aucune compétence à enseigner. Veuillez recommencer votre sélection.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const currentUser = authService.getCurrentUser();

      if (!currentUser) {
        navigate('/connexion');
        return;
      }

      // Créer les réservations pour chaque créneau sélectionné
      const bookingsData = selectedSlots.map(slot => ({
        date: slot.date,
        time: slot.time,
        duration: slot.duration
      }));

      // Utiliser tutorProfileId s'il existe, sinon tutorId
      const tutorId = state?.tutorProfileId || state?.tutorId;
      if (!tutorId) {
        setError('Identifiant tuteur manquant. Veuillez recommencer.');
        setLoading(false);
        return;
      }

      // Normaliser les compétences à enseigner (garder le niveau)
      const normalizeSkillsOffered = (skills: any[]): Array<{name: string; level: string}> => {
        return skills.filter(s => s && s.name).map(skill => ({
          name: skill.name || '',
          level: skill.level || 'intermediate'
        }));
      };

      // Normaliser les compétences à apprendre (sans niveau)
      const normalizeSkillsRequested = (skills: any[]): Array<{name: string}> => {
        return skills.filter(s => s).map(skill => {
          if (typeof skill === 'string') {
            return { name: skill };
          }
          return { name: skill.name || skill };
        });
      };

      const exchangeData = {
        tutorId: tutorId,
        annonceId: selectedOffering?.id || 'skill-exchange',
        bookings: bookingsData,
        skillsOffered: normalizeSkillsOffered(skillsOffered),
        skillsRequested: normalizeSkillsRequested(skillsRequested),
        description: `Échange de compétences : ${skillsOffered.map(s => `${s.name} (niveau ${s.level})`).join(', ')}`,
        studentNotes: studentNotes || courseDescription,
      };

      // Appeler le service blockchain pour créer les échanges de compétences
      const response = await blockchainService.createBatchSkillExchangeBookings(exchangeData);

      if (response.success) {
        if (response.data?.failureCount > 0) {
          success(`${response.data.successCount} échange(s) créé(s), ${response.data.failureCount} échoué(s).`);
        } else {
          success(`Demande d'échange créée avec succès pour ${selectedSlots.length} créneau(x)!`);
        }
        setTimeout(() => navigate('/skill-exchange'), 1500);
      } else {
        setError(response.message || 'Erreur lors de la création de l\'échange');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la création de l\'échange');
    } finally {
      setLoading(false);
    }
  };

  const removeSlot = (slotId: string) => {
    setSelectedSlots(prev => prev.filter(slot => slot.id !== slotId));
  };

  const clearAllSelections = () => {
    setSelectedSlots([]);
  };

  if (!state) {
    return null;
  }

  const allTimeSlots = getAllAvailableTimeSlots();

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            Planifier l'échange de compétence avec{' '}
            <span className={styles.tutorName}>{state.tutorName}</span>
          </h1>
        </div>

        <div className={styles.content}>
          <div className={styles.leftColumn}>
            <div className={styles.formSection}>
              <h3 className={styles.sectionTitle}>Vos compétences à enseigner</h3>
              <div className={styles.skillsPreview}>
                {skillsOffered.map((skill, index) => (
                  <div key={index} className={styles.skillItem}>
                    <span className={styles.skillName}>{skill.name}</span>
                    <span className={styles.skillLevel}>
                      Niveau: {translateLevel(skill.level)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.formSection}>
              <h3 className={styles.sectionTitle}>Compétences que vous voulez apprendre</h3>
              <div className={styles.skillsPreview}>
                {skillsRequested && skillsRequested.length > 0 ? (
                  skillsRequested.map((skill, index) => (
                    <div key={index} className={styles.skillItem}>
                      <span className={styles.skillName}>{skill.name}</span>
                    </div>
                  ))
                ) : (
                  <p className={styles.noSkills}>Aucune compétence à apprendre</p>
                )}
              </div>
            </div>

            <div className={styles.formSection}>
              <h3 className={styles.sectionTitle}>Disponibilités</h3>
              
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
                    
                    return (
                      <div 
                        key={day.date} 
                        className={`${styles.dayHeader} ${hasSelectedSlots ? styles.selectedDay : ''}`}
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
                        const isInRange = isSlotInSelectedRange(day.date, timeSlot);
                        const isAvailable = isSlotAvailableWithSelection(day.date, timeSlot, defaultDuration);
                        
                        let displaySymbol = '+';
                        let buttonClass = styles.slotButton;
                        let isDisabled = false;
                        
                        if (isSelected) {
                          displaySymbol = '✓';
                          buttonClass += ` ${styles.selected}`;
                        } else if (isInRange) {
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
            </div>
          </div>

          <div className={styles.rightColumn}>
            <div className={styles.summarySection}>
              <h3 className={styles.sectionTitle}>Paramètres de l'échange</h3>

              <div className={styles.durationSelector}>
                <label>Durée des créneaux</label>
                <div className={styles.durationButtons}>
                  {[30, 60, 90, 120].map((dur) => (
                    <button
                      key={dur}
                      type="button"
                      className={`${styles.durationBtn} ${defaultDuration === dur ? styles.active : ''}`}
                      onClick={() => setDefaultDuration(dur)}
                    >
                      {dur < 60 ? `${dur}min` : `${Math.floor(dur / 60)}h${dur % 60 > 0 ? dur % 60 : ''}`}
                    </button>
                  ))}
                </div>
              </div>

              {selectedOffering && (
                <div className={styles.offeringInfo}>
                  <label>Cours sélectionné</label>
                  <p className={styles.offeringName}>{selectedOffering.title}</p>
                  <p className={styles.offeringDetails}>{selectedOffering.subject} - {selectedOffering.level}</p>
                </div>
              )}

              <div className={styles.notesSection}>
                <label htmlFor="notes">Description de votre cours (détaillé)</label>
                <textarea
                  id="notes"
                  value={studentNotes || courseDescription}
                  onChange={(e) => setStudentNotes(e.target.value)}
                  placeholder="Indiquez tous les concepts, technologies et contenu que vous enseignerez..."
                  rows={4}
                  className={styles.textarea}
                />
              </div>

              <div className={styles.priceInfo}>
                <span className={styles.priceLabel}>Coût total :</span>
                <span className={styles.priceValue}>0 EDU Coins</span>
                <span className={styles.freeTag}>Gratuit ✨</span>
              </div>
            </div>

            <div className={styles.selectedSlotsSection}>
              <div className={styles.selectedHeader}>
                <h3 className={styles.sectionTitle}>
                  Créneaux sélectionnés ({selectedSlots.length})
                </h3>
                {selectedSlots.length > 0 && (
                  <button 
                    type="button"
                    className={styles.clearAllBtn}
                    onClick={clearAllSelections}
                  >
                    Tout effacer
                  </button>
                )}
              </div>

              {selectedSlots.length === 0 ? (
                <p className={styles.noSelection}>Aucun créneau sélectionné</p>
              ) : (
                <div className={styles.slotsList}>
                  {selectedSlots.map((slot) => (
                    <div key={slot.id} className={styles.slotItem}>
                      <div className={styles.slotInfo}>
                        <span className={styles.slotDate}>
                          {weekDays.find(d => d.date === slot.date)?.displayName}
                        </span>
                        <span className={styles.slotTime}>
                          {slot.time} - {minutesToTime(timeToMinutes(slot.time) + slot.duration)}
                        </span>
                        <span className={styles.slotDuration}>
                          ({slot.duration} min)
                        </span>
                      </div>
                      <button
                        type="button"
                        className={styles.removeSlotBtn}
                        onClick={() => removeSlot(slot.id)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && <div className={styles.errorMessage}>{error}</div>}

            <div className={styles.actions}>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className={styles.cancelButton}
              >
                Retour
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || selectedSlots.length === 0}
                className={styles.submitButton}
              >
                {loading ? 'Création...' : 'Créer l\'échange'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Toast notifications */}
      <div className={styles.toastContainer}>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default CreateSkillExchange;
