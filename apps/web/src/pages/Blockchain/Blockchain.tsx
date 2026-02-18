import React, { useState, useEffect } from 'react';
import type { 
  WalletBalance, 
  Transaction, 
  TransferRequest, 
  WithdrawalRequest, 
  WalletStats 
} from '../../services/blockchainService';
import blockchainService from '../../services/blockchainService';
import styles from './Blockchain.module.css';
import payment from '../../assets/images/paiement.png';
import transaction from '../../assets/images/transaction.png';
import statistique from '../../assets/images/statistique.png';

const Blockchain: React.FC = () => {
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<WalletStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'transfer'>('overview');
  const [transactionFilter, setTransactionFilter] = useState<'all' | 'incoming' | 'outgoing'>('all');
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  
  // ⚡ États pour le chargement progressif
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  
  // Cache frontend pour éviter les rechargements inutiles
  const [cacheTimestamp, setCacheTimestamp] = useState<number>(0);
  const CACHE_TTL = 30000; // 30 secondes

  // États pour les formulaires
  const [transferData, setTransferData] = useState<TransferRequest>({
    toWalletAddress: '',
    amount: 0,
    description: ''
  });
  const [withdrawalData, setWithdrawalData] = useState<WithdrawalRequest>({
    amount: 0,
    bankDetails: {
      accountHolder: '',
      iban: '',
      bankName: ''
    }
  });

  // États pour les modals
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [withdrawalModalOpen, setWithdrawalModalOpen] = useState(false);
  const [bookingDetailsOpen, setBookingDetailsOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);

  // Charger les données initiales
  useEffect(() => {
    console.log('🔍 [React] Chargement des données initiales...');
    loadWalletData();
  }, []);

  useEffect(() => {
    if (!copyMessage) return;
    const timer = setTimeout(() => setCopyMessage(null), 2000);
    return () => clearTimeout(timer);
  }, [copyMessage]);

  const loadWalletData = async (forceRefresh = false) => {
    console.log('🔄 [React] Chargement des données wallet...');
    
    // Vérifier le cache
    const now = Date.now();
    if (!forceRefresh && cacheTimestamp && (now - cacheTimestamp) < CACHE_TTL) {
      console.log('⚡ [React] Utilisation du cache (données récentes)');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // 🚀 PHASE 1 : Charger le SOLDE en priorité (plus rapide)
      console.log('⚡ [React] Phase 1: Chargement du solde...');
      const balanceData = await blockchainService.getBalance();
      setBalance(balanceData);
      setLoading(false); // Débloquer l'UI immédiatement
      console.log('✅ [React] Solde chargé:', balanceData.wallet.available);
      
      // 🚀 PHASE 2 : Charger les 5 PREMIÈRES TRANSACTIONS RAPIDEMENT
      console.log('⚡ [React] Phase 2: Chargement des 5 premières transactions...');
      setTransactionsLoading(true);
      blockchainService.getHistory({ limit: 5 }).then(historyData => {
        setTransactions(historyData.transactions);
        console.log('✅ [React] 5 transactions chargées');
      }).catch(err => {
        console.error('⚠️ [React] Erreur transactions initiales (non-bloquant):', err);
      });
      
      // 🚀 PHASE 3 : Charger les 20 TRANSACTIONS COMPLÈTES en arrière-plan
      console.log('⚡ [React] Phase 3: Chargement de l\'historique complet...');
      blockchainService.getHistory({ limit: 20 }).then(historyData => {
        setTransactions(historyData.transactions);
        setTransactionsLoading(false);
        console.log('✅ [React] Historique complet chargé:', historyData.transactions.length);
      }).catch(err => {
        console.error('⚠️ [React] Erreur historique complet (non-bloquant):', err);
        setTransactionsLoading(false);
      });
      
      // 🚀 PHASE 4 : Charger les STATS en dernier (moins prioritaire)
      console.log('⚡ [React] Phase 4: Chargement des stats...');
      setStatsLoading(true);
      blockchainService.getStats().then(statsData => {
        setStats(statsData);
        setStatsLoading(false);
        console.log('✅ [React] Stats chargées');
      }).catch(err => {
        console.error('⚠️ [React] Erreur stats (non-bloquant):', err);
        setStatsLoading(false);
      });
      
      // Mettre à jour le cache
      setCacheTimestamp(Date.now());
      
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Erreur lors du chargement des données';
      setError(errorMessage);
      console.error('❌ [React] Erreur chargement données:', err);
      setLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (!transferData.toWalletAddress || !transferData.amount || transferData.amount <= 0) {
      setError('Adresse du destinataire et montant valide requis');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null); // Réinitialiser le succès précédent
    
    try {
      console.log('🔄 [React] Début du transfert côté frontend');
      console.log('📤 [React] Données:', transferData);
      
      // Appeler l'API blockchainService.transfer()
      const response = await blockchainService.transfer(transferData);
      
      console.log('✅ [React] Réponse du service blockchain:', response);
      
      // Afficher le succès SEULEMENT après la réponse réussie
      setSuccess(`Transfert de ${transferData.amount} crédits effectué avec succès!`);
      setTransferModalOpen(false);
      setTransferData({ toWalletAddress: '', amount: 0, description: '' });
      
      // ⚡ OPTIMISATION: Ne recharger QUE le solde + ajouter la transaction localement
      const newBalance = await blockchainService.getBalance();
      setBalance(newBalance);
      
      // Ajouter la transaction localement pour affichage instantané
      if (response.transaction) {
        setTransactions(prev => [response.transaction, ...prev]);
      }
      
      // Invalider le cache pour le prochain chargement complet
      setCacheTimestamp(0); 
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Erreur lors du transfert';
      setError(errorMessage);
      console.error('❌ [React] Erreur transfert:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawal = async () => {
    if (!withdrawalData.amount || withdrawalData.amount <= 0 || !withdrawalData.bankDetails.iban) {
      setError('Montant valide et IBAN requis');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      console.log('🏧 [React] Demande de retrait...');
      const response = await blockchainService.requestWithdrawal(withdrawalData);
      
      console.log('✅ [React] Retrait créé:', response);
      setSuccess(`Demande de retrait de ${withdrawalData.amount} crédits créée!`);
      setWithdrawalModalOpen(false);
      setWithdrawalData({
        amount: 0,
        bankDetails: { accountHolder: '', iban: '', bankName: '' }
      });
      
      // ⚡ OPTIMISATION: Ne recharger QUE le solde
      const newBalance = await blockchainService.getBalance();
      setBalance(newBalance);
      setCacheTimestamp(0);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Erreur lors de la demande de retrait';
      setError(errorMessage);
      console.error('❌ [React] Erreur retrait:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return styles.statusCompleted;
      case 'pending': return styles.statusPending;
      case 'failed': return styles.statusFailed;
      default: return styles.statusDefault;
    }
  };

  const getTransactionTypeIcon = (type: string) => {
    switch (type) {
      case 'TRANSFER': return '🔄';
      case 'DEPOSIT': return '💰';
      case 'WITHDRAWAL': return '💳';
      case 'TUTOR_SESSION': return '👨‍🏫';
      case 'EXCHANGE_SERVICE': return '🔄';
      default: return '📄';
    }
  };

  // Fonction pour obtenir les détails de la transaction
  const getTransactionDetails = (transaction: Transaction) => {
    const currentUserId = balance?.user?.id;
    
    // BOOKINGS: Détecter si c'est une transaction entrante (tuteur) ou sortante (étudiant)
    if (transaction.transactionType === 'BOOKING' && transaction.metadata?.tutorName) {
      // Si toWalletId est un UUID (contient des tirets), c'est une transaction entrante pour le tuteur
      const isIncomingToTutor = transaction.toWalletId && transaction.toWalletId.includes('-') && transaction.toWalletId === currentUserId;
      
      if (isIncomingToTutor) {
        // Transaction entrante pour le tuteur
        return {
          type: 'booking',
          direction: '← Réservation',
          description: `Cours avec ${transaction.fromWallet?.user?.firstName || 'Étudiant'} ${transaction.fromWallet?.user?.lastName || ''}`,
          userName: `${transaction.fromWallet?.user?.firstName || 'Étudiant'} ${transaction.fromWallet?.user?.lastName || ''}`,
          walletAddress: transaction.fromWalletId,
          amountColor: styles.positive,
          amountSign: '+',
          bookingId: transaction.metadata.bookingId,
          tutorId: transaction.metadata.tutorId
        };
      } else {
        // Transaction sortante pour l'étudiant
        return {
          type: 'booking',
          direction: '→ Réservation',
          description: `Cours avec ${transaction.metadata.tutorName}`,
          userName: transaction.metadata.tutorName,
          walletAddress: transaction.toWalletId,
          amountColor: styles.negative,
          amountSign: '-',
          bookingId: transaction.metadata.bookingId,
          tutorId: transaction.metadata.tutorId
        };
      }
    }
    
    if (transaction.fromWalletId && transaction.toWalletId) {
      const isOutgoing = transaction.fromWallet?.userId === currentUserId;
      const isIncoming = transaction.toWallet?.userId === currentUserId;
      
      if (isOutgoing) {
        return {
          type: 'sortant',
          direction: '→ Sortant',
          description: `Transfert vers ${transaction.toWallet?.user?.firstName || 'Utilisateur'} ${transaction.toWallet?.user?.lastName || ''}`,
          userName: `${transaction.toWallet?.user?.firstName || 'Utilisateur'} ${transaction.toWallet?.user?.lastName || ''}`,
          walletAddress: transaction.toWallet?.walletAddress,
          amountColor: styles.negative,
          amountSign: '-'
        };
      } else if (isIncoming) {
        return {
          type: 'entrant', 
          direction: '← Entrant',
          description: `Reçu de ${transaction.fromWallet?.user?.firstName || 'Utilisateur'} ${transaction.fromWallet?.user?.lastName || ''}`,
          userName: `${transaction.fromWallet?.user?.firstName || 'Utilisateur'} ${transaction.fromWallet?.user?.lastName || ''}`,
          walletAddress: transaction.fromWallet?.walletAddress,
          amountColor: styles.positive,
          amountSign: '+'
        };
      }
    }
    
    // Pour les autres types de transactions
    return {
      type: 'autre',
      direction: '• Autre',
      description: transaction.description || transaction.transactionType,
      userName: '',
      walletAddress: '',
      amountColor: styles.positive,
      amountSign: '+'
    };
  };

  // Filtrer les transactions
  const filteredTransactions = transactions.filter(transaction => {
    const currentUserId = balance?.user?.id;
    
    // Filtrer les transactions qui concernent l'utilisateur actuel
    // Pour les bookings, ne montrer que la transaction de l'utilisateur qui l'a créée ou reçue
    if (transaction.transactionType === 'BOOKING') {
      // Si c'est une transaction vers un userId (pas une adresse wallet), c'est une transaction tuteur
      // On vérifie si toWalletId est un UUID (format avec tirets)
      const isToUserId = transaction.toWalletId && transaction.toWalletId.includes('-');
      
      if (isToUserId) {
        // C'est une transaction entrante pour le tuteur
        // Montrer uniquement si l'utilisateur actuel est le tuteur (toWalletId = currentUserId)
        if (transaction.toWalletId !== currentUserId) {
          return false;
        }
      } else {
        // C'est une transaction sortante de l'étudiant vers l'escrow
        // Montrer uniquement si l'utilisateur actuel est l'étudiant
        if (transaction.fromWallet?.userId !== currentUserId) {
          return false;
        }
      }
    }
    
    // Appliquer les filtres de type (all, incoming, outgoing)
    if (transactionFilter === 'all') return true;
    
    const isOutgoing = transaction.fromWallet?.userId === currentUserId;
    const isIncoming = transaction.toWallet?.userId === currentUserId || transaction.toWalletId === currentUserId;
    
    if (transactionFilter === 'outgoing') return isOutgoing;
    if (transactionFilter === 'incoming') return isIncoming;
    
    return true;
  });

  const handleTransferChange = (field: keyof TransferRequest, value: string | number) => {
    setTransferData(prev => ({ ...prev, [field]: value }));
  };

  const handleWithdrawalChange = (field: keyof WithdrawalRequest['bankDetails'] | 'amount', value: string | number) => {
    if (field === 'amount') {
      setWithdrawalData(prev => ({ ...prev, amount: value as number }));
    } else {
      setWithdrawalData(prev => ({
        ...prev,
        bankDetails: { ...prev.bankDetails, [field]: value }
      }));
    }
  };

  const handleCopyWalletAddress = async (address?: string) => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopyMessage('Adresse du wallet copiée');
    } catch (err) {
      console.error('❌ [React] Erreur copie adresse wallet:', err);
      setCopyMessage('Copie impossible');
    }
  };

  // Fonction pour raccourcir l'adresse du wallet
  const shortenAddress = (address: string) => {
    if (!address) return '';
    return `${address.substring(0, 8)}...${address.substring(address.length - 6)}`;
  };

  if (loading && !balance) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Chargement du portefeuille...</p>
      </div>
    );
  }

  return (
    <div className={styles.blockchainContainer}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerText}>
            <h1>Portefeuille EduMate</h1>
            <p>Gérez vos crédits et transactions en toute sécurité</p>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className={styles.notificationContainer}>
          <div className={`${styles.notification} ${styles.error}`}>
            <div className={styles.notificationIcon}>⚠️</div>
            <div className={styles.notificationContent}>
              <span className={styles.notificationTitle}>Erreur</span>
              <span className={styles.notificationMessage}>{error}</span>
            </div>
            <button onClick={() => setError(null)} className={styles.closeBtn}>×</button>
          </div>
        </div>
      )}

      {success && (
        <div className={styles.notificationContainer}>
          <div className={`${styles.notification} ${styles.success}`}>
            <div className={styles.notificationIcon}>✅</div>
            <div className={styles.notificationContent}>
              <span className={styles.notificationTitle}>Succès</span>
              <span className={styles.notificationMessage}>{success}</span>
            </div>
            <button onClick={() => setSuccess(null)} className={styles.closeBtn}>×</button>
          </div>
        </div>
      )}

      {/* Navigation par onglets */}
      <div className={styles.tabsContainer}>
        <div className={styles.tabs}>
          <button 
            className={`${styles.tab} ${activeTab === 'overview' ? styles.active : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <span className={styles.tabLabel}>Aperçu</span>
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'transactions' ? styles.active : ''}`}
            onClick={() => setActiveTab('transactions')}
          >
            <span className={styles.tabLabel}>Transactions</span>
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'transfer' ? styles.active : ''}`}
            onClick={() => setActiveTab('transfer')}
          >
            <span className={styles.tabLabel}>Transférer</span>
          </button>
        </div>
      </div>

      {/* Contenu des onglets */}
      <div className={styles.tabContent}>
        
        {/* Onglet Aperçu */}
        {activeTab === 'overview' && (
          <div className={styles.overviewGrid}>
            {/* Carte de solde */}
            {balance && (
              <div className={`${styles.card} ${styles.balanceCard}`}>
                <div className={styles.cardHeader} style={{ marginBottom: '4rem' }}>
                  <div className={styles.cardTitle}>
                    <div className={styles.titleWithIcon}>
                      <img src={payment} alt="Solde Icon" className={styles.soldeIcon} />
                      <div>
                        <h3>Solde du Portefeuille</h3>
                        <div className={styles.userInfo}>
                          <div className={styles.roleBadge}>
                            {balance.user?.role === 'student' ? 'Étudiant' : 'Tuteur'}
                          </div>
                          <div className={styles.userName}> 
                            {balance.user?.firstName} {balance.user?.lastName} 
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className={styles.walletInfo}>
                    <div className={styles.walletAddressRow}>
                      <div className={styles.walletAddress} title={balance.wallet.walletAddress}>
                        {shortenAddress(balance.wallet.walletAddress)}
                      </div>
                      <button
                        className={styles.copyBtn}
                        onClick={() => handleCopyWalletAddress(balance.wallet.walletAddress)}
                        aria-label="Copier l'adresse du wallet"
                      >
                        Copier
                      </button>
                    </div>
                    {copyMessage && (
                      <div className={styles.copyHint}>{copyMessage}</div>
                    )}
                    <div className={styles.statusBadge}>
                      <span className={`${styles.status} ${styles[balance.wallet.kycStatus] || styles.none}`}>
                        KYC: {balance.wallet.kycStatus}
                      </span>
                    </div>
                  </div>
                </div>

                <div className={styles.balanceGrid}>
                  <div className={styles.balanceItem}>
                    <div className={styles.balanceLabel}>Solde disponible</div>
                    <div className={`${styles.balanceAmount} ${styles.primary}`}>
                      {formatAmount(balance.wallet.available)} 🪙
                    </div>
                    <div className={styles.balanceTrend}>Prêt à utiliser</div>
                  </div>
                  <div className={styles.balanceItem}>
                    <div className={styles.balanceLabel}>Argent en attente</div>
                    <div className={styles.balanceAmount}>
                      {formatAmount(balance.wallet.locked)} 🪙
                    </div>
                    <div className={styles.balanceTrend}>Réservations en cours</div>
                  </div>
                  <div className={styles.balanceItem}>
                    <div className={styles.balanceLabel}>Solde total</div>
                    <div className={styles.balanceAmount}>
                      {formatAmount(balance.wallet.total)} 🪙
                    </div>
                    <div className={styles.balanceTrend}>Total</div>
                  </div>
                </div>

                <div className={styles.cardFooter}>
                  <div className={styles.actionButtons}>
                    <button
                      className={`${styles.btn} ${styles.btnPrimary} ${styles.btnIcon} ${styles.btnAction}`}
                      onClick={() => setTransferModalOpen(true)}
                    >
                      Transférer
                    </button>
                    <button
                      className={`${styles.btn} ${styles.btnSecondary} ${styles.btnIcon} ${styles.btnAction}`}
                      onClick={() => setWithdrawalModalOpen(true)}
                    >
                      Retirer
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Statistiques - Affichées dès le chargement avec valeurs par défaut */}
            <div className={`${styles.card} ${styles.statsCard}`}>
              <div className={styles.cardHeader}>
                <div className={styles.titleWithIconEnd}>
                  <img src={statistique} className={styles.statImg}/>
                  <h3>Statistiques {statsLoading && '⏳'}</h3>
                </div>
              </div>
              <div className={styles.statsGrid}>
                <div className={styles.statItem}>
                  <div className={styles.statIcon}>📈</div>
                  <div className={styles.statContent}>
                    <div className={`${styles.statValue} ${styles.primary}`}>
                      {stats ? formatAmount(stats.today.sent + stats.today.received) : '0,00'} 🪙
                    </div>
                    <div className={styles.statLabel}>Aujourd'hui</div>
                  </div>
                </div>
                <div className={styles.statItem}>
                  <div className={styles.statIcon}>📅</div>
                  <div className={styles.statContent}>
                    <div className={styles.statValue}>
                      {stats ? formatAmount(stats.monthly.sent + stats.monthly.received) : '0,00'} 🪙
                    </div>
                    <div className={styles.statLabel}>Ce mois</div>
                  </div>
                </div>
                <div className={styles.statItem}>
                  <div className={styles.statIcon}>🔄</div>
                  <div className={styles.statContent}>
                    <div className={styles.statValue}>{stats ? stats.allTime.transactions : 0}</div>
                    <div className={styles.statLabel}>Transactions</div>
                  </div>
                </div>
                <div className={styles.statItem}>
                  <div className={styles.statIcon}>💸</div>
                  <div className={styles.statContent}>
                    <div className={styles.statValue}>{stats ? formatAmount(stats.allTime.fees) : '0,00'} 🪙</div>
                    <div className={styles.statLabel}>Frais totaux</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Dernières transactions */}
            <div className={`${styles.card} ${styles.recentTransactions}`}>
              <div className={styles.cardHeader}>
                <div className={styles.titleWithIconEnd}>
                  <img src={transaction} className={styles.recentTransactionIcon}/>
                  <h3>Dernières Transactions {transactionsLoading && '⏳'}</h3>
                </div>
                <button 
                  className={styles.btnText}
                  onClick={() => setActiveTab('transactions')}
                >
                  Voir tout →
                </button>
              </div>

              {transactions.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>📄</div>
                  <h4>Aucune transaction</h4>
                  <p>Commencez par effectuer votre première transaction</p>
                  <button 
                    className={`${styles.btn} ${styles.btnPrimary}`}
                    onClick={() => setTransferModalOpen(true)}
                  >
                    Faire une transaction
                  </button>
                </div>
              ) : (
                <div className={styles.transactionsList}>
                  {filteredTransactions.slice(0, 5).map((transaction) => {
                    const details = getTransactionDetails(transaction);
                    return (
                      <div key={transaction.id} className={styles.transactionItem}>
                        <div className={styles.transactionIcon}>📄</div>
                        <div className={styles.transactionMain}>
                          <div className={styles.transactionDesc}>
                            {details.description}
                          </div>
                          <div className={styles.transactionMeta}>
                            {formatDate(transaction.createdAt)}
                            <span className={details.type === 'sortant' ? styles.outgoingBadge : styles.incomingBadge}>
                              {details.direction}
                            </span>
                          </div>
                        </div>
                        <div className={`${styles.transactionAmount} ${details.amountColor}`}>
                          {details.amountSign}{formatAmount(transaction.amount)} 🪙
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3>📋 Historique des Transactions</h3>
            <div className={styles.filterButtons}>
              <button 
                className={`${styles.filterBtn} ${transactionFilter === 'all' ? styles.active : ''}`}
                onClick={() => setTransactionFilter('all')}
              >
                Toutes
              </button>
              <button 
                className={`${styles.filterBtn} ${transactionFilter === 'incoming' ? styles.active : ''}`}
                onClick={() => setTransactionFilter('incoming')}
              >
                Entrantes
              </button>
              <button 
                className={`${styles.filterBtn} ${transactionFilter === 'outgoing' ? styles.active : ''}`}
                onClick={() => setTransactionFilter('outgoing')}
              >
                Sortantes
              </button>
            </div>
          </div>

          {filteredTransactions.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                {transactionFilter === 'incoming' ? '📥' : 
                transactionFilter === 'outgoing' ? '📤' : '📄'}
              </div>
              <h4>
                {transactionFilter === 'incoming' ? 'Aucune transaction entrante' :
                transactionFilter === 'outgoing' ? 'Aucune transaction sortante' :
                'Aucune transaction'}
              </h4>
              <p>
                {transactionFilter === 'incoming' ? 
                  'Les transactions entrantes apparaîtront ici lorsque d\'autres utilisateurs vous enverront des fonds' :
                transactionFilter === 'outgoing' ? 
                  'Commencez par effectuer votre première transaction' :
                  'Commencez par effectuer votre première transaction'}
              </p>
              {transactionFilter !== 'incoming' && (
                <button 
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  onClick={() => setTransferModalOpen(true)}
                >
                  Faire une transaction
                </button>
              )}
            </div>
          ) : (
            <div className={styles.tableContainer}>
              <table className={styles.transactionsTable}>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Utilisateur</th>
                    <th>Description</th>
                    <th>Wallet</th>
                    <th className={styles.textCenter}>Montant</th>
                    <th className={styles.textCenter}>Date</th>
                    <th className={styles.textCenter}>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((transaction) => {
                    const details = getTransactionDetails(transaction);
                    return (
                      <tr key={transaction.id} className={styles.tableRow}>
                        <td className={styles.textCenter}>
                          <div className={styles.transactionType}>
                            <span className={styles.typeIcon}>
                              {getTransactionTypeIcon(transaction.transactionType)}
                            </span>
                            <span className={styles.typeLabel}>
                              {transaction.transactionType.replace('_', ' ').toLowerCase()}
                            </span>
                          </div>
                        </td>
                        <td className={styles.textCenter}>
                          <div className={styles.transactionUser}>
                            {details.userName ? (
                              <div className={styles.userName}>
                                {details.userName}
                              </div>
                            ) : (
                              <div className={styles.noUser}>
                                -
                              </div>
                            )}
                          </div>
                        </td>
                        <td className={styles.textCenter}>
                          <div className={styles.transactionDesc}>
                            {transaction.description || 
                            transaction.transactionType.replace('_', ' ').toLowerCase() || 
                            'Aucune description'}
                            {/* Bouton pour voir le cours si c'est un booking */}
                            {details.type === 'booking' && details.bookingId !== undefined && (
                              <button 
                                className={styles.viewCourseBtn}
                                onClick={() => {
                                  setSelectedBooking({
                                    bookingId: details.bookingId,
                                    tutorName: details.userName,
                                    tutorId: details.tutorId,
                                    amount: transaction.amount,
                                    transactionDate: transaction.createdAt,
                                    description: transaction.description,
                                    metadata: transaction.metadata
                                  });
                                  setBookingDetailsOpen(true);
                                }}
                                title="Voir les détails du cours"
                              >
                                📚 Voir le cours
                              </button>
                            )}
                          </div>
                        </td>
                        <td className={styles.textCenter}>
                          <div className={styles.walletCell}>
                            {details.walletAddress ? (
                              <div className={styles.walletAddress} title={details.walletAddress}>
                                {shortenAddress(details.walletAddress)}
                              </div>
                            ) : (
                              <div className={styles.noWallet}>
                                -
                              </div>
                            )}
                          </div>
                        </td>
                        <td className={styles.textCenter}>
                          <div className={`${styles.amount} ${details.amountColor}`}>
                            {details.amountSign}{formatAmount(transaction.amount)} 🪙
                          </div>
                          {transaction.fee > 0 && (
                            <div className={styles.fee}>
                              Frais: {formatAmount(transaction.fee)} 🪙
                            </div>
                          )}
                        </td>
                        <td className={styles.textCenter}>
                          <div className={styles.transactionDate}>
                            {formatDate(transaction.createdAt)}
                          </div>
                        </td>
                        <td className={styles.textCenter}>
                          <span className={`${styles.status} ${getStatusColor(transaction.status)}`}>
                            {transaction.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

        {/* Onglet Transfert */}
        {activeTab === 'transfer' && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h3>🔄 Effectuer un Transfert</h3>
              <div className={styles.balancePreview}>
                Solde disponible: <strong>{balance ? formatAmount(balance.wallet.available) : '0'} 🪙</strong>
              </div>
            </div>
            <div className={styles.transferForm}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Adresse du wallet destinataire</label>
                  <input
                    type="text"
                    value={transferData.toWalletAddress}
                    onChange={(e) => handleTransferChange('toWalletAddress', e.target.value)}
                    placeholder="Ex: a1b2c3d4e5f6..."
                    className={styles.formInput}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Montant (🪙)</label>
                  <input
                    type="number"
                    value={transferData.amount}
                    onChange={(e) => handleTransferChange('amount', parseFloat(e.target.value) || 0)}
                    className={styles.formInput}
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Description (optionnel)</label>
                <textarea
                  value={transferData.description}
                  onChange={(e) => handleTransferChange('description', e.target.value)}
                  rows={3}
                  className={styles.formTextarea}
                  placeholder="Description de la transaction..."
                />
              </div>
              <div className={styles.formActions}>
                <button 
                  onClick={handleTransfer}
                  className={`${styles.btn} ${styles.btnPrimary} ${styles.btnLarge}`}
                  disabled={loading || !transferData.toWalletAddress || !transferData.amount}
                >
                  {loading ? (
                    <>
                      <div className={styles.spinnerSmall}></div>
                      Transfert en cours...
                    </>
                  ) : (
                    'Effectuer le transfert'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de transfert */}
      {transferModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>🔄 Transférer des crédits</h3>
              <button onClick={() => setTransferModalOpen(false)} className={styles.closeBtn}>×</button>
            </div>
            <div className={styles.modalContent}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Adresse du wallet destinataire</label>
                <input
                  type="text"
                  value={transferData.toWalletAddress}
                  onChange={(e) => handleTransferChange('toWalletAddress', e.target.value)}
                  placeholder="Ex: a1b2c3d4e5f6..."
                  className={styles.formInput}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Montant (🪙)</label>
                <input
                  type="number"
                  value={transferData.amount}
                  onChange={(e) => handleTransferChange('amount', parseFloat(e.target.value) || 0)}
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  className={styles.formInput}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Description (optionnel)</label>
                <textarea
                  value={transferData.description}
                  onChange={(e) => handleTransferChange('description', e.target.value)}
                  rows={3}
                  className={styles.formTextarea}
                  placeholder="Description de la transaction..."
                />
              </div>
            </div>
            <div className={styles.modalActions}>
              <button 
                onClick={() => setTransferModalOpen(false)}
                className={`${styles.btn} ${styles.btnSecondary}`}
              >
                Annuler
              </button>
              <button 
                onClick={handleTransfer}
                className={`${styles.btn} ${styles.btnPrimary}`}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className={styles.spinnerSmall}></div>
                    Transfert...
                  </>
                ) : (
                  'Transférer'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de retrait */}
      {withdrawalModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>💳 Demander un retrait</h3>
              <button onClick={() => setWithdrawalModalOpen(false)} className={styles.closeBtn}>×</button>
            </div>
            <div className={styles.modalContent}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Montant à retirer (🪙)</label>
                <input
                  type="number"
                  value={withdrawalData.amount}
                  onChange={(e) => handleWithdrawalChange('amount', parseFloat(e.target.value) || 0)}
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  className={styles.formInput}
                />
              </div>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Titulaire du compte</label>
                  <input
                    type="text"
                    value={withdrawalData.bankDetails.accountHolder}
                    onChange={(e) => handleWithdrawalChange('accountHolder', e.target.value)}
                    className={styles.formInput}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>IBAN</label>
                  <input
                    type="text"
                    value={withdrawalData.bankDetails.iban}
                    onChange={(e) => handleWithdrawalChange('iban', e.target.value)}
                    placeholder="FR76 XXXX XXXX XXXX XXXX XXXX XXX"
                    className={styles.formInput}
                  />
                </div>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Nom de la banque</label>
                <input
                  type="text"
                  value={withdrawalData.bankDetails.bankName}
                  onChange={(e) => handleWithdrawalChange('bankName', e.target.value)}
                  className={styles.formInput}
                />
              </div>
            </div>
            <div className={styles.modalActions}>
              <button 
                onClick={() => setWithdrawalModalOpen(false)}
                className={`${styles.btn} ${styles.btnSecondary}`}
              >
                Annuler
              </button>
              <button 
                onClick={handleWithdrawal}
                className={`${styles.btn} ${styles.btnPrimary}`}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className={styles.spinnerSmall}></div>
                    Traitement...
                  </>
                ) : (
                  'Demander le retrait'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal détails du booking */}
      {bookingDetailsOpen && selectedBooking && (
        <div className={styles.modalOverlay} onClick={() => setBookingDetailsOpen(false)}>
          <div className={styles.bookingModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.bookingModalHeader}>
              <h2>Détails de la réservation</h2>
              <button 
                className={styles.closeBookingBtn}
                onClick={() => setBookingDetailsOpen(false)}
                title="Fermer"
              >
                ✕
              </button>
            </div>
            <div className={styles.bookingModalContent}>
              <div className={styles.bookingInfoRow}>
                <span className={styles.bookingLabel}>Tuteur:</span>
                <span className={styles.bookingValue}>{selectedBooking.tutorName}</span>
              </div>
              
              <div className={styles.bookingInfoRow}>
                <span className={styles.bookingLabel}>Cours:</span>
                <span className={styles.bookingValue}>{selectedBooking.description || 'Session de tutorat'}</span>
              </div>
              
              <div className={styles.bookingInfoRow}>
                <span className={styles.bookingLabel}>Montant:</span>
                <span className={`${styles.bookingValue} ${styles.bookingAmount}`}>
                  {selectedBooking.amount.toFixed(2)} EDU
                </span>
              </div>
              
              <div className={styles.bookingInfoRow}>
                <span className={styles.bookingLabel}>Date de réservation:</span>
                <span className={styles.bookingValue}>
                  {new Date(selectedBooking.transactionDate).toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>

              {selectedBooking.metadata?.startTime && (
                <div className={styles.bookingInfoRow}>
                  <span className={styles.bookingLabel}>Date du cours:</span>
                  <span className={styles.bookingValue}>
                    {new Date(selectedBooking.metadata.startTime * 1000).toLocaleDateString('fr-FR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              )}

              {selectedBooking.metadata?.duration && (
                <div className={styles.bookingInfoRow}>
                  <span className={styles.bookingLabel}>Durée:</span>
                  <span className={styles.bookingValue}>{selectedBooking.metadata.duration} minutes</span>
                </div>
              )}

              <div className={styles.bookingInfoRow}>
                <span className={styles.bookingLabel}>Réservation ID:</span>
                <span className={styles.bookingValueSmall}>{selectedBooking.bookingId}</span>
              </div>
            </div>

            <div className={styles.bookingModalActions}>
              <button 
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={() => setBookingDetailsOpen(false)}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Blockchain;