const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const crypto = require('crypto');

const Wallet = sequelize.define('Wallet', {
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
    },
    unique: true
  },
  balanceCredits: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00,
    allowNull: false
  },
  balanceLocked: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00,
    allowNull: false
  },
  walletAddress: {
    type: DataTypes.STRING(64),
    allowNull: false,
    unique: true,
    defaultValue: function() {
      return crypto.randomBytes(32).toString('hex');
    }
  },
  kycStatus: {
    type: DataTypes.ENUM('none', 'pending', 'verified', 'rejected'),
    defaultValue: 'none'
  },
  dailyLimit: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 1000.00
  },
  monthlyLimit: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 5000.00
  },
  totalWithdrawn: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'wallets',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['userId']
    },
    {
      unique: true,
      fields: ['walletAddress']
    }
  ]
});

module.exports = Wallet;