const messageService = require('../services/messageService');
const userService = require('../services/userService');
const postgresService = require('../services/postgresService');

class MessageController {
  
  // Démarrer une nouvelle conversation
  // Dans MessageController.startConversation()
  async startConversation(req, res) {
    try {
      console.log("\n===================== START CONVERSATION =====================");

      const { recipientId } = req.body;
      const currentUser = req.user;

      console.log("➡️ Données reçues dans body:", req.body);
      console.log("➡️ recipientId reçu:", recipientId);
      console.log("➡️ currentUser:", currentUser);

      // Vérifier que recipientId est différent de currentUser.id
      if (recipientId === currentUser.id) {
        return res.status(400).json({
          success: false,
          message: "Vous ne pouvez pas démarrer une conversation avec vous-même"
        });
      }

      // Récupérer les informations du destinataire
      console.log("📡 Récupération des infos du destinataire...");
      const recipientInfo = await userService.getUserById(recipientId);
      
      if (!recipientInfo) {
        return res.status(404).json({
          success: false,
          message: "Utilisateur destinataire non trouvé"
        });
      }

      console.log("📥 recipientInfo reçu:", recipientInfo);

      // Préparer les participants avec les bonnes informations
      const participants = [
        {
          userId: currentUser.id,
          userType: currentUser.role,
          firstName: currentUser.firstName,
          lastName: currentUser.lastName
        },
        {
          userId: recipientId,
          userType: recipientInfo.userType,
          firstName: recipientInfo.firstName,
          lastName: recipientInfo.lastName
        }
      ];

      console.log("👥 Participants envoyés à messageService:", participants);

      const conversation = await messageService.getOrCreateConversation(participants);

      console.log("✅ Conversation créée avec succès");

      res.json({
        success: true,
        message: "Conversation créée avec succès",
        data: conversation
      });

    } catch (error) {
      console.error("❌ ERREUR startConversation:", error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Envoyer un message
  async sendMessage(req, res) {
    try {
      const { conversationId, content, messageType, mediaUrl } = req.body;
      const currentUser = req.user;

      const message = await messageService.sendMessage(
        conversationId, 
        currentUser.id, 
        content, 
        messageType, 
        mediaUrl
      );

      res.json({
        success: true,
        message: 'Message envoyé avec succès',
        data: message
      });
    } catch (error) {
      console.error('Erreur envoi message:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Récupérer les conversations
  async getConversations(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const currentUser = req.user;

      const conversations = await messageService.getUserConversations(
        currentUser.id, 
        parseInt(page), 
        parseInt(limit)
      );

      res.json({
        success: true,
        message: 'Conversations récupérées avec succès',
        data: conversations
      });
    } catch (error) {
      console.error('Erreur récupération conversations:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Récupérer les messages d'une conversation
  async getMessages(req, res) {
    try {
      const { conversationId } = req.params;
      const { page = 1, limit = 50 } = req.query;
      const currentUser = req.user;

      const messages = await messageService.getConversationMessages(
        conversationId,
        currentUser.id,
        parseInt(page),
        parseInt(limit)
      );

      res.json({
        success: true,
        message: 'Messages récupérés avec succès',
        data: messages
      });
    } catch (error) {
      console.error('Erreur récupération messages:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Marquer les messages comme lus
  async markAsRead(req, res) {
    try {
      const { conversationId } = req.params;
      const currentUser = req.user;

      await messageService.markMessagesAsRead(conversationId, currentUser.id);

      res.json({
        success: true,
        message: 'Messages marqués comme lus'
      });
    } catch (error) {
      console.error('Erreur marquage messages:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Rechercher des utilisateurs
  async searchUsers(req, res) {
    try {
      let query = req.query.query || '';
      if (typeof query !== 'string') query = String(query);

      if (!query.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Le paramètre query est obligatoire'
        });
      }

      const currentUser = req.user;
      const users = await userService.searchUsers(query, currentUser.id);

      res.json({
        success: true,
        message: 'Utilisateurs trouvés avec succès',
        data: users
      });
    } catch (error) {
      console.error('Erreur recherche utilisateurs:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Récupérer tous les utilisateurs
  async getAllUsers(req, res) {
    try {
      const currentUser = req.user;
      
      // Récupérer tous les utilisateurs depuis PostgreSQL
      const users = await postgresService.getAllUsers(currentUser.id);

      res.json({
        success: true,
        message: 'Utilisateurs récupérés avec succès',
        data: users
      });
    } catch (error) {
      console.error('Erreur récupération utilisateurs:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Rechercher dans les messages
  async searchMessages(req, res) {
    try {
      const { query } = req.query;
      const currentUser = req.user;

      const messages = await messageService.searchMessages(currentUser.id, query);

      res.json({
        success: true,
        message: 'Messages trouvés avec succès',
        data: messages
      });
    } catch (error) {
      console.error('Erreur recherche messages:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Récupérer les statistiques
  async getStats(req, res) {
    try {
      const currentUser = req.user;

      const stats = await messageService.getMessageStats(currentUser.id);

      res.json({
        success: true,
        message: 'Statistiques récupérées avec succès',
        data: stats
      });
    } catch (error) {
      console.error('Erreur récupération statistiques:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Supprimer une conversation
  async deleteConversation(req, res) {
    try {
      const { conversationId } = req.params;
      const currentUser = req.user;

      await messageService.deleteConversation(conversationId, currentUser.id);

      res.json({
        success: true,
        message: 'Conversation supprimée avec succès'
      });
    } catch (error) {
      console.error('Erreur suppression conversation:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Marquer les messages comme lus
  async markAsRead(req, res) {
    try {
      const { conversationId } = req.params;
      const currentUser = req.user;

      await messageService.markMessagesAsRead(conversationId, currentUser.id);

      res.json({
        success: true,
        message: 'Messages marqués comme lus'
      });
    } catch (error) {
      console.error('Erreur marquage messages:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = new MessageController();