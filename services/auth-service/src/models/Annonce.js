const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Annonce = sequelize.define('Annonce', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  tutorId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'profile_tutors',
      key: 'id'
    }
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  rawText: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Texte original avant transformation par IA'
  },
  subject: {
    type: DataTypes.STRING,
    allowNull: false
  },
  subjects: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: false,
    defaultValue: []
  },
  detectedSkills: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  level: {
    type: DataTypes.STRING,
    allowNull: false
  },
  hourlyRate: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  teachingMode: {
    type: DataTypes.ENUM('En ligne', 'En présentiel', 'Les deux'),
    defaultValue: 'Les deux'
  },
  location: {
    type: DataTypes.JSONB,
    defaultValue: {
      address: '',
      city: '',
      coordinates: { lat: 0, lng: 0 }
    }
  },
  availability: {
    type: DataTypes.JSONB,
    defaultValue: {
      days: [],
      timeSlots: []
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  }
}, {
  tableName: 'annonces',
  timestamps: true
});

module.exports = Annonce;