// frontend/services/bookingService.ts
import axios from 'axios';

const BOOKING_BASE =
  (import.meta.env.VITE_BOOKING_API_URL as string) ||
  (import.meta.env.VITE_BOOKING_API as string) ||
  'http://localhost:3010/api/booking';

const client = axios.create({
  baseURL: BOOKING_BASE,
  timeout: 10000
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

export interface CreateBookingData {
  tutorId: string;
  annonceId: string;
  date: string;
  time: string;
  amount: number;
  duration?: number;
  description?: string;
  studentNotes?: string;
}

export interface Booking {
  id: string;
  tutorId: string;
  studentId: string;
  annonceId: string;
  date: string;
  time: string;
  duration: number;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  amount: number;
  transactionHash?: string;
  blockchainStatus: 'PENDING' | 'CONFIRMED' | 'FAILED' | 'CANCELLED';
  blockchainTransactionId?: string;
  description?: string;
  studentNotes?: string;
  tutorNotes?: string;
  cancelledBy?: string;
  cancellationReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookingStats {
  total: number;
  pending: number;
  confirmed: number;
  cancelled: number;
  completed: number;
  totalAmount: number;
  pendingAmount: number;
}

class BookingService {
  async createBooking(data: CreateBookingData) {
    try {
      const response = await client.post('/', data);
      return response.data;
    } catch (error: any) {
      console.error('Erreur création réservation:', error);
      throw new Error(error.response?.data?.message || 'Erreur lors de la création de la réservation');
    }
  }

  async confirmBooking(bookingId: string, tutorNotes?: string) {
    try {
      const response = await client.patch(`/${bookingId}/confirm`, { tutorNotes });
      return response.data;
    } catch (error: any) {
      console.error('Erreur confirmation réservation:', error);
      throw new Error(error.response?.data?.message || 'Erreur lors de la confirmation de la réservation');
    }
  }

  async cancelBooking(bookingId: string, reason?: string) {
    try {
      const response = await client.patch(`/${bookingId}/cancel`, { reason });
      return response.data;
    } catch (error: any) {
      console.error('Erreur annulation réservation:', error);
      throw new Error(error.response?.data?.message || 'Erreur lors de l\'annulation de la réservation');
    }
  }

  async completeBooking(bookingId: string) {
    try {
      const response = await client.patch(`/${bookingId}/complete`);
      return response.data;
    } catch (error: any) {
      console.error('Erreur complétion réservation:', error);
      throw new Error(error.response?.data?.message || 'Erreur lors de la complétion de la réservation');
    }
  }

  async getBookingsByUser(userId: string, filters?: { status?: string }) {
    try {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      
      const response = await client.get(`/user/${userId}?${params.toString()}`);
      return response.data;
    } catch (error: any) {
      console.error('Erreur getBookingsByUser:', error);
      throw new Error(error.response?.data?.message || 'Erreur lors de la récupération des réservations');
    }
  }

  async getBookingsByTutor(tutorId: string, filters?: { status?: string }) {
    try {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      
      const response = await client.get(`/tutor/${tutorId}?${params.toString()}`);
      return response.data;
    } catch (error: any) {
      console.error('Erreur getBookingsByTutor:', error);
      throw new Error(error.response?.data?.message || 'Erreur lors de la récupération des réservations du tuteur');
    }
  }

  async getBookingDetails(bookingId: string) {
    try {
      const response = await client.get(`/${bookingId}`);
      return response.data;
    } catch (error: any) {
      console.error('Erreur getBookingDetails:', error);
      throw new Error(error.response?.data?.message || 'Erreur lors de la récupération des détails de la réservation');
    }
  }

  async getBookingStats(userId: string) {
    try {
      const response = await client.get(`/${userId}/stats`);
      return response.data;
    } catch (error: any) {
      console.error('Erreur getBookingStats:', error);
      throw new Error(error.response?.data?.message || 'Erreur lors de la récupération des statistiques');
    }
  }

  // Méthode pour vérifier le solde avant de créer une réservation
  async checkBalanceBeforeBooking(amount: number): Promise<boolean> {
    try {
      const blockchainService = await import('./blockchainService');
      const balance = await blockchainService.default.getBalance();
      
      // Ajouter une marge pour les frais (1% + 5 crédits de sécurité)
      const requiredAmount = amount * 1.01 + 5;
      
      if (balance.wallet.available < requiredAmount) {
        throw new Error(`Solde insuffisant. Disponible: ${balance.wallet.available}, Requis: ${requiredAmount}`);
      }
      
      return true;
    } catch (error: any) {
      console.error('Erreur vérification solde:', error);
      throw error;
    }
  }

  async createBookingWithPending(data: CreateBookingData) {
    try {
      const response = await client.post('/', data);
      
      // Vérifier si la blockchain a échoué mais la réservation est créée
      if (response.data.warning || response.data.blockchainFailed) {
        console.warn('⚠️ Réservation créée mais blockchain échouée:', response.data.warning);
        // Vous pouvez choisir de notifier l'utilisateur ici
      }
      
      return response.data;
    } catch (error: any) {
      console.error('Erreur création réservation:', error);
      
      // Gestion spécifique des erreurs de solde insuffisant
      if (error.response?.status === 402 || error.message.includes('solde')) {
        throw new Error('Solde insuffisant. Veuillez recharger votre wallet.');
      }
      
      throw new Error(error.response?.data?.message || 'Erreur lors de la création de la réservation');
    }
  }
}

export default new BookingService();