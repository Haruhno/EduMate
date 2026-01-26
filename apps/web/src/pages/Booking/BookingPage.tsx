import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
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
  const [annonces, setAnnonces] = useState<AnnonceFromDB[]>([]);
  const [selectedAnnonce, setSelectedAnnonce] = useState<AnnonceFromDB | null>(null);
  
  const [date, setDate] = useState<string>('');
  const [time, setTime] = useState<string>('10:00');
  const [duration, setDuration] = useState<number>(60);
  const [amount, setAmount] = useState<number>(0);
  const [studentNotes, setStudentNotes] = useState<string>('');
  
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Vérifier si on vient d'une annonce spécifique
  const annonceIdFromState = location.state?.annonceId;
  const showAnnonceSelector = !annonceIdFromState;

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
        } else {
          setError('Tuteur non trouvé');
          return;
        }

        // Charger les annonces du tuteur
        const annoncesResp = await tutorService.getAnnoncesByTutor(tutorId);
        if (annoncesResp.success && annoncesResp.data) {
          const annoncesList = annoncesResp.data.annonces || annoncesResp.data;
          setAnnonces(annoncesList);
          
          // Si on vient d'une annonce spécifique, la sélectionner
          if (annonceIdFromState) {
            const annonce = annoncesList.find((a: AnnonceFromDB) => a.id === annonceIdFromState);
            if (annonce) {
              setSelectedAnnonce(annonce);
              setAmount(annonce.hourlyRate);
            }
          } else if (annoncesList.length > 0) {
            // Sinon, sélectionner la première annonce par défaut
            setSelectedAnnonce(annoncesList[0]);
            setAmount(annoncesList[0].hourlyRate);
          }
        }

        // Charger le solde de l'utilisateur
        const currentUser = authService.getCurrentUser();
        if (currentUser?.id) {
          try {
            const balanceData = await blockchainService.getBalance();
            const available = Number(balanceData.wallet.available ?? 0);
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

  const formatAmount = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
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
      setError('Veuillez sélectionner une annonce');
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

      const resp = await blockchainService.createBooking(bookingData);
      if (resp?.success) {
        // Redirection basée sur le rôle : étudiants -> /blockchain, tuteurs -> /reservations
        const currentUser = authService.getCurrentUser();
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

  const getTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour <= 20; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(timeString);
      }
    }
    return slots;
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

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {/* Header avec infos tuteur */}
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
              <span className={styles.reviewsCount}>({tutor.reviewsCount} avis)</span>
            </div>
          )}
        </div>

        <div className={styles.contentGrid}>
          {/* Colonne gauche : Formulaire */}
          <div className={styles.formColumn}>
            {/* Sélecteur d'annonce (seulement si pas d'annonce spécifique) */}
            {showAnnonceSelector && annonces.length > 0 && (
              <div className={styles.formSection}>
                <div className={styles.sectionHeader}>
                  <div className={styles.sectionIcon}>📋</div>
                  <h3>Choisir une annonce</h3>
                </div>
                <div className={styles.annonceSelector}>
                  {annonces.map((annonce) => (
                    <div 
                      key={annonce.id}
                      className={`${styles.annonceOption} ${
                        selectedAnnonce?.id === annonce.id ? styles.selected : ''
                      }`}
                      onClick={() => {
                        setSelectedAnnonce(annonce);
                        setAmount(annonce.hourlyRate);
                      }}
                    >
                      <div className={styles.annonceOptionHeader}>
                        <div className={styles.annonceTitle}>{annonce.title}</div>
                        <div className={styles.annoncePrice}>€{annonce.hourlyRate}/h</div>
                      </div>
                      <div className={styles.annonceSubjects}>
                        {annonce.subject && (
                          <span className={styles.subjectTag}>{annonce.subject}</span>
                        )}
                        <span className={styles.levelTag}>{annonce.level}</span>
                      </div>
                      <p className={styles.annonceDescription}>
                        {annonce.description?.substring(0, 100)}...
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Date et heure */}
            <div className={styles.formSection}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>📅</div>
                <h3>Date et heure</h3>
              </div>
              
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Date du cours *</label>
                  <input 
                    type="date" 
                    value={date} 
                    onChange={(e) => setDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className={styles.input}
                    required
                  />
                </div>
                
                <div className={styles.formGroup}>
                  <label className={styles.label}>Heure *</label>
                  <select 
                    value={time} 
                    onChange={(e) => setTime(e.target.value)}
                    className={styles.select}
                    required
                  >
                    {getTimeSlots().map((slot) => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Durée du cours</label>
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
            </div>

            {/* Notes pour le tuteur */}
            <div className={styles.formSection}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>💬</div>
                <h3>Notes pour le tuteur (optionnel)</h3>
              </div>
              <textarea 
                value={studentNotes}
                onChange={(e) => setStudentNotes(e.target.value)}
                placeholder="Précisez vos objectifs, difficultés particulières ou toute autre information utile..."
                rows={4}
                className={styles.textarea}
              />
            </div>
          </div>

          {/* Colonne droite : Récapitulatif et solde */}
          <div className={styles.summaryColumn}>
            {/* Récapitulatif de l'annonce */}
            {selectedAnnonce && (
              <div className={styles.summarySection}>
                <div className={styles.sectionHeader}>
                  <div className={styles.sectionIcon}>📚</div>
                  <h3>Détails du cours</h3>
                </div>
                
                <div className={styles.annonceSummary}>
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>Annonce:</span>
                    <span className={styles.summaryValue}>{selectedAnnonce.title}</span>
                  </div>
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>Matière:</span>
                    <span className={styles.summaryValue}>{selectedAnnonce.subject}</span>
                  </div>
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>Niveau:</span>
                    <span className={styles.summaryValue}>{selectedAnnonce.level}</span>
                  </div>
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>Mode:</span>
                    <span className={styles.summaryValue}>{selectedAnnonce.teachingMode}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Résumé financier */}
            <div className={styles.summarySection}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>💰</div>
                <h3>Résumé financier</h3>
              </div>
              
              <div className={styles.financialSummary}>
                <div className={styles.amountRow}>
                  <span>Tarif horaire:</span>
                  <span>€{selectedAnnonce?.hourlyRate}/h</span>
                </div>
                <div className={styles.amountRow}>
                  <span>Durée:</span>
                  <span>{duration} minutes</span>
                </div>
                <div className={styles.amountRow}>
                  <span>Montant total:</span>
                  <span className={styles.totalAmount}>€{formatAmount(amount)}</span>
                </div>
              </div>
            </div>

            {/* Information solde */}
            <div className={styles.balanceSection}>
              <div className={styles.balanceCard}>
                <div className={styles.balanceHeader}>
                  <div className={styles.balanceIcon}>🪙</div>
                  <h4>Votre solde</h4>
                </div>
                
                <div className={styles.balanceDetails}>
                  <div className={styles.balanceRow}>
                    <span>Solde actuel:</span>
                    <span className={styles.currentBalance}>
                      {formatAmount(balance)} EduCoins
                    </span>
                  </div>
                  
                  <div className={styles.balanceRow}>
                    <span>Coût de la réservation:</span>
                    <span className={styles.bookingCost}>
                      - {formatAmount(amount)} EduCoins
                    </span>
                  </div>
                  
                  <div className={styles.balanceDivider}></div>
                  
                  <div className={styles.balanceRow}>
                    <span>Solde après réservation:</span>
                    <span className={calculateBalanceAfter() < 0 ? styles.insufficient : styles.finalBalance}>
                      {formatAmount(calculateBalanceAfter())} EduCoins
                    </span>
                  </div>
                </div>
                
                {calculateBalanceAfter() < 0 && (
                  <div className={styles.insufficientAlert}>
                    <div className={styles.alertIcon}>⚠️</div>
                    <div className={styles.alertText}>
                      <strong>Solde insuffisant</strong>
                      <p>Veuillez recharger votre portefeuille avant de réserver.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Note importante */}
            <div className={styles.noteSection}>
              <div className={styles.noteCard}>
                <div className={styles.noteIcon}>💡</div>
                <div className={styles.noteContent}>
                  <p>
                    <strong>Comment ça marche ?</strong><br />
                    Le montant est réservé immédiatement. Le tuteur a 24h pour confirmer la réservation. 
                    En cas de refus ou d'absence de réponse, les crédits vous seront automatiquement rendus.
                  </p>
                </div>
              </div>
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
          <div className={styles.errorAlert}>
            <div className={styles.errorIcon}>❌</div>
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingPage;