import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import blockchainService from '../../services/blockchainService';
import authService from '../../services/authService';
import styles from './ReservationsPage.module.css';

interface Booking {
  id: string;
  tutorId: string;
  studentId: string;
  annonceId: string;
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

  const currentUser = authService.getCurrentUser();
  const currentUserId = currentUser?.id; // <-- stable primitive for deps
  const isTutor = currentUser?.role === 'tutor';

  // Vérifier les messages de succès
  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      // Nettoyer l'état après affichage
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

  // Load functions use currentUserId inside instead of relying on object identity
  // Dans ReservationsPage.tsx, remplacez la fonction loadReservations :

  const loadReservations = async (userId?: string) => {
    try {
      setLoading(true);
      setError(null);

      if (!userId) {
        navigate('/connexion');
        return;
      }

      console.log(`🔍 Chargement réservations pour userId: ${userId}, rôle: ${currentUser?.role}`);
      
      let fetched: any[] = [];
      let fetchedStats: any = null;

      // Charger selon le rôle
      if (currentUser?.role === 'tutor') {
        // Pour les tuteurs, utiliser getBookingsByTutor avec le userId
        const filters = filter !== 'all' ? { status: filter.toUpperCase() } : undefined;
        const resp = await blockchainService.getBookingsByTutor(userId, filters);
        
        if (resp?.success) {
          fetched = resp.data?.reservations || resp.data || [];
          fetchedStats = resp.data?.stats || resp.stats || null;
        }
      } else {
        // Pour les étudiants, utiliser getBookingsByUser
        const filters = filter !== 'all' ? { status: filter.toUpperCase() } : undefined;
        const resp = await blockchainService.getBookingsByUser(userId, filters);
        
        if (resp?.success) {
          fetched = resp.data?.reservations || resp.data || [];
          fetchedStats = resp.data?.stats || resp.stats || null;
        }
      }

      console.log(`✅ ${fetched.length} réservations chargées`);
      setReservations(fetched || []);
      setStats(fetchedStats || null);
    } catch (err: any) {
      console.error('❌ Erreur chargement réservations:', err);
      setError(err.message || 'Erreur lors du chargement des réservations');
    } finally {
      setLoading(false);
    }
  };

  const loadWalletStats = async (userId?: string) => {
    try {
      // only try when userId present
      if (!userId) return;
      const balanceData = await blockchainService.getBalance();
      setWalletStats(balanceData.wallet);
    } catch (err) {
      console.error('Erreur chargement wallet:', err);
    }
  };

  // useEffect now depends on currentUserId (primitive) and filter
  useEffect(() => {
    loadReservations(currentUserId);
    loadWalletStats(currentUserId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId, filter]);

  const handleConfirm = async (reservationId: string) => {
    if (!tutorNotes.trim() && !window.confirm('Confirmer sans message pour l\'étudiant ?')) {
      return;
    }

    setConfirmingId(reservationId);
    try {
      const resp = await blockchainService.confirmBooking(reservationId, tutorNotes);
      if (resp?.success) {
        setSuccessMessage('✅ Réservation confirmée ! Les crédits ont été transférés vers votre portefeuille.');
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

  const handleCancel = async (reservationId: string) => {
    const reason = prompt('Raison de l\'annulation (optionnel):');
    if (reason === null) return;

    try {
      const resp = await blockchainService.cancelBooking(reservationId, reason);
      if (resp?.success) {
        setSuccessMessage('✅ Réservation annulée avec succès');
        await loadReservations(currentUserId);
      } else {
        setError(resp?.message || 'Erreur lors de l\'annulation');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Erreur lors de l\'annulation');
    }
  };

  const handleComplete = async (reservationId: string) => {
    if (!window.confirm('Marquer cette session comme terminée ?')) return;

    try {
      const resp = await blockchainService.completeBooking(reservationId);
      if (resp?.success) {
        setSuccessMessage('✅ Session marquée comme terminée');
        await loadReservations(currentUserId);
      } else {
        setError(resp?.message || 'Erreur lors de la finalisation');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Erreur lors de la finalisation');
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'PENDING':
        return { color: '#f59e0b', bg: '#fef3c7', icon: '⏳', label: 'En attente' };
      case 'CONFIRMED':
        return { color: '#10b981', bg: '#d1fae5', icon: '✅', label: 'Confirmé' };
      case 'CANCELLED':
        return { color: '#ef4444', bg: '#fee2e2', icon: '❌', label: 'Annulé' };
      case 'COMPLETED':
        return { color: '#3b82f6', bg: '#dbeafe', icon: '🎓', label: 'Terminé' };
      default:
        return { color: '#6b7280', bg: '#f3f4f6', icon: '📝', label: status };
    }
  };

  const getBlockchainStatusConfig = (status: string) => {
    switch (status) {
      case 'PENDING':
        return { color: '#f59e0b', icon: '⛓️⏳' };
      case 'CONFIRMED':
        return { color: '#10b981', icon: '⛓️✅' };
      case 'FAILED':
        return { color: '#ef4444', icon: '⛓️❌' };
      case 'CANCELLED':
        return { color: '#6b7280', icon: '⛓️🚫' };
      default:
        return { color: '#6b7280', icon: '⛓️' };
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
        {/* Header avec titre et bouton portefeuille */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h1 className={styles.title}>
              <span className={styles.titleIcon}>🗓️</span>
              Réservations des étudiants
            </h1>
            <p className={styles.subtitle}>
              Gérez les demandes de cours de vos étudiants
            </p>
          </div>
          
          {/* Bouton portefeuille */}
          <div className={styles.walletSection}>
            <button 
              className={styles.walletBtn}
              onClick={() => setShowWalletCard(!showWalletCard)}
            >
              <span className={styles.walletIcon}>💰</span>
              <span>Mon Portefeuille</span>
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
                    <span className={styles.balanceIcon}>🪙</span>
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

        {/* Messages d'alerte */}
        {successMessage && (
          <div className={styles.successAlert}>
            <div className={styles.successIcon}>✅</div>
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
            <div className={styles.errorIcon}>❌</div>
            <span>{error}</span>
            <button 
              onClick={() => setError(null)}
              className={styles.alertCloseBtn}
            >
              ×
            </button>
          </div>
        )}

        {/* Filtres */}
        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            {['pending', 'confirmed', 'completed', 'cancelled', 'all'].map((f) => (
              <button
                key={f}
                className={`${styles.filterBtn} ${filter === f ? styles.active : ''}`}
                onClick={() => setFilter(f)}
              >
                {f === 'pending' && '⏳ '}
                {f === 'confirmed' && '✅ '}
                {f === 'completed' && '🎓 '}
                {f === 'cancelled' && '❌ '}
                {f === 'all' && '📋 '}
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Statistiques */}
        {stats && (
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>📋</div>
              <div className={styles.statContent}>
                <div className={styles.statNumber}>{stats.total || 0}</div>
                <div className={styles.statLabel}>Total</div>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>⏳</div>
              <div className={styles.statContent}>
                <div className={styles.statNumber} style={{ color: '#f59e0b' }}>
                  {stats.pending || 0}
                </div>
                <div className={styles.statLabel}>En attente</div>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>✅</div>
              <div className={styles.statContent}>
                <div className={styles.statNumber} style={{ color: '#10b981' }}>
                  {stats.confirmed || 0}
                </div>
                <div className={styles.statLabel}>Confirmées</div>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>🎓</div>
              <div className={styles.statContent}>
                <div className={styles.statNumber} style={{ color: '#3b82f6' }}>
                  {stats.completed || 0}
                </div>
                <div className={styles.statLabel}>Terminées</div>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>💰</div>
              <div className={styles.statContent}>
                <div className={styles.statNumber} style={{ color: '#8b5cf6' }}>
                  🪙 {formatAmount(stats.totalAmount || 0)}
                </div>
                <div className={styles.statLabel}>Total gagné</div>
              </div>
            </div>
          </div>
        )}

        {/* Liste des réservations */}
        {reservations.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📭</div>
            <h3>Aucune réservation</h3>
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
        ) : (
          <div className={styles.reservationsList}>
            {reservations.map((reservation) => {
              const statusConfig = getStatusConfig(reservation.status);
              const blockchainConfig = getBlockchainStatusConfig(reservation.blockchainStatus);

              return (
                <div key={reservation.id} className={styles.reservationCard}>
                  {/* Header de la carte */}
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
                        <span className={styles.statusIcon}>{statusConfig.icon}</span>
                        {statusConfig.label}
                      </div>
                      {reservation.blockchainStatus && (
                        <div className={styles.blockchainBadge} style={{ color: blockchainConfig.color }}>
                          {blockchainConfig.icon} {reservation.blockchainStatus}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Détails du cours */}
                  {reservation.annonce && (
                    <div className={styles.courseDetails}>
                      <div className={styles.courseHeader}>
                        <h5 className={styles.courseTitle}>{reservation.annonce.title}</h5>
                        <div className={styles.courseAmount}>
                          🪙 {formatAmount(reservation.amount)} EduCoins
                        </div>
                      </div>
                      <div className={styles.courseMeta}>
                        <span className={styles.courseSubject}>
                          📚 {reservation.annonce.subject}
                        </span>
                        <span className={styles.courseDuration}>
                          ⏱️ {reservation.duration} minutes
                        </span>
                      </div>
                      <p className={styles.courseDescription}>
                        {reservation.description || reservation.annonce.description}
                      </p>
                    </div>
                  )}

                  {/* Notes */}
                  {(reservation.studentNotes || reservation.tutorNotes) && (
                    <div className={styles.notesSection}>
                      {reservation.studentNotes && (
                        <div className={styles.note}>
                          <div className={styles.noteHeader}>
                            <span className={styles.noteIcon}>💬</span>
                            <strong>Note de l'étudiant:</strong>
                          </div>
                          <p className={styles.noteText}>{reservation.studentNotes}</p>
                        </div>
                      )}
                      {reservation.tutorNotes && (
                        <div className={styles.note}>
                          <div className={styles.noteHeader}>
                            <span className={styles.noteIcon}>✏️</span>
                            <strong>Votre note:</strong>
                          </div>
                          <p className={styles.noteText}>{reservation.tutorNotes}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions (uniquement pour les tuteurs) */}
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
                                '✅ Confirmer la réservation'
                              )}
                            </button>
                          </div>
                          <button
                            onClick={() => handleCancel(reservation.id)}
                            className={styles.cancelBtn}
                          >
                            ❌ Refuser
                          </button>
                        </>
                      )}

                      {reservation.status === 'CONFIRMED' && (
                        <button
                          onClick={() => handleComplete(reservation.id)}
                          className={styles.completeBtn}
                        >
                          🎓 Marquer comme terminé
                        </button>
                      )}

                      {(reservation.status === 'COMPLETED' || reservation.status === 'CANCELLED') && (
                        <div className={styles.finalStatus}>
                          <span className={styles.finalStatusIcon}>
                            {reservation.status === 'COMPLETED' ? '🎓' : '❌'}
                          </span>
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
    </div>
  );
};

export default ReservationsPage;