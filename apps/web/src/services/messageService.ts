import api from './api';

export interface Conversation {
  _id: string;
  participants: Array<{
    userId: string;
    userType: string;
    firstName: string;
    lastName: string;
    profilePicture?: string;
    lastSeen: string;
  }>;
  lastMessage: {
    content: string;
    senderId: string;
    messageType: string;
    timestamp: string;
    readBy: string[];
  };
  unreadCount: number;
  updatedAt: string;
}

export interface Message {
  _id: string;
  conversationId: string;
  senderId: string;
  content: string;
  messageType: 'text' | 'image' | 'file' | 'system';
  mediaUrl?: string;
  fileName?: string;
  fileSize?: number;
  readBy: Array<{
    userId: string;
    readAt: string;
  }>;
  replyTo?: Message;
  reactions: Array<{
    userId: string;
    emoji: string;
    reactedAt: string;
  }>;
  status: 'sent' | 'delivered' | 'read';
  createdAt: string;
  updatedAt: string;
}

export interface MessageStats {
  totalConversations: number;
  totalUnread: number;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  profilePicture?: string;
}

class MessageService {
  private baseURL = import.meta.env.VITE_MESSAGE_SERVICE_URL || 'http://localhost:3002';

  // Démarrer une conversation
  async startConversation(recipientId: string) {
    const response = await api.post(`${this.baseURL}/api/messages/conversations/start`, { 
      recipientId 
    });
    return response.data;
  }

  // Dans la classe MessageService, assurez-vous que markAsRead est correctement implémenté :
  async markAsRead(conversationId: string) {
    const response = await api.patch(
      `${this.baseURL}/api/messages/conversations/${conversationId}/read`
    );
    return response.data;
  }

  // Envoyer un message
  async sendMessage(conversationId: string, content: string, messageType = 'text', mediaUrl = null) {
    const response = await api.post(`${this.baseURL}/api/messages/messages/send`, {
      conversationId,
      content,
      messageType,
      mediaUrl
    });
    return response.data;
  }

  // Récupérer les conversations
  async getConversations(page = 1, limit = 50) {
    const response = await api.get(
      `${this.baseURL}/api/messages/conversations?page=${page}&limit=${limit}`
    );
    return response.data;
  }

  // Récupérer les messages d'une conversation
  async getMessages(conversationId: string, page = 1, limit = 100) {
    const response = await api.get(
      `${this.baseURL}/api/messages/conversations/${conversationId}/messages?page=${page}&limit=${limit}`
    );
    return response.data;
  }

  // Rechercher des utilisateurs
  async searchUsers(query: string) {
    const response = await api.get(
      `${this.baseURL}/api/messages/search/users?query=${encodeURIComponent(query)}`
    );
    return response.data;
  }

  // Récupérer tous les utilisateurs
  async getAllUsers() {
    const response = await api.get(
      `${this.baseURL}/api/messages/users/all`
    );
    return response.data;
  }

  // Dans messageService.ts - AJOUTER cette méthode
  async getTutorProfileByUserId(userId: string) {
    try {
      const response = await api.get(`/profile/tutor/byUser/${userId}`);
      return response.data;
    } catch (error: any) {
      console.error('Erreur récupération profil tuteur:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Erreur lors de la récupération du profil'
      };
    }
  }

  // Dans messageService.ts - AJOUTER
  async uploadFile(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post(`${this.baseURL}/api/messages/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  
  return response.data.url;
}

  // Rechercher des messages
  async searchMessages(query: string) {
    const response = await api.get(
      `${this.baseURL}/api/messages/search/messages?query=${encodeURIComponent(query)}`
    );
    return response.data;
  }

  // Récupérer les statistiques
  async getStats() {
    const response = await api.get(`${this.baseURL}/api/messages/stats`);
    return response.data;
  }

  // Supprimer une conversation
  async deleteConversation(conversationId: string) {
    const response = await api.delete(
      `${this.baseURL}/api/messages/conversations/${conversationId}`
    );
    return response.data;
  }

  // Tester la connexion au backend
  async testConnection() {
    try {
      const response = await api.get(`${this.baseURL}/api/messages/health`);
      return response.data;
    } catch (error) {
      throw new Error('Service de messages non disponible');
    }
  }
}

export default new MessageService();