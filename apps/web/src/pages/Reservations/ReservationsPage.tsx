import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import blockchainService from '../../services/blockchainService';
import authService from '../../services/authService';
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
  };
  student?: {
    firstName: string;
    lastName: string;
    email: string;
  };
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

const ReservationsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [reservations, setReservations] = useState<Booking[]>([]);
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
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  const currentUser = authService.getCurrentUser();
  const currentUserId = currentUser?.id;
  const isTutor = currentUser?.role === 'tutor';

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

  const loadReservations = async (userId?: string) => {
    try {
      setLoading(true);
      setError(null);

      if (!userId) {
        navigate('/connexion');
        return;
      }

      console.log(`Chargement réservations pour userId: ${userId}, rôle: ${currentUser?.role}`);
      
      let fetched: any[] = [];
      let fetchedStats: any = null;

      if (currentUser?.role === 'tutor') {
        const filters = filter !== 'all' ? { status: filter.toUpperCase() } : undefined;
        const resp = await blockchainService.getBookingsByTutor(userId, filters);
        
        if (resp?.success) {
          fetched = resp.data?.reservations || resp.data || [];
          fetchedStats = resp.data?.stats || resp.stats || null;
        }
      } else {
        const filters = filter !== 'all' ? { status: filter.toUpperCase() } : undefined;
        const resp = await blockchainService.getBookingsByUser(userId, filters);
        
        if (resp?.success) {
          fetched = resp.data?.reservations || resp.data || [];
          fetchedStats = resp.data?.stats || resp.stats || null;
        }
      }

      console.log(`${fetched.length} réservations chargées`);
      
      if (fetched.length > 0) {
        console.log('Première réservation:', fetched[0]);
        console.log('Est-ce que annonce existe?', 'annonce' in fetched[0]);
        console.log('Valeur de annonce:', fetched[0].annonce);
      }
      
      setReservations(fetched || []);
      setStats(fetchedStats || null);
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

  useEffect(() => {
    loadReservations(currentUserId);
    loadWalletStats(currentUserId);
  }, [currentUserId, filter]);

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
        setSuccessMessage('Réservation confirmée ! Les crédits ont été transférés vers votre portefeuille.');
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
    
    setConfirmingId(selectedBookingId);
    try {
      const resp = await bookingService.confirmBooking(selectedBookingId, '');
      if (resp?.success) {
        setSuccessMessage('Réservation confirmée ! Les crédits ont été transférés vers votre portefeuille.');
        setTutorNotes('');
        await Promise.all([loadReservations(currentUserId), loadWalletStats(currentUserId)]);
      } else {
        setError(resp?.message || 'Erreur lors de la confirmation');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Erreur lors de la confirmation');
    } finally {
      setConfirmingId(null);
      setShowConfirmWithoutMessage(false);
      setSelectedBookingId(null);
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

              return (
                <div key={reservation.id} className={styles.reservationCard}>
                  <div className={styles.reservationHeader}>
                    <div className={styles.studentInfo}>
                      <div className={styles.studentAvatar}>
                        {reservation.student?.firstName?.[0] || 'É'}
                      </div>
                      <div className={styles.studentDetails}>
                        <h4 className={styles.studentName}>
                          {reservation.student?.firstName} {reservation.student?.lastName}
                        </h4>
                        <p className={styles.studentEmail}>
                          {reservation.student?.email}
                        </p>
                      </div>
                    </div>
                    
                    <div className={styles.reservationMeta}>
                      <div className={styles.dateTime}>
                        {formatDateTime(reservation.date, reservation.time)}
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

                  {reservation.annonce && (
                    <div className={styles.courseDetails}>
                      <div className={styles.courseHeader}>
                        <h5 className={styles.courseTitle}>
                          {reservation.annonce.title || reservation.annonceTitle || `Annonce #${reservation.annonceId}`}
                        </h5>
                        <div className={styles.courseAmount}>
                          🪙 {formatAmount(reservation.amount)} EduCoins
                        </div>
                      </div>
                      <div className={styles.courseMeta}>
                        <span className={styles.courseSubject}>
                          {reservation.annonce.subject}
                        </span>
                        <span className={styles.courseDuration}>
                          {reservation.duration} minutes
                        </span>
                      </div>
                      <p className={styles.courseDescription}>
                        {reservation.description || reservation.annonce.description}
                      </p>
                    </div>
                  )}

                  {/* Si l'annonce n'est pas récupérée mais qu'on a le titre */}
                  {!reservation.annonce && reservation.annonceTitle && (
                    <div className={styles.courseDetails}>
                      <div className={styles.courseHeader}>
                        <h5 className={styles.courseTitle}>
                          {reservation.annonceTitle}
                        </h5>
                        <div className={styles.courseAmount}>
                          🪙 {formatAmount(reservation.amount)} EduCoins
                        </div>
                      </div>
                      <div className={styles.courseMeta}>
                        <span className={styles.courseDuration}>
                          {reservation.duration} minutes
                        </span>
                      </div>
                      {reservation.description && (
                        <p className={styles.courseDescription}>
                          {reservation.description}
                        </p>
                      )}
                    </div>
                  )}

                  {(reservation.studentNotes || reservation.tutorNotes) && (
                    <div className={styles.notesSection}>
                      {reservation.studentNotes && (
                        <div className={styles.note}>
                          <div className={styles.noteHeader}>
                            <strong>Note de l'étudiant:</strong>
                          </div>
                          <p className={styles.noteText}>{reservation.studentNotes}</p>
                        </div>
                      )}
                      {reservation.tutorNotes && (
                        <div className={styles.note}>
                          <div className={styles.noteHeader}>
                            <strong>Votre note:</strong>
                          </div>
                          <p className={styles.noteText}>{reservation.tutorNotes}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {isTutor && (
                    <div className={styles.actions}>
                      {reservation.status === 'PENDING' && (
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
                          <button
                            onClick={() => {
                              setSelectedBookingId(reservation.id);
                              setShowCancelModal(true);
                            }}
                            className={styles.cancelBtn}
                          >
                            Refuser
                          </button>
                        </>
                      )}

                      {reservation.status === 'CONFIRMED' && (
                        <button
                          onClick={() => {
                            setSelectedBookingId(reservation.id);
                            setShowCompleteModal(true);
                          }}
                          className={styles.completeBtn}
                        >
                          Marquer comme terminé
                        </button>
                      )}

                      {(reservation.status === 'COMPLETED' || reservation.status === 'CANCELLED') && (
                        <div className={styles.finalStatus}>
                          <span>
                            Réservation {reservation.status.toLowerCase()}
                            {reservation.cancelledBy && ` par ${reservation.cancelledBy}`}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
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
    </div>
  );
};

export default ReservationsPage;