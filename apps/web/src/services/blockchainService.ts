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
    return userStr ? JSON.parse(userStr) : null;
  } catch {
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
    const user = getCurrentUser();
    if (!user?.id) {
      throw new Error('Utilisateur non connecté');
    }
    
    const response = await blockchainApi.get(`/balance?userId=${user.id}`);
    const balanceData = response.data.data;
    
    // Récupérer les infos complètes de l'utilisateur avec authApi
    try {
      const userResponse = await authApi.get(`/users/${user.id}`);
      
      // Fusionner les données
      balanceData.user = {
        ...balanceData.user,
        firstName: userResponse.data.data.firstName,
        lastName: userResponse.data.data.lastName,
        role: userResponse.data.data.role
      };
    } catch (error) {
      console.warn('Impossible de récupérer les infos utilisateur détaillées:', error);
      // Valeurs par défaut
      balanceData.user = {
        ...balanceData.user,
        firstName: 'Utilisateur',
        lastName: '',
        role: 'user'
      };
    }
    
    return balanceData;
  }

  // Effectuer un transfert
  async transfer(transferData: TransferRequest): Promise<TransferResponse> {
    const user = getCurrentUser();
    if (!user?.id) {
      throw new Error('Utilisateur non connecté');
    }

    const payload = {
      ...transferData,
      fromUserId: user.id
    };

    const response = await blockchainApi.post('/transfer', payload);
    return response.data.data;
  }

  // Obtenir l'historique des transactions
  async getHistory(options?: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    transactionType?: string;
  }): Promise<TransactionHistory> {
    const user = getCurrentUser();
    if (!user?.id) {
      throw new Error('Utilisateur non connecté');
    }

    const params = new URLSearchParams();
    params.append('userId', user.id);
    
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.startDate) params.append('startDate', options.startDate);
    if (options?.endDate) params.append('endDate', options.endDate);
    if (options?.transactionType) params.append('transactionType', options.transactionType);

    const response = await blockchainApi.get(`/history?${params.toString()}`);
    return response.data.data;
  }

  // Demander un retrait
  async requestWithdrawal(withdrawalData: WithdrawalRequest): Promise<WithdrawalResponse> {
    const user = getCurrentUser();
    if (!user?.id) {
      throw new Error('Utilisateur non connecté');
    }

    // Pour le retrait, on a besoin du walletId
    const balance = await this.getBalance();
    const walletId = balance.wallet.walletAddress; // Utiliser l'adresse comme ID temporaire

    const payload = {
      ...withdrawalData,
      walletId: walletId
    };

    const response = await blockchainApi.post('/withdrawal/request', payload);
    return response.data.data;
  }

  // Obtenir les statistiques du wallet
  async getStats(): Promise<WalletStats> {
    const user = getCurrentUser();
    if (!user?.id) {
      throw new Error('Utilisateur non connecté');
    }

    const response = await blockchainApi.get(`/stats?userId=${user.id}`);
    return response.data.data;
  }

  // Générer un rapport d'audit
  async generateAuditReport(startDate: string, endDate: string): Promise<AuditReport> {
    const user = getCurrentUser();
    if (!user?.id) {
      throw new Error('Utilisateur non connecté');
    }

    const response = await blockchainApi.get(`/audit?userId=${user.id}&startDate=${startDate}&endDate=${endDate}`);
    return response.data.data;
  }

  // Créer un wallet (nouvelle méthode)
  async createWallet(): Promise<any> {
    const user = getCurrentUser();
    if (!user?.id) {
      throw new Error('Utilisateur non connecté');
    }

    const response = await blockchainApi.post('/wallet/create', { userId: user.id });
    return response.data.data;
  }
}

export default new BlockchainService();