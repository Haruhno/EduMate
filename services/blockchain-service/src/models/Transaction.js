const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Transaction = sequelize.define('Transaction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  fromWalletId: {
    type: DataTypes.UUID,
    allowNull: true, // Peut être null pour les dépôts système
    references: {
      model: 'wallets',
      key: 'id'
    }
  },
  toWalletId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'wallets',
      key: 'id'
    }
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  fee: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00
  },
  transactionType: {
    type: DataTypes.ENUM(
      'TUTOR_SESSION',
      'CONTENT_PURCHASE',
      'WITHDRAWAL',
      'DEPOSIT',
      'REFERRAL_BONUS',
      'SYSTEM_REWARD',
      'EXCHANGE_SERVICE'
    ),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'failed', 'cancelled'),
    defaultValue: 'pending'
  },
  referenceLedgerId: {
    type: DataTypes.BIGINT,
    allowNull: true,
    references: {
      model: 'ledger_blocks',
      key: 'id'
    }
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  sessionId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  contentId: {
    type: DataTypes.UUID,
    allowNull: true
  }
}, {
  tableName: 'transactions',
  timestamps: true,
  indexes: [
    {
      fields: ['fromWalletId']
    },
    {
      fields: ['toWalletId']
    },
    {
      fields: ['transactionType']
    },
    {
      fields: ['status']
    },
    {
      fields: ['createdAt']
    }
  ]
});

module.exports = Transaction;