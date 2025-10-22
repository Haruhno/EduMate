// models/ProfileTutor.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ProfileTutor = sequelize.define('ProfileTutor', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  
  // AJOUTEZ CES CHAMPS MANQUANTS
  hourlyRate: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 30.00,
    allowNull: false
  },
  rating: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 0.00,
    allowNull: false
  },
  reviewsCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  },

  // Informations générales
  profilePicture: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  countryCode: {
    type: DataTypes.STRING,
    defaultValue: '+33'
  },
  gender: {
    type: DataTypes.STRING,
    allowNull: true
  },
  birthDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Éducation
  educationLevel: {
    type: DataTypes.STRING,
    allowNull: true
  },
  school: {
    type: DataTypes.STRING,
    allowNull: true
  },
  field: {
    type: DataTypes.STRING,
    allowNull: true
  },
  year: {
    type: DataTypes.STRING,
    allowNull: true
  },
  diplomaFile: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Expérience
  experience: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  specialties: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
  },
  
  // Disponibilité
  availability: {
    type: DataTypes.JSON,
    defaultValue: {
      online: false,
      inPerson: false
    }
  },
  schedule: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  
  // Localisation
  location: {
    type: DataTypes.JSON,
    defaultValue: {
      address: '',
      radius: 8,
      city: '',
      coordinates: { lat: 0, lng: 0 }
    }
  },
  
  // Statut
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isCompleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  completionPercentage: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'profile_tutors',
  timestamps: true
});

module.exports = ProfileTutor;