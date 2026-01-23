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
  const [date, setDate] = useState<string>('');
  const [time, setTime] = useState<string>('');
  const [duration, setDuration] = useState<number>(60);
  const [amount, setAmount] = useState<number>(0);
  const [studentNotes, setStudentNotes] = useState<string>('');
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [weekDays, setWeekDays] = useState<any[]>([]);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(new Date());

  const annonceIdFromState = location.state?.annonceId;

  // Fonction pour générer la semaine à partir d'une date
  const generateWeekDays = (startDate: Date) => {
    const days = [];
    
    // Ajuster pour commencer à lundi
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

  // Navigation entre les semaines
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

  // Formater la période de la semaine (ex: "Du 16 au 22 décembre")
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

        // Charger le tuteur
        const tutorResp = await tutorService.getTutorById(tutorId);
        if (tutorResp.success && tutorResp.data) {
          setTutor(tutorResp.data);
          
          // Charger les disponibilités du tuteur
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
        let amountToSet = 0;

        // 1. D'abord essayer de charger l'annonce spécifique
        if (annonceIdFromState) {
          try {
            const annonceResp = await annonceService.getAnnonce(annonceIdFromState);
            if (annonceResp.success && annonceResp.data) {
              selectedAnnonceToSet = annonceResp.data;
              amountToSet = annonceResp.data.hourlyRate;
            }
          } catch (annonceError) {
            console.error('Erreur chargement annonce spécifique:', annonceError);
          }
        }

        // 2. Si aucune annonce spécifique, charger toutes les annonces et prendre la première
        if (!selectedAnnonceToSet) {
          const annoncesResp = await tutorService.getAnnoncesByTutor(tutorId);
          if (annoncesResp.success && annoncesResp.data) {
            const annoncesList = annoncesResp.data.annonces || annoncesResp.data;
            if (annoncesList.length > 0) {
              selectedAnnonceToSet = annoncesList[0];
              amountToSet = annoncesList[0].hourlyRate;
            }
          }
        }

        // 3. Mettre à jour l'état
        if (selectedAnnonceToSet) {
          setSelectedAnnonce(selectedAnnonceToSet);
          setAmount(amountToSet);
        }

        // Charger le solde
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

  // Mettre à jour le montant quand l'annonce ou la durée change
  useEffect(() => {
    if (selectedAnnonce) {
      const hourlyRate = selectedAnnonce.hourlyRate || 30;
      const calculatedAmount = (hourlyRate * duration) / 60;
      setAmount(parseFloat(calculatedAmount.toFixed(2)));
    }
  }, [selectedAnnonce, duration]);

  // Obtenir les créneaux disponibles pour un jour donné avec vérification de la durée
  const getAvailableSlotsForDay = (dateString: string): string[] => {
    if (!tutorSchedule || tutorSchedule.length === 0) {
      return [];
    }
    
    const daySchedule = tutorSchedule.find(
      (day: any) => day.date === dateString
    );
    
    if (!daySchedule || !daySchedule.timeSlots || daySchedule.timeSlots.length === 0) {
      return [];
    }
    
    const availableSlots: string[] = [];
    const timeSlots = daySchedule.timeSlots;
    
    timeSlots.forEach((slot: any) => {
      if (slot.allDay) {
        // Si disponible toute la journée, ajouter toutes les heures où la durée tient
        for (let hour = 8; hour <= 20; hour++) {
          for (let minute = 0; minute < 60; minute += 30) {
            const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            
            // Vérifier si le créneau tient avec la durée choisie
            if (canFitDuration(timeString, duration, slot)) {
              availableSlots.push(timeString);
            }
          }
        }
      } else {
        // Ajouter les heures spécifiques du créneau où la durée tient
        const startTime = slot.startTime;
        const endTime = slot.endTime;
        
        // Convertir en minutes pour la comparaison
        const [startHour, startMinute] = startTime.split(':').map(Number);
        const [endHour, endMinute] = endTime.split(':').map(Number);
        const startTotalMinutes = startHour * 60 + startMinute;
        const endTotalMinutes = endHour * 60 + endMinute;
        
        // Générer les créneaux de 30 minutes dans l'intervalle
        for (let minutes = startTotalMinutes; minutes < endTotalMinutes; minutes += 30) {
          const hour = Math.floor(minutes / 60);
          const minute = minutes % 60;
          const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          
          // Vérifier si le créneau tient avec la durée choisie
          if (canFitDuration(timeString, duration, slot)) {
            availableSlots.push(timeString);
          }
        }
      }
    });
    
    return [...new Set(availableSlots)].sort();
  };

  // Vérifier si un créneau peut contenir la durée choisie
  const canFitDuration = (startTime: string, durationMinutes: number, slot: any): boolean => {
    if (slot.allDay) {
      // Pour allDay, vérifier que le cours termine avant 21h
      const [startHour, startMinute] = startTime.split(':').map(Number);
      const startTotalMinutes = startHour * 60 + startMinute;
      const endTotalMinutes = startTotalMinutes + durationMinutes;
      
      // Vérifier que le cours ne dépasse pas 21h (dernière heure possible)
      return endTotalMinutes <= 21 * 60; // 21h = 21 * 60 minutes
    } else {
      // Pour un créneau spécifique, vérifier que le cours tient dans le créneau
      const [startHour, startMinute] = startTime.split(':').map(Number);
      const startTotalMinutes = startHour * 60 + startMinute;
      
      const slotStartTime = slot.startTime;
      const slotEndTime = slot.endTime;
      const [slotStartHour, slotStartMinute] = slotStartTime.split(':').map(Number);
      const [slotEndHour, slotEndMinute] = slotEndTime.split(':').map(Number);
      const slotStartTotalMinutes = slotStartHour * 60 + slotStartMinute;
      const slotEndTotalMinutes = slotEndHour * 60 + slotEndMinute;
      
      const courseEndTotalMinutes = startTotalMinutes + durationMinutes;
      
      // Le créneau doit commencer après le début du slot et finir avant la fin du slot
      return startTotalMinutes >= slotStartTotalMinutes && 
             courseEndTotalMinutes <= slotEndTotalMinutes;
    }
  };

  // Vérifier si un créneau est disponible pour un jour donné (en tenant compte de la durée)
  const isSlotAvailable = (dayDate: string, timeSlot: string): boolean => {
    const availableSlots = getAvailableSlotsForDay(dayDate);
    return availableSlots.includes(timeSlot);
  };

  // Obtenir tous les créneaux uniques disponibles dans la semaine
  const getAllAvailableTimeSlots = () => {
    const allSlots = new Set<string>();
    
    weekDays.forEach(day => {
      const slots = getAvailableSlotsForDay(day.date);
      slots.forEach(slot => allSlots.add(slot));
    });
    
    // Si aucun créneau n'est disponible, afficher une plage horaire standard
    if (allSlots.size === 0) {
      // Créneaux horaires standards de 8h à 20h
      for (let hour = 8; hour <= 20; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          // Vérifier que le créneau tient avec la durée choisie (jusqu'à 21h max)
          const [startHour, startMinute] = timeString.split(':').map(Number);
          const startTotalMinutes = startHour * 60 + startMinute;
          const endTotalMinutes = startTotalMinutes + duration;
          if (endTotalMinutes <= 21 * 60) {
            allSlots.add(timeString);
          }
        }
      }
    }
    
    return Array.from(allSlots).sort();
  };

  // Gérer la sélection d'un créneau
  const handleSlotSelection = (dayDate: string, timeSlot: string) => {
    if (isSlotAvailable(dayDate, timeSlot)) {
      setDate(dayDate);
      setTime(timeSlot);
    }
  };

  // Vérifier si un créneau est actuellement sélectionné
  const isSlotSelected = (dayDate: string, timeSlot: string): boolean => {
    return date === dayDate && time === timeSlot;
  };

  // Lorsque la durée change, réinitialiser la sélection si le créneau n'est plus valide
  useEffect(() => {
    if (date && time) {
      if (!isSlotAvailable(date, time)) {
        setDate('');
        setTime('');
      }
    }
  }, [duration]);

  const formatAmount = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(value || 0);
  };

  const calculateBalanceAfter = () => {
    return balance - amount;
  };

  const handleConfirm = async () => {
    setError(null);
    
    if (!date || !time) {
      setError('Veuillez sélectionner une date et une heure');
      return;
    }
    
    if (!selectedAnnonce) {
      setError('Aucune annonce sélectionnée');
      return;
    }
    
    // Vérifier que l'heure sélectionnée est disponible
    if (!isSlotAvailable(date, time)) {
      setError('Ce créneau horaire n\'est plus disponible. Veuillez en choisir un autre.');
      return;
    }
    
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      navigate('/connexion');
      return;
    }
    
    if (balance < amount) {
      setError('Crédits insuffisants pour cette réservation');
      return;
    }
    
    setSubmitting(true);
    
    try {
      const bookingData = {
        tutorId: tutorId as string,
        annonceId: selectedAnnonce.id,
        date,
        time,
        amount: amount,
        duration,
        description: selectedAnnonce.description || '',
        studentNotes
      };
      
      const resp = await bookingService.createBooking(bookingData);
      
      if (resp?.success) {
        const messageState = {
          message: 'Réservation créée avec succès ! En attente de confirmation du tuteur.',
          bookingStatus: 'PENDING'
        };
        
        if (currentUser?.role === 'tutor') {
          navigate('/reservations', { state: messageState });
        } else {
          navigate('/blockchain', { state: messageState });
        }
      } else {
        setError(resp?.message || 'Erreur lors de la création de la réservation');
      }
    } catch (err: any) {
      console.error('Erreur réservation:', err);
      if (err?.code === 'ERR_NETWORK' || !err?.response) {
        setError('Service temporairement indisponible. Veuillez réessayer.');
      } else {
        setError(err?.response?.data?.message || err?.message || 'Erreur lors de la réservation');
      }
    } finally {
      setSubmitting(false);
    }
  };

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

  // Récupérer tous les créneaux horaires disponibles
  const allTimeSlots = getAllAvailableTimeSlots();

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {/* Header */}
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
          {/* Colonne gauche - Formulaire */}
          <div className={styles.leftColumn}>
            {/* Annonce sélectionnée */}
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

            {/* Disponibilités du tuteur - Style exact comme l'image */}
            <div className={styles.formSection}>
              <div className={styles.availabilityHeader}>
                <div className={styles.weekNavigation}>
                  <button 
                    className={styles.navButton}
                    onClick={goToPreviousWeek}
                  >
                    &lt;
                  </button>
                  <div className={styles.weekPeriod}>
                    {formatWeekPeriod()}
                  </div>
                  <button 
                    className={styles.navButton}
                    onClick={goToNextWeek}
                  >
                    &gt;
                  </button>
                </div>
              </div>

              {/* Tableau des disponibilités */}
              <div className={styles.availabilityTable}>
                {/* En-tête avec jours de la semaine */}
                <div className={styles.tableHeader}>
                  <div className={styles.timeColumn}></div>
                  {weekDays.map((day) => (
                    <div 
                      key={day.date} 
                      className={`${styles.dayHeader} ${date === day.date ? styles.selectedDay : ''}`}
                    >
                      <div className={styles.dayName}>{day.dayName}</div>
                      <div className={styles.dayDate}>{day.dayNumber} {day.month}</div>
                    </div>
                  ))}
                </div>
                
                {/* Lignes de créneaux horaires */}
                <div className={styles.tableBody}>
                  {allTimeSlots.map((timeSlot) => (
                    <div key={timeSlot} className={styles.timeRow}>
                      <div className={styles.timeLabel}>{timeSlot}</div>
                      {weekDays.map((day) => {
                        const isAvailable = isSlotAvailable(day.date, timeSlot);
                        const isSelected = isSlotSelected(day.date, timeSlot);
                        
                        return (
                          <div 
                            key={`${day.date}-${timeSlot}`} 
                            className={styles.timeCell}
                          >
                            {isAvailable ? (
                              <button
                                type="button"
                                className={`${styles.slotButton} ${isSelected ? styles.selected : ''}`}
                                onClick={() => handleSlotSelection(day.date, timeSlot)}
                                title={`Réserver le ${day.displayName} à ${timeSlot} (${duration}min)`}
                              >
                                {isSelected && '✓'}
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
              
              {/* Affichage de la sélection actuelle */}
              {date && time && (
                <div className={styles.selectionDisplay}>
                  <span className={styles.selectionLabel}>Sélectionné :</span>
                  <span className={styles.selectionValue}>
                    {weekDays.find(d => d.date === date)?.displayName} à {time} ({duration}min)
                  </span>
                </div>
              )}
            </div>

            {/* Durée du cours */}
            <div className={styles.formSection}>
              <h3 className={styles.sectionTitle}>Durée du cours</h3>
              <div className={styles.durationSelector}>
                {[30, 60, 90, 120].map((dur) => (
                  <button
                    key={dur}
                    type="button"
                    className={`${styles.durationBtn} ${
                      duration === dur ? styles.active : ''
                    }`}
                    onClick={() => setDuration(dur)}
                  >
                    {dur} min
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
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

          {/* Colonne droite - Récapitulatif */}
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
                    <span className={styles.summaryLabel}>Date & Heure</span>
                    <span className={styles.summaryValue}>
                      {date && time ? 
                        `${weekDays.find(d => d.date === date)?.displayName} à ${time}` : 
                        'Non sélectionné'
                      }
                    </span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>Durée</span>
                    <span className={styles.summaryValue}>{duration} minutes</span>
                  </div>
                </div>
              )}
              <div className={styles.total}>
                <span className={styles.totalLabel}>Coût total</span>
                <span className={styles.totalAmount}>{formatAmount(amount)}🪙</span>
              </div>
            </div>

            {/* Solde */}
            <div className={styles.balanceCard}>
              <h4 className={styles.balanceTitle}>Votre solde</h4>
              <div className={styles.balanceRow}>
                <span className={styles.balanceLabel}>Solde actuel</span>
                <span className={styles.balanceValue}>{formatAmount(balance)}🪙</span>
              </div>
              <div className={styles.balanceRow}>
                <span className={styles.balanceLabel}>Coût de la réservation</span>
                <span className={styles.balanceValue}>- {formatAmount(amount)}🪙</span>
              </div>
              <div className={styles.balanceAfter}>
                <span className={styles.balanceAfterLabel}>Solde après réservation</span>
                <span className={`${styles.balanceAfterValue} ${
                  calculateBalanceAfter() < 0 ? styles.negative : styles.positive
                }`}>
                  {formatAmount(calculateBalanceAfter())}🪙
                </span>
              </div>
              {calculateBalanceAfter() < 0 && (
                <div className={styles.alert}>
                  <div className={styles.alertIcon}>⚠️</div>
                  <div className={styles.alertText}>
                    <p>
                      <strong>Solde insuffisant</strong><br />
                      Veuillez recharger votre portefeuille avant de réserver.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Note */}
            <div className={styles.note}>
              <p>
                <strong>Comment ça marche ?</strong><br />
                Le montant est réservé immédiatement. Le tuteur a 24h pour confirmer la réservation. 
                En cas de refus ou d'absence de réponse, les crédits vous seront automatiquement rendus.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <button
            className={styles.cancelBtn}
            onClick={() => navigate(-1)}
            disabled={submitting}
          >
            Annuler
          </button>
          <button
            className={styles.confirmBtn}
            onClick={handleConfirm}
            disabled={
              submitting || 
              !date || 
              !time || 
              !selectedAnnonce || 
              calculateBalanceAfter() < 0
            }
          >
            {submitting ? (
              <>
                <span className={styles.spinner}></span>
                Création en cours...
              </>
            ) : (
              'Confirmer la réservation'
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