// services/messageService.js
const { Conversation, Message } = require('../models/Message');
const userService = require('./userService'); // Service pour récupérer les infos utilisateur depuis PostgreSQL



class MessageService {
  
  async getMessageById(messageId) {
    return await Message.findById(messageId);
  }

  
  // Créer ou récupérer une conversation
  async getOrCreateConversation(participants) {
    try {
      console.log('[messageService] getOrCreateConversation appelé avec participants:', participants);
      
      // Trier les participants pour avoir un identifiant unique de conversation
      const sortedParticipants = participants.sort((a, b) => a.userId.localeCompare(b.userId));
      
      // Vérifier si la conversation existe déjà
      let conversation = await Conversation.findOne({
        'participants.userId': { $all: participants.map(p => p.userId) },
        isGroup: false
      });

      console.log('[messageService] Conversation existante:', conversation ? 'Oui' : 'Non');

      // Récupérer les infos utilisateur depuis PostgreSQL avec gestion d'erreur
      const participantsWithDetails = await Promise.all(
        participants.map(async (participant) => {
          try {
            const userInfo = await userService.getUserById(participant.userId);
            
            if (!userInfo) {
              console.warn(`[messageService] Utilisateur ${participant.userId} non trouvé - utilisation des données de base`);
              // Utiliser les données de base du participant
              return {
                userId: participant.userId,
                userType: participant.userType,
                firstName: participant.firstName || 'Utilisateur',
                lastName: participant.lastName || 'Inconnu',
                profilePicture: null,
                lastSeen: new Date()
              };
            }

            console.log(`[messageService] Infos utilisateur pour ${participant.userId}:`, userInfo.firstName, userInfo.lastName);

            return {
              userId: participant.userId,
              userType: userInfo.userType || participant.userType,
              firstName: userInfo.firstName,
              lastName: userInfo.lastName,
              profilePicture: userInfo.profilePicture || null,
              lastSeen: new Date()
            };
          } catch (error) {
            console.error(`[messageService] Erreur récupération infos pour ${participant.userId}:`, error.message);
            return {
              userId: participant.userId,
              userType: participant.userType,
              firstName: 'Utilisateur',
              lastName: 'Inconnu',
              profilePicture: null,
              lastSeen: new Date()
            };
          }
        })
      );

      if (!conversation) {
        console.log('[messageService] Création nouvelle conversation...');
        conversation = new Conversation({
          participants: participantsWithDetails,
          isGroup: false,
          lastMessage: {
            content: 'Conversation démarrée',
            senderId: participants[0].userId,
            messageType: 'system',
            timestamp: new Date(),
            readBy: participants.map(p => p.userId)
          }
        });

        await conversation.save();
        console.log('[messageService] Nouvelle conversation créée:', conversation._id);
      } else {
        console.log('[messageService] Mise à jour des participants de la conversation existante...');
        // Mettre à jour les participants avec leurs vrais noms et photos
        conversation.participants = participantsWithDetails;
        await conversation.save();
      }

      return conversation;
    } catch (error) {
      console.error('[messageService] Erreur getOrCreateConversation:', error);
      throw new Error(`Erreur lors de la création de la conversation: ${error.message}`);
    }
  } 

  // Envoyer un message
  async sendMessage(conversationId, senderId, content, messageType = 'text', mediaUrl = null) {
    try {
      const message = new Message({
        conversationId,
        senderId,
        content,
        messageType,
        mediaUrl,
        readBy: [{ userId: senderId, readAt: new Date() }]
      });

      await message.save();

      // Mettre à jour la dernière conversation
      await Conversation.findByIdAndUpdate(conversationId, {
        lastMessage: {
          content: messageType === 'text' ? content : `📎 ${messageType}`,
          senderId,
          messageType,
          timestamp: new Date(),
          readBy: [senderId]
        },
        updatedAt: new Date()
      });

      return message;
    } catch (error) {
      throw new Error(`Erreur lors de l'envoi du message: ${error.message}`);
    }
  }

  // Récupérer les conversations d'un utilisateur
  async getUserConversations(userId, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;
      
      const conversations = await Conversation.find({
        'participants.userId': userId
      })
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

      // Compter les messages non lus pour chaque conversation
      const conversationsWithUnread = await Promise.all(
        conversations.map(async (conversation) => {
          const unreadCount = await Message.countDocuments({
            conversationId: conversation._id,
            senderId: { $ne: userId },
            'readBy.userId': { $ne: userId }
          });

          return {
            ...conversation,
            unreadCount
          };
        })
      );

      return conversationsWithUnread;
    } catch (error) {
      throw new Error(`Erreur lors de la récupération des conversations: ${error.message}`);
    }
  }

  // Récupérer les messages d'une conversation
  async getConversationMessages(conversationId, userId, page = 1, limit = 50) {
    try {
      const skip = (page - 1) * limit;
      
      // Vérifier que l'utilisateur fait partie de la conversation
      const conversation = await Conversation.findOne({
        _id: conversationId,
        'participants.userId': userId
      });

      if (!conversation) {
        throw new Error('Conversation non trouvée ou accès non autorisé');
      }

      const messages = await Message.find({ conversationId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('replyTo')
        .lean();

      // Marquer les messages comme lus
      await this.markMessagesAsRead(conversationId, userId);

      return messages.reverse(); // Retourner du plus ancien au plus récent
    } catch (error) {
      throw new Error(`Erreur lors de la récupération des messages: ${error.message}`);
    }
  }

  // Marquer les messages comme lus
  async markMessagesAsRead(conversationId, userId) {
    try {
      await Message.updateMany(
        {
          conversationId,
          senderId: { $ne: userId },
          'readBy.userId': { $ne: userId }
        },
        {
          $push: {
            readBy: {
              userId,
              readAt: new Date()
            }
          },
          $set: { status: 'read' }
        }
      );

      // Mettre à jour le dernier message de la conversation
      await Conversation.findByIdAndUpdate(conversationId, {
        $addToSet: {
          'lastMessage.readBy': userId
        }
      });
    } catch (error) {
      throw new Error(`Erreur lors du marquage des messages comme lus: ${error.message}`);
    }
  }

  // Supprimer une conversation
  async deleteConversation(conversationId, userId) {
    try {
      const conversation = await Conversation.findOne({
        _id: conversationId,
        'participants.userId': userId
      });

      if (!conversation) {
        throw new Error('Conversation non trouvée');
      }

      // Supprimer tous les messages de la conversation
      await Message.deleteMany({ conversationId });
      await Conversation.findByIdAndDelete(conversationId);

      return true;
    } catch (error) {
      throw new Error(`Erreur lors de la suppression de la conversation: ${error.message}`);
    }
  }

  // Rechercher dans les messages
  async searchMessages(userId, query) {
    try {
      // Trouver les conversations de l'utilisateur
      const userConversations = await Conversation.find({
        'participants.userId': userId
      }).select('_id');

      const conversationIds = userConversations.map(conv => conv._id);

      const messages = await Message.find({
        conversationId: { $in: conversationIds },
        content: { $regex: query, $options: 'i' }
      })
      .populate('conversationId')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

      return messages;
    } catch (error) {
      throw new Error(`Erreur lors de la recherche de messages: ${error.message}`);
    }
  }

  // Récupérer les statistiques de messagerie
  async getMessageStats(userId) {
    try {
      const totalConversations = await Conversation.countDocuments({
        'participants.userId': userId
      });

      const totalUnread = await Conversation.aggregate([
        { $match: { 'participants.userId': userId } },
        {
          $lookup: {
            from: 'messagecontents',
            localField: '_id',
            foreignField: 'conversationId',
            as: 'messages'
          }
        },
        {
          $project: {
            unreadCount: {
              $size: {
                $filter: {
                  input: '$messages',
                  as: 'message',
                  cond: {
                    $and: [
                      { $ne: ['$$message.senderId', userId] },
                      { $not: { $in: [userId, '$$message.readBy.userId'] } }
                    ]
                  }
                }
              }
            }
          }
        },
        {
          $group: {
            _id: null,
            totalUnread: { $sum: '$unreadCount' }
          }
        }
      ]);

      return {
        totalConversations,
        totalUnread: totalUnread[0]?.totalUnread || 0
      };
    } catch (error) {
      throw new Error(`Erreur lors de la récupération des statistiques: ${error.message}`);
    }
  }

  // Dans services/messageService.js - AJOUTER ces méthodes
  async getConversationById(conversationId) {
      try {
          const conversation = await Conversation.findById(conversationId);
          if (!conversation) {
              throw new Error('Conversation non trouvée');
          }
          return conversation;
      } catch (error) {
          throw new Error(`Erreur lors de la récupération de la conversation: ${error.message}`);
      }
  }

  async updateConversationLastMessage(conversationId, message) {
      try {
          const conversation = await this.getConversationById(conversationId);
          
          // Mettre à jour le lastMessage
          conversation.lastMessage = {
              _id: message._id,
              content: message.content,
              senderId: message.senderId,
              messageType: message.messageType,
              timestamp: message.createdAt || new Date(),
              readBy: message.readBy || []
          };
          
          conversation.updatedAt = new Date();
          await conversation.save();
          
          return conversation;
      } catch (error) {
          console.error('Erreur lors de la mise à jour du lastMessage:', error);
          throw error;
      }
  }

  // Marquer les messages comme lus
  async markMessagesAsRead(conversationId, userId) {
    try {
      await Message.updateMany(
        {
          conversationId,
          senderId: { $ne: userId },
          'readBy.userId': { $ne: userId }
        },
        {
          $push: {
            readBy: {
              userId,
              readAt: new Date()
            }
          },
          $set: { status: 'read' }
        }
      );

      // Mettre à jour le dernier message de la conversation
      await Conversation.findByIdAndUpdate(conversationId, {
        $addToSet: {
          'lastMessage.readBy': userId
        }
      });
    } catch (error) {
      throw new Error(`Erreur lors du marquage des messages comme lus: ${error.message}`);
    }
  }
}

module.exports = new MessageService();