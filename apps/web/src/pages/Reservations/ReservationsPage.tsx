import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import blockchainService from '../../services/blockchainService';
import authService from '../../services/authService';
import messageService from '../../services/messageService';
import styles from './ReservationsPage.module.css';

export interface Booking {
  id: string;
  tutorId: string;
  studentId: string;
  annonceId: string;
  annonceTitle?: string;
  annonce?: {
    title: string;
    subject: string;
    description: string;
    teachingMode?: string;
    level?: string;
  };
  student?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  tutor?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  myRole?: 'student' | 'tutor';  // 🎯 Rôle de l'utilisateur courant dans CE booking
  date: string;
  time: string;
  duration: number;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  amount: number;
  transactionHash?: string;
  blockchainStatus: 'PENDING' | 'CONFIRMED' | 'FAILED' | 'CANCELLED';
  description?: string;
  studentNotes?: string;
  tutorNotes?: string;
  cancelledBy?: string;
  cancellationReason?: string;
  createdAt: string;
  startTime?: number;
  studentConfirmed?: boolean;
  tutorConfirmed?: boolean;
  blockchainId?: number;
}

interface WalletStats {
  available: number;
  locked: number;
  total: number;
  walletAddress: string;
  kycStatus: string;
}

// Modal pour confirmer sans message
const ConfirmWithoutMessageModal: React.FC<{
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ onConfirm, onCancel }) => {
  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Confirmer la réservation</h3>
          <button className={styles.modalClose} onClick={onCancel}>×</button>
        </div>
        <div className={styles.modalBody}>
          <p>Souhaitez-vous confirmer cette réservation sans ajouter de message pour l'étudiant ?</p>
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.modalButtonSecondary} onClick={onCancel}>
            Retour
          </button>
          <button className={styles.modalButtonPrimary} onClick={onConfirm}>
            Confirmer sans message
          </button>
        </div>
      </div>
    </div>
  );
};

// Modal pour annuler avec raison
const CancelModal: React.FC<{
  onConfirm: (reason?: string) => void;
  onCancel: () => void;
}> = ({ onConfirm, onCancel }) => {
  const [reason, setReason] = useState('');

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Annuler la réservation</h3>
          <button className={styles.modalClose} onClick={onCancel}>×</button>
        </div>
        <div className={styles.modalBody}>
          <p>Veuillez indiquer la raison de l'annulation (optionnel) :</p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Raison de l'annulation..."
            rows={3}
            className={styles.modalTextarea}
          />
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.modalButtonSecondary} onClick={onCancel}>
            Retour
          </button>
          <button className={styles.modalButtonDanger} onClick={() => onConfirm(reason || undefined)}>
            Confirmer l'annulation
          </button>
        </div>
      </div>
    </div>
  );
};

// Modal pour compléter la session
const CompleteSessionModal: React.FC<{
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ onConfirm, onCancel }) => {
  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Marquer comme terminée</h3>
          <button className={styles.modalClose} onClick={onCancel}>×</button>
        </div>
        <div className={styles.modalBody}>
          <p>Souhaitez-vous marquer cette session comme terminée ?</p>
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.modalButtonSecondary} onClick={onCancel}>
            Non
          </button>
          <button className={styles.modalButtonPrimary} onClick={onConfirm}>
            Oui, terminer la session
          </button>
        </div>
      </div>
    </div>
  );
};

// Modal pour confirmer l'issue du cours
const CourseOutcomeModal: React.FC<{
  onConfirm: (courseHeld: boolean) => void;
  onCancel: () => void;
}> = ({ onConfirm, onCancel }) => {
  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Le cours a-t-il eu lieu ?</h3>
          <button className={styles.modalClose} onClick={onCancel}>×</button>
        </div>
        <div className={styles.modalBody}>
          <p>Veuillez confirmer si le cours s'est déroulé comme prévu.</p>
          <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '10px' }}>
            Cette confirmation affectera le transfert des crédits. Les deux parties doivent être d'accord pour finaliser.
          </p>
        </div>
        <div className={styles.modalFooter}>
          <button 
            className={styles.modalButtonSecondary} 
            onClick={() => onConfirm(false)}
          >
            Non, le cours n'a pas eu lieu
          </button>
          <button 
            className={styles.modalButtonPrimary} 
            onClick={() => onConfirm(true)}
          >
            Oui, le cours a eu lieu
          </button>
        </div>
      </div>
    </div>
  );
};

const ReservationsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [allReservations, setAllReservations] = useState<Booking[]>([]); // Toutes les réservations
  const [reservations, setReservations] = useState<Booking[]>([]); // Réservations filtrées
  const [stats, setStats] = useState<any>(null);
  const [walletStats, setWalletStats] = useState<WalletStats | null>(null);
  const [filter, setFilter] = useState<string>('pending');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [tutorNotes, setTutorNotes] = useState<string>('');
  const [showWalletCard, setShowWalletCard] = useState<boolean>(false);
  
  // États pour les modales
  const [showConfirmWithoutMessage, setShowConfirmWithoutMessage] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showCourseOutcomeModal, setShowCourseOutcomeModal] = useState(false);
  const [showCourseDetailsModal, setShowCourseDetailsModal] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [selectedBookingDetails, setSelectedBookingDetails] = useState<Booking | null>(null);

  const currentUser = authService.getCurrentUser();
  const currentUserId = currentUser?.id;

  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const formatAmount = (value: number | string) => {
    const v = Number(value ?? 0);
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Number.isNaN(v) ? 0 : v);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString: string, timeString: string) => {
    const date = new Date(`${dateString}T${timeString}`);
    return date.toLocaleString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (duration?: number) => {
    const minutes = Number(duration ?? 0);
    if (!minutes || Number.isNaN(minutes)) return 'Durée non disponible';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;
    return remaining > 0 ? `${hours} h ${remaining} min` : `${hours} h`;
  };

  const getCourseTitle = (reservation: Booking) => {
    return (
      reservation.annonceTitle ||
      reservation.annonce?.title ||
      reservation.annonce?.subject ||
      'Cours'
    );
  };

  const getCourseDescription = (reservation: Booking) => {
    return (
      reservation.description ||
      reservation.annonce?.description ||
      'Aucune description disponible.'
    );
  };

  // Formater un timestamp Unix en date/heure lisible
  const formatUnixTimestamp = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const loadReservations = async (userId?: string) => {
    try {
      setLoading(true);
      setError(null);

      if (!userId) {
        navigate('/connexion');
        return;
      }

      console.log(`Chargement TOUTES les réservations pour userId: ${userId}`);
      
      // 🎯 Appeler le nouvel endpoint qui retourne asStudent ET asTutor
      const resp = await blockchainService.getAllBookings(userId, {});
      
      if (!resp?.success) {
        throw new Error('Échec de récupération des réservations');
      }

      // Combiner les deux types de réservations
      const asStudent = Array.isArray(resp.data?.asStudent) ? resp.data.asStudent : [];
      const asTutor = Array.isArray(resp.data?.asTutor) ? resp.data.asTutor : [];
      const allBookings = [...asStudent, ...asTutor];

      console.log(`✅ ${asStudent.length} réservations faites (student) + ${asTutor.length} reçues (tutor) = ${allBookings.length} total`);
      
      if (allBookings.length > 0) {
        console.log('Exemple réservation:', allBookings[0]);
      }
      
      // Stocker toutes les réservations
      setAllReservations(allBookings);
      
      // Calculer les stats à partir de toutes les réservations
      const calculatedStats = {
        total: allBookings.length,
        pending: allBookings.filter((r: Booking) => r.status === 'PENDING').length,
        confirmed: allBookings.filter((r: Booking) => r.status === 'CONFIRMED').length,
        completed: allBookings.filter((r: Booking) => r.status === 'COMPLETED').length,
        cancelled: allBookings.filter((r: Booking) => r.status === 'CANCELLED').length,
        totalAmount: allBookings.reduce((sum: number, r: Booking) => sum + (r.amount || 0), 0),
        pendingAmount: allBookings.filter((r: Booking) => r.status === 'PENDING').reduce((sum: number, r: Booking) => sum + (r.amount || 0), 0)
      };
      setStats(calculatedStats);
    } catch (err: any) {
      console.error('Erreur chargement réservations:', err);
      setError(err.message || 'Erreur lors du chargement des réservations');
    } finally {
      setLoading(false);
    }
  };

  const loadWalletStats = async (userId?: string) => {
    try {
      if (!userId) return;
      const balanceData = await blockchainService.getBalance();
      setWalletStats(balanceData.wallet);
    } catch (err) {
      console.error('Erreur chargement wallet:', err);
    }
  };

  // Charger les données une seule fois au montage
  useEffect(() => {
    loadReservations(currentUserId);
    loadWalletStats(currentUserId);
  }, [currentUserId]);

  // Filtrer côté client (instantané)
  useEffect(() => {
    if (filter === 'all') {
      setReservations(allReservations);
    } else {
      const filtered = allReservations.filter(
        (r) => r.status.toLowerCase() === filter.toLowerCase()
      );
      setReservations(filtered);
    }
  }, [filter, allReservations]);

  const handleConfirm = async (reservationId: string) => {
    if (!tutorNotes.trim()) {
      setSelectedBookingId(reservationId);
      setShowConfirmWithoutMessage(true);
      return;
    }

    setConfirmingId(reservationId);
    try {
      const resp = await blockchainService.confirmBooking(reservationId, tutorNotes);
      if (resp?.success) {
        setSuccessMessage('Réservation confirmée ! Les crédits sont sécurisés et seront libérés après le cours.');
        setTutorNotes('');
        await Promise.all([loadReservations(currentUserId), loadWalletStats(currentUserId)]);
      } else {
        setError(resp?.message || 'Erreur lors de la confirmation');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Erreur lors de la confirmation');
    } finally {
      setConfirmingId(null);
    }
  };

  const confirmWithoutMessage = async () => {
    if (!selectedBookingId) return;
    
    // Fermer le modal immédiatement
    setShowConfirmWithoutMessage(false);
    const bookingId = selectedBookingId;
    setSelectedBookingId(null);
    
    setConfirmingId(bookingId);
    try {
      const resp = await blockchainService.confirmBooking(bookingId, '');
      if (resp?.success) {
        setSuccessMessage('Réservation confirmée ! Les crédits sont sécurisés et seront libérés après le cours.');
        setTutorNotes('');
        await Promise.all([loadReservations(currentUserId), loadWalletStats(currentUserId)]);
      } else {
        setError(resp?.message || 'Erreur lors de la confirmation');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Erreur lors de la confirmation');
    } finally {
      setConfirmingId(null);
    }
  };

  const handleCancel = async (reservationId: string, reason?: string) => {
    try {
      const resp = await blockchainService.cancelBooking(reservationId, reason);
      if (resp?.success) {
        setSuccessMessage('Réservation annulée avec succès');
        await loadReservations(currentUserId);
      } else {
        setError(resp?.message || 'Erreur lors de l\'annulation');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Erreur lors de l\'annulation');
    }
    setShowCancelModal(false);
    setSelectedBookingId(null);
  };

  const handleComplete = async (reservationId: string) => {
    try {
      const resp = await blockchainService.completeBooking(reservationId);
      if (resp?.success) {
        setSuccessMessage('Session marquée comme terminée');
        await loadReservations(currentUserId);
      } else {
        setError(resp?.message || 'Erreur lors de la finalisation');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Erreur lors de la finalisation');
    }
    setShowCompleteModal(false);
    setSelectedBookingId(null);
  };

  const handleCourseOutcome = async (courseHeld: boolean) => {
    if (!selectedBookingId) return;
    
    try {
      // Appeler l'endpoint pour confirmer l'outcome du cours
      const resp = await blockchainService.confirmCourseOutcome(selectedBookingId, courseHeld);
      
      if (resp?.success) {
        const message = courseHeld 
          ? '✅ Vous avez confirmé que le cours a eu lieu. Les crédits vont être transférés.'
          : '✅ Vous avez confirmé que le cours n\'a pas eu lieu. Attente de la confirmation de l\'étudiant.';
        setSuccessMessage(message);
        await loadReservations(currentUserId);
      } else {
        setError(resp?.message || 'Erreur lors de la confirmation');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Erreur lors de la confirmation');
    } finally {
      setShowCourseOutcomeModal(false);
      setSelectedBookingId(null);
    }
  };

  const handleContact = async (userId: string) => {
    navigate('/messages', { state: { recipientId: userId } });
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'PENDING':
        return { color: '#FB923C', bg: '#fef3c7', label: 'En attente' };
      case 'CONFIRMED':
        return { color: '#10b981', bg: '#d1fae5', label: 'Confirmé' };
      case 'CANCELLED':
        return { color: '#ef4444', bg: '#fee2e2', label: 'Annulé' };
      case 'COMPLETED':
        return { color: '#3b82f6', bg: '#dbeafe', label: 'Terminé' };
      default:
        return { color: '#6b7280', bg: '#f3f4f6', label: status };
    }
  };

  const getBlockchainStatusConfig = (status: string) => {
    switch (status) {
      case 'PENDING':
        return { color: '#FB923C' };
      case 'CONFIRMED':
        return { color: '#10b981' };
      case 'FAILED':
        return { color: '#ef4444' };
      case 'CANCELLED':
        return { color: '#6b7280' };
      default:
        return { color: '#6b7280' };
    }
  };

  if (loading && reservations.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.loadingContainer}>
            <div className={styles.loadingSpinner}></div>
            <p>Chargement des réservations...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.headerText}>
              <h1 className={styles.title}>Réservations des étudiants</h1>
              <p className={styles.subtitle}>Gérez les demandes de cours de vos étudiants</p>
            </div>
          </div>
          
          <div className={styles.walletSection}>
            <button 
              className={styles.walletBtn}
              onClick={() => setShowWalletCard(!showWalletCard)}
            >
              Mon Portefeuille
            </button>
            
            {showWalletCard && walletStats && (
              <div className={styles.walletCard}>
                <div className={styles.walletCardHeader}>
                  <h4>Solde disponible</h4>
                  <button 
                    onClick={() => setShowWalletCard(false)}
                    className={styles.closeBtn}
                  >
                    ×
                  </button>
                </div>
                
                <div className={styles.walletBalance}>
                  <div className={styles.balanceAmount}>
                    <span className={styles.balanceValue}>
                      {formatAmount(walletStats.available)} <span className={styles.currency}>EduCoins</span>
                    </span>
                  </div>
                  <div className={styles.balanceDetails}>
                    <div className={styles.balanceRow}>
                      <span>Disponible:</span>
                      <span className={styles.availableBalance}>
                        {formatAmount(walletStats.available)}
                      </span>
                    </div>
                    <div className={styles.balanceRow}>
                      <span>Réservé:</span>
                      <span className={styles.lockedBalance}>
                        {formatAmount(walletStats.locked)}
                      </span>
                    </div>
                    <div className={styles.balanceDivider}></div>
                    <div className={styles.balanceRow}>
                      <span>Total:</span>
                      <span className={styles.totalBalance}>
                        {formatAmount(walletStats.total)}
                      </span>
                    </div>
                  </div>
                  
                  <div className={styles.walletActions}>
                    <button 
                      className={styles.viewWalletBtn}
                      onClick={() => navigate('/blockchain')}
                    >
                      Voir mon portefeuille complet
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {successMessage && (
          <div className={styles.successAlert}>
            <span>{successMessage}</span>
            <button 
              onClick={() => setSuccessMessage(null)}
              className={styles.alertCloseBtn}
            >
              ×
            </button>
          </div>
        )}

        {error && (
          <div className={styles.errorAlert}>
            <span>{error}</span>
            <button 
              onClick={() => setError(null)}
              className={styles.alertCloseBtn}
            >
              ×
            </button>
          </div>
        )}

        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            {['pending', 'confirmed', 'completed', 'cancelled', 'all'].map((f) => (
              <button
                key={f}
                className={`${styles.filterBtn} ${filter === f ? styles.active : ''}`}
                onClick={() => setFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {stats && (
          <div className={styles.statsOverview}>
            <div className={styles.statItem}>
              <div className={styles.statNumber}>{stats.total || 0}</div>
              <div className={styles.statLabel}>Total</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statNumber}>{stats.pending || 0}</div>
              <div className={styles.statLabel}>En attente</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statNumber}>{stats.confirmed || 0}</div>
              <div className={styles.statLabel}>Confirmées</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statNumber}>{stats.completed || 0}</div>
              <div className={styles.statLabel}>Terminées</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statNumber}>🪙 {formatAmount(stats.totalAmount || 0)}</div>
              <div className={styles.statLabel}>Total gagné</div>
            </div>
          </div>
        )}

        {reservations.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateContent}>
              <h4>Aucune réservation</h4>
              <p>
                {filter === 'all'
                  ? 'Aucune réservation pour le moment.'
                  : `Aucune réservation avec le statut "${filter}".`}
              </p>
              {filter !== 'all' && (
                <button 
                  className={styles.viewAllBtn}
                  onClick={() => setFilter('all')}
                >
                  Voir toutes les réservations
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className={styles.reservationsList}>
            {reservations.map((reservation) => {
              const statusConfig = getStatusConfig(reservation.status);
              const blockchainConfig = getBlockchainStatusConfig(reservation.blockchainStatus);
              
              // Déterminer qui afficher : étudiant (pour tuteur) ou tuteur (pour étudiant)
              const isMyReservationAsTutor = reservation.myRole === 'tutor';
              const otherParty = isMyReservationAsTutor ? reservation.student : reservation.tutor;
              const otherPartyLabel = isMyReservationAsTutor ? 'Étudiant' : 'Tuteur';

              return (
                <div key={reservation.id} className={styles.reservationCard}>
                  <div className={styles.reservationHeader}>
                    <div className={styles.studentInfo}>
                      <div className={styles.studentAvatar}>
                        {otherParty?.firstName?.[0] || (isMyReservationAsTutor ? 'É' : 'T')}
                      </div>
                      <div className={styles.studentDetails}>
                        <h4 className={styles.studentName}>
                          {otherParty?.firstName} {otherParty?.lastName}
                        </h4>
                        <p className={styles.studentEmail}>
                          {otherParty?.email}
                        </p>
                      </div>
                    </div>
                    
                    <div className={styles.reservationMeta}>
                      <div className={styles.dateTime}>
                        {reservation.date && reservation.time 
                          ? formatDateTime(reservation.date, reservation.time)
                          : (reservation.startTime 
                              ? formatUnixTimestamp(reservation.startTime)
                              : 'Date non disponible'
                            )
                        }
                      </div>
                      <div className={styles.statusBadge} style={{ 
                        backgroundColor: statusConfig.bg,
                        color: statusConfig.color
                      }}>
                        {statusConfig.label}
                      </div>
                      {reservation.blockchainStatus && (
                        <div className={styles.blockchainBadge} style={{ color: blockchainConfig.color }}>
                          {reservation.blockchainStatus}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Informations du cours - Toujours afficher */}
                  <div className={styles.courseDetails}>
                    <div className={styles.courseHeader}>
                      <h5 className={styles.courseTitle}>
                        {getCourseTitle(reservation)}
                      </h5>
                      <div className={styles.courseAmount}>
                        🪙 {formatAmount(reservation.amount)} EduCoins
                      </div>
                    </div>
                    
                    {/* Métadonnées du cours */}
                    <div className={styles.courseMeta}>
                      {reservation.annonce?.subject && (
                        <span className={styles.courseSubject}>
                          📚 {reservation.annonce.subject}
                        </span>
                      )}
                      <span className={styles.courseDuration}>
                        🕒 {formatDuration(reservation.duration)}
                      </span>
                      {reservation.startTime && (
                        <span className={styles.courseDate}>
                          📅 {formatUnixTimestamp(reservation.startTime)}
                        </span>
                      )}
                    </div>
                    
                    {/* Description */}
                    <p className={styles.courseDescription}>
                      {getCourseDescription(reservation)}
                    </p>
                  </div>

                  {/* Notes échangées */}
                  {(reservation.studentNotes || reservation.tutorNotes) && (
                    <div className={styles.notesSection}>
                      {reservation.studentNotes && (
                        <div className={styles.note}>
                          <div className={styles.noteHeader}>
                            <strong>{isMyReservationAsTutor ? "Note de l'étudiant:" : "Votre note:"}</strong>
                          </div>
                          <p className={styles.noteText}>{reservation.studentNotes}</p>
                        </div>
                      )}
                      {reservation.tutorNotes && (
                        <div className={styles.note}>
                          <div className={styles.noteHeader}>
                            <strong>{isMyReservationAsTutor ? "Votre note:" : "Note du tuteur:"}</strong>
                          </div>
                          <p className={styles.noteText}>{reservation.tutorNotes}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions communes aux deux rôles */}
                  <div className={styles.actions}>
                    {/* Actions pour TUTEUR */}
                    {isMyReservationAsTutor && reservation.status === 'PENDING' && (
                      <>
                        <div className={styles.confirmSection}>
                          <textarea
                            value={tutorNotes}
                            onChange={(e) => setTutorNotes(e.target.value)}
                            placeholder="Ajouter un message pour l'étudiant (optionnel)"
                            rows={2}
                            className={styles.confirmTextarea}
                          />
                          <button
                            onClick={() => handleConfirm(reservation.id)}
                            disabled={confirmingId === reservation.id}
                            className={styles.confirmBtn}
                          >
                            {confirmingId === reservation.id ? (
                              <>
                                <span className={styles.spinner}></span>
                                Confirmation...
                              </>
                            ) : (
                              'Confirmer la réservation'
                            )}
                          </button>
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button
                            onClick={() => {
                              setSelectedBookingId(reservation.id);
                              setShowCancelModal(true);
                            }}
                            className={styles.cancelBtn}
                            style={{ flex: 1 }}
                          >
                            Refuser
                          </button>
                          <button
                            onClick={() => {
                              console.log('📧 Contacter:', reservation.student?.email);
                              handleContact(reservation.studentId);
                            }}
                            style={{
                              flex: 1,
                              padding: '10px 15px',
                              background: '#f1f5f9',
                              border: '1px solid #cbd5e1',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontSize: '14px',
                              fontWeight: '500',
                              color: '#475569'
                            }}
                            title="Contacter l'étudiant"
                          >
                            💬 Contacter
                          </button>
                        </div>
                      </>
                    )}

                    {/* Actions pour ÉTUDIANT */}
                    {!isMyReservationAsTutor && reservation.status === 'PENDING' && (
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          onClick={() => {
                            setSelectedBookingId(reservation.id);
                            setShowCancelModal(true);
                          }}
                          className={styles.cancelBtn}
                          style={{ flex: 1 }}
                        >
                          Annuler la réservation
                        </button>
                        <button
                          onClick={() => {
                            console.log('📧 Contacter tuteur:', reservation.tutor?.email);
                            handleContact(reservation.tutorId);
                          }}
                          style={{
                            flex: 1,
                            padding: '10px 15px',
                            background: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500',
                            color: '#475569'
                          }}
                          title="Contacter le tuteur"
                        >
                          💬 Contacter le tuteur
                        </button>
                      </div>
                    )}

                    {/* Actions communes pour CONFIRMED */}
                    {reservation.status === 'CONFIRMED' && (
                      <>
                        {/* Bouton pour voir les détails du cours */}
                        <button
                          className={styles.viewCourseBtn}
                          onClick={() => {
                            setSelectedBookingDetails(reservation);
                            setShowCourseDetailsModal(true);
                          }}
                          title="Voir les détails du cours"
                        >
                          📚 Voir le cours
                        </button>

                        {/* Après la date du cours: bouton pour confirmer l'outcome */}
                        {reservation.startTime && new Date().getTime() >= reservation.startTime * 1000 && (
                          <button
                            onClick={() => {
                              setSelectedBookingId(reservation.id);
                              setShowCourseOutcomeModal(true);
                            }}
                            style={{
                              padding: '12px 20px',
                              background: 'linear-gradient(120deg, #facc15 0%, #fb923c 100%)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontSize: '14px',
                              fontWeight: '600',
                              width: '100%'
                            }}
                          >
                            📅 Confirmer l'issue du cours
                          </button>
                        )}
                      </>
                    )}

                    {/* Statut final pour tous */}
                    {(reservation.status === 'COMPLETED' || reservation.status === 'CANCELLED') && (
                      <div className={styles.finalStatus}>
                        <span>
                          Réservation {reservation.status.toLowerCase()}
                          {reservation.cancelledBy && ` par ${reservation.cancelledBy}`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modales */}
      {showConfirmWithoutMessage && (
        <ConfirmWithoutMessageModal
          onConfirm={confirmWithoutMessage}
          onCancel={() => {
            setShowConfirmWithoutMessage(false);
            setSelectedBookingId(null);
          }}
        />
      )}

      {showCancelModal && selectedBookingId && (
        <CancelModal
          onConfirm={(reason) => handleCancel(selectedBookingId, reason)}
          onCancel={() => {
            setShowCancelModal(false);
            setSelectedBookingId(null);
          }}
        />
      )}

      {showCompleteModal && selectedBookingId && (
        <CompleteSessionModal
          onConfirm={() => handleComplete(selectedBookingId)}
          onCancel={() => {
            setShowCompleteModal(false);
            setSelectedBookingId(null);
          }}
        />
      )}

      {showCourseOutcomeModal && selectedBookingId && (
        <CourseOutcomeModal
          onConfirm={(courseHeld) => handleCourseOutcome(courseHeld)}
          onCancel={() => {
            setShowCourseOutcomeModal(false);
            setSelectedBookingId(null);
          }}
        />
      )}

      {/* Modal des détails du cours */}
      {showCourseDetailsModal && selectedBookingDetails && (
        <div 
          className={styles.modalOverlay}
          onClick={() => setShowCourseDetailsModal(false)}
        >
          <div 
            className={styles.bookingModal}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.bookingModalHeader}>
              <h2>Détails de la Réservation</h2>
              <button className={styles.closeBookingBtn} onClick={() => setShowCourseDetailsModal(false)}>×</button>
            </div>
            <div className={styles.bookingModalContent}>
              <div className={styles.bookingInfoRow}>
                <span className={styles.bookingLabel}>📅 Date</span>
                <span className={styles.bookingValue}>
                  {selectedBookingDetails.startTime 
                    ? formatUnixTimestamp(selectedBookingDetails.startTime)
                    : formatDateTime(selectedBookingDetails.date, selectedBookingDetails.time)}
                </span>
              </div>
              <div className={styles.bookingInfoRow}>
                <span className={styles.bookingLabel}>👤 Étudiant</span>
                <span className={styles.bookingValue}>
                  {selectedBookingDetails.student?.firstName} {selectedBookingDetails.student?.lastName}
                </span>
              </div>
              <div className={styles.bookingInfoRow}>
                <span className={styles.bookingLabel}>📧 Email</span>
                <span className={styles.bookingValue}>{selectedBookingDetails.student?.email}</span>
              </div>
              <div className={styles.bookingInfoRow}>
                <span className={styles.bookingLabel}>📚 Matière</span>
                <span className={styles.bookingValue}>{selectedBookingDetails.annonce?.subject || getCourseTitle(selectedBookingDetails)}</span>
              </div>
              <div className={styles.bookingInfoRow}>
                <span className={styles.bookingLabel}>🎯 Niveau</span>
                <span className={styles.bookingValue}>{selectedBookingDetails.annonce?.level || 'Tous niveaux'}</span>
              </div>
              <div className={styles.bookingInfoRow}>
                <span className={styles.bookingLabel}>⏱️ Durée</span>
                <span className={styles.bookingValue}>{formatDuration(selectedBookingDetails.duration)}</span>
              </div>
              <div className={styles.bookingInfoRow}>
                <span className={styles.bookingLabel}>💰 Montant</span>
                <span className={`${styles.bookingValue} ${styles.amount}`}>{formatAmount(selectedBookingDetails.amount)} EDU</span>
              </div>
              <div className={styles.bookingInfoRow}>
                <span className={styles.bookingLabel}>📍 Mode</span>
                <span className={styles.bookingValue}>
                  {selectedBookingDetails.annonce?.teachingMode === 'online' ? '🖥️ En ligne' : '👥 Présentiel'}
                </span>
              </div>
              <div className={styles.bookingInfoRow}>
                <span className={styles.bookingLabel}>📝 Description</span>
                <span className={styles.bookingValue}>{getCourseDescription(selectedBookingDetails)}</span>
              </div>
              {selectedBookingDetails.tutorNotes && (
                <div className={styles.bookingInfoRow}>
                  <span className={styles.bookingLabel}>✍️ Notes du Tuteur</span>
                  <span className={styles.bookingValue}>{selectedBookingDetails.tutorNotes}</span>
                </div>
              )}
              {selectedBookingDetails.studentNotes && (
                <div className={styles.bookingInfoRow}>
                  <span className={styles.bookingLabel}>✍️ Notes de l'Étudiant</span>
                  <span className={styles.bookingValue}>{selectedBookingDetails.studentNotes}</span>
                </div>
              )}
            </div>
            <div className={styles.bookingModalActions}>
              <button className={styles.closeModalButton} onClick={() => setShowCourseDetailsModal(false)}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReservationsPage;