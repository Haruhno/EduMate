const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ProfileStudent = sequelize.define('ProfileStudent', {
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
  
  // Localisation
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
  tableName: 'profile_students',
  timestamps: true
});

module.exports = ProfileStudent;