export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'student' | 'tutor' | 'admin';
  isVerified: boolean;
}

export interface Wallet {
  id: string;
  userId: string;
  balanceCredits: number;
  balanceLocked: number;
  walletAddress: string;
  kycStatus: 'none' | 'pending' | 'verified' | 'rejected';
  dailyLimit: number;
  monthlyLimit: number;
  totalWithdrawn: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LedgerBlock {
  id: number;
  previousHash: string;
  timestamp: string;
  payload: any;
  hash: string;
  signature?: string;
  blockType: string;
  status: string;
  index: number;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionType {
  id: string;
  fromWalletId?: string;
  toWalletId: string;
  amount: number;
  fee: number;
  transactionType: 
    | 'TUTOR_SESSION'
    | 'CONTENT_PURCHASE'
    | 'WITHDRAWAL'
    | 'DEPOSIT'
    | 'REFERRAL_BONUS'
    | 'SYSTEM_REWARD'
    | 'EXCHANGE_SERVICE'
    | 'TRANSFER';
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  referenceLedgerId?: number;
  metadata: any;
  description?: string;
  sessionId?: string;
  contentId?: string;
  createdAt: string;
  updatedAt: string;
  fromWallet?: Wallet;
  toWallet?: Wallet;
  ledgerBlock?: LedgerBlock;
}

export interface WithdrawalRequestType {
  id: string;
  walletId: string;
  amount: number;
  fee: number;
  netAmount: number;
  targetCurrency: string;
  targetAmount?: number;
  bankDetails: any;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  conversionRate?: number;
  ledgerBlockId?: number;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
  wallet?: Wallet;
  ledgerBlock?: LedgerBlock;
}