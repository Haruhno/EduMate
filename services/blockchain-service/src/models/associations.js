const Wallet = require('./Wallet');
const LedgerBlock = require('./LedgerBlock');
const Transaction = require('./Transaction');
const WithdrawalRequest = require('./WithdrawalRequest');

// Solution simple : définir les modèles externes directement ici
const sequelize = require('../config/database');
const { DataTypes } = require('sequelize');

// Définition minimale des modèles existants
const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true
  }
}, {
  tableName: 'users',
  timestamps: true,
  freezeTableName: true
});

const ProfileTutor = sequelize.define('ProfileTutor', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID
  }
}, {
  tableName: 'profile_tutors',
  timestamps: true,
  freezeTableName: true
});

const ProfileStudent = sequelize.define('ProfileStudent', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID
  }
}, {
  tableName: 'profile_students', 
  timestamps: true,
  freezeTableName: true
});

// Wallet associations avec User existant
Wallet.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

User.hasOne(Wallet, {
  foreignKey: 'userId',
  as: 'wallet'
});

// Transaction associations
Transaction.belongsTo(Wallet, {
  foreignKey: 'fromWalletId',
  as: 'fromWallet'
});

Transaction.belongsTo(Wallet, {
  foreignKey: 'toWalletId',
  as: 'toWallet'
});

Transaction.belongsTo(LedgerBlock, {
  foreignKey: 'referenceLedgerId',
  as: 'ledgerBlock'
});

// Wallet associations
Wallet.hasMany(Transaction, {
  foreignKey: 'fromWalletId',
  as: 'sentTransactions'
});

Wallet.hasMany(Transaction, {
  foreignKey: 'toWalletId',
  as: 'receivedTransactions'
});

Wallet.hasMany(WithdrawalRequest, {
  foreignKey: 'walletId',
  as: 'withdrawalRequests'
});

// LedgerBlock associations
LedgerBlock.hasMany(Transaction, {
  foreignKey: 'referenceLedgerId',
  as: 'transactions'
});

// WithdrawalRequest associations
WithdrawalRequest.belongsTo(Wallet, {
  foreignKey: 'walletId',
  as: 'wallet'
});

WithdrawalRequest.belongsTo(LedgerBlock, {
  foreignKey: 'ledgerBlockId',
  as: 'ledgerBlock'
});

module.exports = {
  Wallet,
  LedgerBlock,
  Transaction,
  WithdrawalRequest,
  User,
  ProfileTutor,
  ProfileStudent
};