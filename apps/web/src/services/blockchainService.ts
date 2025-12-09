import axios from 'axios';

const BLOCKCHAIN_BASE_URL = 'http://localhost:3003/api/blockchain';
const AUTH_BASE_URL = 'http://localhost:3001/api';

const blockchainApi = axios.create({
  baseURL: BLOCKCHAIN_BASE_URL,
});

// Instance pour le service d'authentification (port 3001)
const authApi = axios.create({
  baseURL: AUTH_BASE_URL,
});

// Intercepteur pour ajouter le token aux DEUX instances
const addAuthToken = (config: any) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
};

blockchainApi.interceptors.request.use(addAuthToken);
authApi.interceptors.request.use(addAuthToken);

// Fonction pour obtenir l'utilisateur connecté
const getCurrentUser = () => {
  try {
    const userStr = localStorage.getItem('user');
    console.log('👤 [blockchainService] Utilisateur stocké:', userStr);
    return userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    console.error('❌ [blockchainService] Erreur parsing utilisateur:', error);
    return null;
  }
};

export interface WalletBalance {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
  wallet: {
    available: number;
    locked: number;
    total: number;
    walletAddress: string;
    kycStatus: 'none' | 'pending' | 'verified' | 'rejected';
  };
}

export interface Transaction {
  id: string;
  fromWalletId?: string;
  toWalletId: string;
  amount: number;
  fee: number;
  transactionType: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  description?: string;
  metadata: any;
  createdAt: string;
  fromWallet?: {
    id: string;
    userId: string;
    walletAddress: string;
    user?: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
  };
  toWallet?: {
    id: string;
    userId: string;
    walletAddress: string;
    user?: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
  };
  ledgerBlock?: {
    id: string;
    hash: string;
    timestamp: string;
  };
}

export interface TransferRequest {
  toWalletAddress: string;
  amount: number;
  description?: string;
  metadata?: any;
}

export interface TransferResponse {
  success: boolean;
  transaction: Transaction;
  ledgerBlock: any;
  fromUser: {
    name: string;
    newBalance: number;
  };
  toUser: {
    name: string;
  };
}

export interface WithdrawalRequest {
  amount: number;
  bankDetails: {
    accountHolder: string;
    iban: string;
    bankName: string;
  };
}

export interface WithdrawalResponse {
  id: string;
  walletId: string;
  amount: number;
  fee: number;
  netAmount: number;
  status: string;
  createdAt: string;
}

export interface WalletStats {
  wallet: {
    available: number;
    locked: number;
    total: number;
    address: string;
    kycStatus: string;
  };
  today: {
    sent: number;
    received: number;
  };
  monthly: {
    sent: number;
    received: number;
  };
  allTime: {
    transactions: number;
    sent: number;
    received: number;
    fees: number;
  };
}

export interface TransactionHistory {
  transactions: Transaction[];
  total: number;
  page: number;
  totalPages: number;
}

export interface AuditReport {
  summary: {
    totalTransactions: number;
    totalCreditsSent: number;
    totalCreditsReceived: number;
    totalFees: number;
    period: {
      startDate: string;
      endDate: string;
    };
  };
  transactions: any[];
}

class BlockchainService {
  // Obtenir le solde du wallet et aussi les infos utilisateur en même temps
  async getBalance(): Promise<WalletBalance> {
    console.log('💰 [blockchainService] Récupération du solde...');
    const user = getCurrentUser();
    
    if (!user?.id) {
      console.error('❌ [blockchainService] Utilisateur non connecté');
      throw new Error('Utilisateur non connecté');
    }
    
    console.log(`🔍 [blockchainService] userId: ${user.id}`);
    
    try {
      const response = await blockchainApi.get(`/balance?userId=${user.id}`);
      console.log('✅ [blockchainService] Réponse balance reçue:', response.data);
      
      if (!response.data.success) {
        console.error('❌ [blockchainService] Le serveur a retourné success: false');
        throw new Error(response.data.message || 'Erreur lors de la récupération du solde');
      }
      
      const balanceData = response.data.data;
      console.log('📊 [blockchainService] Données balance:', balanceData);
      
      // Récupérer les infos complètes de l'utilisateur avec authApi
      try {
        console.log('👤 [blockchainService] Récupération infos utilisateur...');
        const userResponse = await authApi.get(`/users/${user.id}`);
        
        // Fusionner les données
        balanceData.user = {
          ...balanceData.user,
          firstName: userResponse.data.data.firstName,
          lastName: userResponse.data.data.lastName,
          role: userResponse.data.data.role
        };
        
        console.log('✅ [blockchainService] Infos utilisateur fusionnées');
      } catch (error) {
        console.warn('⚠️ [blockchainService] Impossible de récupérer les infos utilisateur détaillées:', error);
        // Valeurs par défaut
        balanceData.user = {
          ...balanceData.user,
          firstName: 'Utilisateur',
          lastName: '',
          role: 'user'
        };
      }
      
      return balanceData;
    } catch (error: any) {
      console.error('💥 [blockchainService] Erreur lors de getBalance:', error);
      
      if (error.response) {
        console.error('📡 [blockchainService] Détails erreur:', {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers
        });
      }
      
      throw new Error(error.response?.data?.message || error.message || 'Erreur lors de la récupération du solde');
    }
  }

  // Effectuer un transfert
  async transfer(transferData: TransferRequest): Promise<TransferResponse> {
    console.log('🔄 [blockchainService] Début du transfert...');
    console.log('📤 [blockchainService] Données de transfert:', transferData);
    
    const user = getCurrentUser();
    if (!user?.id) {
      console.error('❌ [blockchainService] Utilisateur non connecté pour transfert');
      throw new Error('Utilisateur non connecté');
    }

    console.log(`👤 [blockchainService] fromUserId: ${user.id}`);
    
    const payload = {
      ...transferData,
      fromUserId: user.id
    };

    console.log('📦 [blockchainService] Payload envoyé:', payload);

    try {
      const response = await blockchainApi.post('/transfer', payload);
      console.log('✅ [blockchainService] Réponse transfert reçue:', response.data);
      
      // VÉRIFICATION CRITIQUE : s'assurer que success est true
      if (!response.data.success) {
        console.error('❌ [blockchainService] Le serveur a retourné success: false');
        console.error('❌ [blockchainService] Message:', response.data.message);
        throw new Error(response.data.message || 'Erreur lors du transfert');
      }

      // Vérifier que les données sont présentes
      if (!response.data.data) {
        console.error('❌ [blockchainService] Pas de data dans la réponse');
        throw new Error('Réponse incomplète du serveur');
      }

      // Vérifier la présence des éléments critiques
      if (!response.data.data.transaction) {
        console.warn('⚠️ [blockchainService] Aucune transaction dans la réponse');
      }
      
      if (!response.data.data.ledgerBlock) {
        console.warn('⚠️ [blockchainService] Aucun bloc ledger dans la réponse');
      }

      console.log('🎉 [blockchainService] Transfert réussi!');
      return response.data;
    } catch (error: any) {
      console.error('💥 [blockchainService] Erreur lors du transfert:', error);
      
      // Log détaillé pour les erreurs axios
      if (error.response) {
        console.error('📡 [blockchainService] Détails erreur serveur:', {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers
        });
      } else if (error.request) {
        console.error('📡 [blockchainService] Pas de réponse du serveur:', error.request);
      } else {
        console.error('📡 [blockchainService] Erreur configuration:', error.message);
      }
      
      throw new Error(error.response?.data?.message || error.message || 'Erreur lors du transfert');
    }
  }

  // Obtenir l'historique des transactions
  async getHistory(options?: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    transactionType?: string;
  }): Promise<TransactionHistory> {
    console.log('📋 [blockchainService] Récupération historique...');
    
    const user = getCurrentUser();
    if (!user?.id) {
      console.error('❌ [blockchainService] Utilisateur non connecté pour historique');
      throw new Error('Utilisateur non connecté');
    }

    const params = new URLSearchParams();
    params.append('userId', user.id);
    
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.startDate) params.append('startDate', options.startDate);
    if (options?.endDate) params.append('endDate', options.endDate);
    if (options?.transactionType) params.append('transactionType', options.transactionType);

    console.log(`🔍 [blockchainService] Paramètres: ${params.toString()}`);

    try {
      const response = await blockchainApi.get(`/history?${params.toString()}`);
      console.log(`✅ [blockchainService] Historique reçu: ${response.data.data.transactions?.length || 0} transactions`);
      
      if (!response.data.success) {
        console.error('❌ [blockchainService] Le serveur a retourné success: false pour historique');
        throw new Error(response.data.message || 'Erreur lors de la récupération de l\'historique');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('💥 [blockchainService] Erreur lors de getHistory:', error);
      
      if (error.response) {
        console.error('📡 [blockchainService] Détails erreur:', {
          status: error.response.status,
          data: error.response.data
        });
      }
      
      throw new Error(error.response?.data?.message || error.message || 'Erreur lors de la récupération de l\'historique');
    }
  }

  // Demander un retrait
  async requestWithdrawal(withdrawalData: WithdrawalRequest): Promise<WithdrawalResponse> {
    console.log('🏧 [blockchainService] Demande de retrait...');
    
    const user = getCurrentUser();
    if (!user?.id) {
      console.error('❌ [blockchainService] Utilisateur non connecté pour retrait');
      throw new Error('Utilisateur non connecté');
    }

    // Pour le retrait, on a besoin du walletId
    console.log('💰 [blockchainService] Récupération du solde pour obtenir walletId...');
    const balance = await this.getBalance();
    const walletId = balance.wallet.walletAddress; // Utiliser l'adresse comme ID temporaire

    console.log(`🔑 [blockchainService] walletId: ${walletId}`);
    
    const payload = {
      ...withdrawalData,
      walletId: walletId
    };

    console.log('📦 [blockchainService] Payload retrait:', payload);

    try {
      const response = await blockchainApi.post('/withdrawal/request', payload);
      console.log('✅ [blockchainService] Réponse retrait reçue:', response.data);
      
      if (!response.data.success) {
        console.error('❌ [blockchainService] Le serveur a retourné success: false pour retrait');
        throw new Error(response.data.message || 'Erreur lors de la demande de retrait');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('💥 [blockchainService] Erreur lors de requestWithdrawal:', error);
      
      if (error.response) {
        console.error('📡 [blockchainService] Détails erreur:', {
          status: error.response.status,
          data: error.response.data
        });
      }
      
      throw new Error(error.response?.data?.message || error.message || 'Erreur lors de la demande de retrait');
    }
  }

  // Obtenir les statistiques du wallet
  async getStats(): Promise<WalletStats> {
    console.log('📊 [blockchainService] Récupération des statistiques...');
    
    const user = getCurrentUser();
    if (!user?.id) {
      console.error('❌ [blockchainService] Utilisateur non connecté pour stats');
      throw new Error('Utilisateur non connecté');
    }

    console.log(`🔍 [blockchainService] userId: ${user.id}`);

    try {
      const response = await blockchainApi.get(`/stats?userId=${user.id}`);
      console.log('✅ [blockchainService] Statistiques reçues');
      
      if (!response.data.success) {
        console.error('❌ [blockchainService] Le serveur a retourné success: false pour stats');
        throw new Error(response.data.message || 'Erreur lors de la récupération des statistiques');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('💥 [blockchainService] Erreur lors de getStats:', error);
      
      if (error.response) {
        console.error('📡 [blockchainService] Détails erreur:', {
          status: error.response.status,
          data: error.response.data
        });
      }
      
      throw new Error(error.response?.data?.message || error.message || 'Erreur lors de la récupération des statistiques');
    }
  }

  // Générer un rapport d'audit
  async generateAuditReport(startDate: string, endDate: string): Promise<AuditReport> {
    console.log('📄 [blockchainService] Génération rapport d\'audit...');
    console.log(`📅 [blockchainService] Période: ${startDate} -> ${endDate}`);
    
    const user = getCurrentUser();
    if (!user?.id) {
      console.error('❌ [blockchainService] Utilisateur non connecté pour audit');
      throw new Error('Utilisateur non connecté');
    }

    try {
      const response = await blockchainApi.get(`/audit?userId=${user.id}&startDate=${startDate}&endDate=${endDate}`);
      console.log('✅ [blockchainService] Rapport d\'audit reçu');
      
      if (!response.data.success) {
        console.error('❌ [blockchainService] Le serveur a retourné success: false pour audit');
        throw new Error(response.data.message || 'Erreur lors de la génération du rapport d\'audit');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('💥 [blockchainService] Erreur lors de generateAuditReport:', error);
      
      if (error.response) {
        console.error('📡 [blockchainService] Détails erreur:', {
          status: error.response.status,
          data: error.response.data
        });
      }
      
      throw new Error(error.response?.data?.message || error.message || 'Erreur lors de la génération du rapport d\'audit');
    }
  }

  // Créer un wallet (nouvelle méthode)
  async createWallet(): Promise<any> {
    console.log('🆕 [blockchainService] Création d\'un wallet...');
    
    const user = getCurrentUser();
    if (!user?.id) {
      console.error('❌ [blockchainService] Utilisateur non connecté pour création wallet');
      throw new Error('Utilisateur non connecté');
    }

    console.log(`👤 [blockchainService] userId pour création: ${user.id}`);

    try {
      const response = await blockchainApi.post('/wallet/create', { userId: user.id });
      console.log('✅ [blockchainService] Wallet créé:', response.data);
      
      if (!response.data.success) {
        console.error('❌ [blockchainService] Le serveur a retourné success: false pour création wallet');
        throw new Error(response.data.message || 'Erreur lors de la création du wallet');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('💥 [blockchainService] Erreur lors de createWallet:', error);
      
      if (error.response) {
        console.error('📡 [blockchainService] Détails erreur:', {
          status: error.response.status,
          data: error.response.data
        });
      }
      
      throw new Error(error.response?.data?.message || error.message || 'Erreur lors de la création du wallet');
    }
  }

  // Méthode pour tester la connexion au service blockchain
  async testConnection(): Promise<boolean> {
    console.log('🔗 [blockchainService] Test de connexion au service...');
    
    try {
      const response = await blockchainApi.get('/test');
      console.log('✅ [blockchainService] Service blockchain accessible:', response.data);
      return true;
    } catch (error) {
      console.error('❌ [blockchainService] Service blockchain inaccessible:', error);
      return false;
    }
  }

  // Méthode pour vérifier la santé du service
  async checkHealth(): Promise<any> {
    console.log('❤️ [blockchainService] Vérification santé du service...');
    
    try {
      const response = await axios.get('http://localhost:3003/health');
      console.log('✅ [blockchainService] Santé du service:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ [blockchainService] Erreur vérification santé:', error);
      throw error;
    }
  }
}

export default new BlockchainService();