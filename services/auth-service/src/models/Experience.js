const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Experience = sequelize.define('Experience', {
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
  jobTitle: {
    type: DataTypes.STRING,
    allowNull: false
  },
  employmentType: {
    type: DataTypes.STRING,
    allowNull: false
  },
  company: {
    type: DataTypes.STRING,
    allowNull: false
  },
  location: {
    type: DataTypes.STRING,
    allowNull: false
  },
  startMonth: {
    type: DataTypes.STRING,
    allowNull: false
  },
  startYear: {
      type: DataTypes.INTEGER,
      allowNull: true, 
      validate: {
        min: 1900,
        max: new Date().getFullYear()
      }
    },
  endMonth: {
    type: DataTypes.STRING,
    allowNull: true
  },
    endYear: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1900,
        max: new Date().getFullYear() + 5
      }
    },
  isCurrent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'experiences',
  timestamps: true
});

module.exports = Experience;