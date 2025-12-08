const messageService = require('../services/messageService');
const userService = require('../services/userService');
const postgresService = require('../services/postgresService');
const mongoose = require('mongoose');
const { Readable } = require('stream');
const { Message } = require('../models/Message');


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


  async editMessage(req, res) {
      try {
          const { messageId } = req.params;
          const { content } = req.body;
          const currentUser = req.user;

          const message = await messageService.getMessageById(messageId);

          if (!message) {
              return res.status(404).json({
                  success: false,
                  message: 'Message non trouvé'
              });
          }

          if (message.senderId !== currentUser.id) {
              return res.status(403).json({
                  success: false,
                  message: 'Vous ne pouvez modifier que vos propres messages'
              });
          }

          // Mettre à jour le message
          message.content = content;
          message.edited = true;
          message.editedAt = new Date();
          await message.save();

          // ✅ Mettre à jour le lastMessage de la conversation si c'est le dernier message
          const conversation = await messageService.getConversationById(message.conversationId);
          
          // Vérifier si ce message est le dernier de la conversation
          const lastMessage = await Message.findOne({
              conversationId: message.conversationId
          }).sort({ createdAt: -1 }).limit(1);
          
          if (lastMessage && lastMessage._id.toString() === message._id.toString()) {
              await messageService.updateConversationLastMessage(
                  message.conversationId,
                  message
              );
          }

          res.json({
              success: true,
              message: 'Message modifié avec succès',
              data: message
          });
      } catch (error) {
          console.error('Erreur modification message:', error);
          res.status(500).json({
              success: false,
              message: 'Erreur serveur'
          });
      }
  }

  async deleteMessage(req, res) {
      try {
          const { messageId } = req.params;
          const currentUser = req.user;

          console.log(`🗑️ Tentative de suppression du message ${messageId} par ${currentUser.id}`);

          const message = await messageService.getMessageById(messageId);

          if (!message) {
              console.log('❌ Message non trouvé');
              return res.status(404).json({
                  success: false,
                  message: 'Message non trouvé'
              });
          }

          console.log(`📝 Message trouvé: sender=${message.senderId}, currentUser=${currentUser.id}`);

          if (message.senderId !== currentUser.id) {
              console.log('❌ Tentative de suppression non autorisée');
              return res.status(403).json({
                  success: false,
                  message: 'Vous ne pouvez supprimer que vos propres messages'
              });
          }

          // Sauvegarder les données importantes avant modification
          const conversationId = message.conversationId;
          const originalContent = message.content;
          
          console.log(`📋 Données originales: convId=${conversationId}, content=${originalContent}`);

          // Marquer le message comme supprimé
          message.content = 'Message supprimé';
          message.messageType = 'system';
          message.mediaUrl = undefined;
          await message.save();

          console.log('✅ Message marqué comme supprimé');

          // Mettre à jour le lastMessage de la conversation
          try {
              const conversation = await messageService.getConversationById(conversationId);
              
              if (conversation) {
                  console.log(`🔄 Vérification si le message est le dernier...`);
                  
                  // Trouver le dernier message réel (non supprimé)
                  const lastMessage = await Message.findOne({
                      conversationId: conversationId,
                      messageType: { $ne: 'system' } // Ne pas prendre les messages supprimés
                  }).sort({ createdAt: -1 }).limit(1);
                  
                  console.log(`📨 Dernier message non supprimé trouvé:`, lastMessage ? lastMessage._id : 'Aucun');
                  
                  if (lastMessage) {
                      // Mettre à jour la conversation avec le vrai dernier message
                      conversation.lastMessage = {
                          content: lastMessage.content,
                          senderId: lastMessage.senderId,
                          messageType: lastMessage.messageType,
                          timestamp: lastMessage.createdAt || new Date(),
                          readBy: lastMessage.readBy || []
                      };
                  } else {
                      // Si tous les messages sont supprimés
                      conversation.lastMessage = {
                          content: 'Aucun message',
                          senderId: currentUser.id,
                          messageType: 'system',
                          timestamp: new Date(),
                          readBy: []
                      };
                  }
                  
                  conversation.updatedAt = new Date();
                  await conversation.save();
                  console.log('✅ Conversation mise à jour');
              }
          } catch (convError) {
              console.error('⚠️ Erreur lors de la mise à jour de la conversation:', convError.message);
              // Ne pas échouer la suppression à cause de cette erreur
          }

          res.json({
              success: true,
              message: 'Message supprimé avec succès'
          });
      } catch (error) {
          console.error('❌ ERREUR suppression message:', error);
          console.error('Stack trace:', error.stack);
          res.status(500).json({
              success: false,
              message: 'Erreur serveur lors de la suppression'
          });
      }
  }


  // Et dans messageService.js, ajoutez cette méthode
  async getMessageById(messageId) {
    try {
      const message = await Message.findById(messageId);
      if (!message) {
        throw new Error('Message non trouvé');
      }
      return message;
    } catch (error) {
      throw new Error(`Erreur lors de la récupération du message: ${error.message}`);
    }
  }


  async uploadFile(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Aucun fichier envoyé',
        });
      }

      const bucket = new mongoose.mongo.GridFSBucket(
        mongoose.connection.db,
        { bucketName: 'uploads' }
      );

      const filename = `${Date.now()}-${req.file.originalname}`;

      const readableStream = new Readable();
      readableStream.push(req.file.buffer);
      readableStream.push(null);

      const uploadStream = bucket.openUploadStream(filename, {
        contentType: req.file.mimetype,
      });

      readableStream.pipe(uploadStream);

      uploadStream.on('finish', () => {
        const fileUrl = `${req.protocol}://${req.get('host')}/api/messages/file/${filename}`;

        res.json({
          success: true,
          url: fileUrl,
          filename,
          fileId: uploadStream.id,
        });
      });

      uploadStream.on('error', (error) => {
        console.error(error);
        res.status(500).json({
          success: false,
          message: 'Erreur upload fichier',
        });
      });

    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        message: 'Erreur upload fichier',
      });
    }
  }



}

module.exports = new MessageController();