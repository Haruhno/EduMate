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
    type: DataTypes.STRING,
    allowNull: true
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  specialties: {
    type: DataTypes.JSON,
    defaultValue: []
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