// models/Message.js (MongoDB)
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  // Identifiants des participants
  participants: [{
    userId: {
      type: String, // UUID de PostgreSQL
      required: true
    },
    userType: {
      type: String,
      enum: ['student', 'tutor'],
      required: true
    },
    firstName: String,
    lastName: String,
    profilePicture: String,
    lastSeen: Date
  }],
  
  // Dernier message pour les listes de conversations
  lastMessage: {
    content: String,
    senderId: String,
    messageType: {
      type: String,
      enum: ['text', 'image', 'file', 'system'],
      default: 'text'
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    readBy: [String] // Array de userId qui ont lu le message
  },
  
  // Métadonnées de la conversation
  isGroup: {
    type: Boolean,
    default: false
  },
  groupName: String,
  groupPhoto: String,
  
  // Paramètres de notification
  mutedBy: [String], // Array de userId qui ont muté la conversation
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const messageContentSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    required: true
  },
  senderId: {
    type: String, // UUID de PostgreSQL
    required: true
  },
  content: {
    type: String,
    required: true
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'file', 'system'],
    default: 'text'
  },
  mediaUrl: String,
  fileName: String,
  fileSize: Number,
  
  // Statut de lecture
  readBy: [{
    userId: String,
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Réponses et citations
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MessageContent'
  },
  
  // Réactions
  reactions: [{
    userId: String,
    emoji: String,
    reactedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Statut d'envoi
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent'
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index pour les performances
messageSchema.index({ 'participants.userId': 1 });
messageSchema.index({ updatedAt: -1 });
messageContentSchema.index({ conversationId: 1, createdAt: 1 });
messageContentSchema.index({ senderId: 1 });

module.exports = {
  Conversation: mongoose.model('Conversation', messageSchema),
  Message: mongoose.model('MessageContent', messageContentSchema)
};