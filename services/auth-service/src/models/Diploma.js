const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Diploma = sequelize.define('Diploma', {
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
  profileType: {
    type: DataTypes.ENUM('student', 'tutor'),
    allowNull: false
  },
  educationLevel: {
    type: DataTypes.STRING,
    allowNull: false 
  },
  field: {
    type: DataTypes.STRING,
    allowNull: true 
  },
  school: {
    type: DataTypes.STRING,
    allowNull: true // Rendre optionnel
  },
  country: {
    type: DataTypes.STRING,
    allowNull: true // Rendre optionnel
  },
  startYear: {
    type: DataTypes.INTEGER,
    allowNull: true // Rendre optionnel
  },
  endYear: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  diplomaFile: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  isCurrent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  fileName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  filePath: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  fileSize: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: 'diplomas',
  timestamps: true
});

module.exports = Diploma;