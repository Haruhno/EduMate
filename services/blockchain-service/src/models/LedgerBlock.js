const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const crypto = require('crypto');

const LedgerBlock = sequelize.define('LedgerBlock', {
  id: {
    type: DataTypes.BIGINT,
    autoIncrement: true,
    primaryKey: true
  },
  previousHash: {
    type: DataTypes.STRING(64),
    allowNull: false
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false
  },
  payload: {
    type: DataTypes.JSONB,
    allowNull: false
  },
  hash: {
    type: DataTypes.STRING(64),
    allowNull: false,
    unique: true
  },
  signature: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  blockType: {
    type: DataTypes.ENUM(
      'TRANSFER',
      'WITHDRAWAL',
      'DEPOSIT',
      'FEE',
      'REWARD',
      'EXCHANGE',
      'TRANSFER_PENDING',      // AJOUTER
      'TRANSFER_CONFIRMED',    // AJOUTER
      'TRANSFER_CANCELLED'     // AJOUTER
    ),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'failed'),
    defaultValue: 'pending'
  },
  index: {
    type: DataTypes.BIGINT,
    allowNull: false,
    unique: true
  }
}, {
  tableName: 'ledger_blocks',
  timestamps: true,
  indexes: [
    {
      fields: ['hash']
    },
    {
      fields: ['timestamp']
    },
    {
      fields: ['blockType']
    },
    {
      fields: ['status']
    }
  ],
  hooks: {
    beforeValidate: (block) => {
      if (!block.previousHash) {
        // Premier bloc - hash génétique
        block.previousHash = '0'.repeat(64);
      }
    },
    beforeCreate: async (block) => {
      // Calcul automatique du hash
      if (!block.hash) {
        block.hash = block.calculateHash();
      }
      
      // Génération automatique de l'index
      if (!block.index) {
        const lastBlock = await LedgerBlock.findOne({
          order: [['index', 'DESC']]
        });
        block.index = lastBlock ? lastBlock.index + 1 : 0;
      }
    }
  }
});

// Méthode pour calculer le hash
LedgerBlock.prototype.calculateHash = function() {
  const data = `${this.index}|${this.previousHash}|${this.timestamp.getTime()}|${JSON.stringify(this.payload)}`;
  return crypto.createHash('sha256').update(data).digest('hex');
};

// Méthode pour vérifier l'intégrité
LedgerBlock.prototype.isValid = function() {
  return this.hash === this.calculateHash();
};

module.exports = LedgerBlock;