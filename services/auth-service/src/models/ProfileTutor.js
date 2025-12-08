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
  
  // Expérience
  experience: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Disponibilité 
  availability: {
    type: DataTypes.JSON,
    defaultValue: {
      online: false,
      inPerson: false
    }
  },
  
  // Schedule séparé 
  schedule: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  
  // Localisation générale
  location: {
    type: DataTypes.JSON,
    defaultValue: {
      address: '',
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