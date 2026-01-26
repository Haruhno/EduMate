# app/models.py
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class BookingStatus(str, Enum):
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    CANCELLED = "CANCELLED"
    COMPLETED = "COMPLETED"
    DISPUTED = "DISPUTED"

class BlockchainStatus(str, Enum):
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"

class TransactionType(str, Enum):
    TUTOR_SESSION = "TUTOR_SESSION"
    CONTENT_PURCHASE = "CONTENT_PURCHASE"
    WITHDRAWAL = "WITHDRAWAL"
    DEPOSIT = "DEPOSIT"
    REFERRAL_BONUS = "REFERRAL_BONUS"
    SYSTEM_REWARD = "SYSTEM_REWARD"
    EXCHANGE_SERVICE = "EXCHANGE_SERVICE"

class TransactionStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

# Modèles pour la compatibilité frontend
class WalletBalance(BaseModel):
    user: dict
    wallet: dict

class Transaction(BaseModel):
    id: str
    fromWalletId: Optional[str] = None
    toWalletId: str
    amount: float
    fee: float = 0.0
    transactionType: str
    status: str
    description: Optional[str] = None
    metadata: dict = {}
    createdAt: str
    fromWallet: Optional[dict] = None
    toWallet: Optional[dict] = None
    ledgerBlock: Optional[dict] = None

class TransferRequest(BaseModel):
    toWalletAddress: str
    amount: float
    description: Optional[str] = None
    metadata: Optional[dict] = None

class TransferResponse(BaseModel):
    success: bool
    transaction: Optional[Transaction] = None
    ledgerBlock: Optional[dict] = None
    fromUser: Optional[dict] = None
    toUser: Optional[dict] = None

class WithdrawalRequest(BaseModel):
    amount: float
    bankDetails: dict

class WalletStats(BaseModel):
    wallet: dict
    today: dict
    monthly: dict
    allTime: dict

class TransactionHistory(BaseModel):
    transactions: List[Transaction]
    total: int
    page: int
    totalPages: int

class AuditReport(BaseModel):
    summary: dict
    transactions: List[dict]

# Modèles Booking
class CreateBookingData(BaseModel):
    tutorId: str
    annonceId: str
    date: str  # YYYY-MM-DD
    time: str  # HH:MM
    amount: float
    duration: Optional[int] = 60
    description: Optional[str] = None
    studentNotes: Optional[str] = None

class Booking(BaseModel):
    id: str
    tutorId: str
    studentId: str
    annonceId: str
    date: str
    time: str
    duration: int
    status: BookingStatus
    amount: float
    transactionHash: Optional[str] = None
    blockchainStatus: BlockchainStatus
    blockchainTransactionId: Optional[str] = None
    description: Optional[str] = None
    studentNotes: Optional[str] = None
    tutorNotes: Optional[str] = None
    cancelledBy: Optional[str] = None
    cancellationReason: Optional[str] = None
    createdAt: str
    updatedAt: str

class BookingStats(BaseModel):
    total: int
    pending: int
    confirmed: int
    cancelled: int
    completed: int
    totalAmount: float
    pendingAmount: float

# Modèles pour l'interaction blockchain
class BlockchainBooking(BaseModel):
    booking_id: int
    student_address: str
    tutor_address: str
    amount: int  # en wei
    start_time: int  # timestamp
    duration: int  # minutes
    status: int  # 0=PENDING, 1=CONFIRMED, etc.
    description: str

class BlockchainEscrow(BaseModel):
    booking_id: int
    amount: int
    student_address: str
    tutor_address: str
    funds_locked: bool
    funds_released: bool
    locked_at: int
    released_at: int

class UserAddressMap(BaseModel):
    """Mapping userId -> address blockchain"""
    user_id: str
    blockchain_address: str
    private_key: str  # chiffré
    created_at: datetime