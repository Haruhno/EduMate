const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AIConfig = sequelize.define('AIConfig', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  serviceName: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'chatbot | cv-parser | rag-service'
  },
  modelName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  apiKey: {
    type: DataTypes.STRING,
    allowNull: false
  },
  provider: {
    type: DataTypes.STRING,
    defaultValue: 'openrouter'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  lastModifiedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'ai_configs',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['serviceName']
    }
  ]
});

module.exports = AIConfig;