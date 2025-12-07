const Wallet = require('./Wallet');
const LedgerBlock = require('./LedgerBlock');
const Transaction = require('./Transaction');
const WithdrawalRequest = require('./WithdrawalRequest');

const sequelize = require('../config/database');
const { DataTypes } = require('sequelize');

// --- Modèles “externes” uniquement pour les relations ---
const User = sequelize.define('User', {}, {
  tableName: 'users',
  timestamps: true,
  freezeTableName: true
});

const ProfileTutor = sequelize.define('ProfileTutor', {}, {
  tableName: 'profile_tutors',
  timestamps: true,
  freezeTableName: true
});

const ProfileStudent = sequelize.define('ProfileStudent', {}, {
  tableName: 'profile_students',
  timestamps: true,
  freezeTableName: true
});

// --- Associations ---

Wallet.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasOne(Wallet, { foreignKey: 'userId', as: 'wallet' });

Transaction.belongsTo(Wallet, { foreignKey: 'fromWalletId', as: 'fromWallet' });
Transaction.belongsTo(Wallet, { foreignKey: 'toWalletId', as: 'toWallet' });
Transaction.belongsTo(LedgerBlock, { foreignKey: 'referenceLedgerId', as: 'ledgerBlock' });

Wallet.hasMany(Transaction, { foreignKey: 'fromWalletId', as: 'sentTransactions' });
Wallet.hasMany(Transaction, { foreignKey: 'toWalletId', as: 'receivedTransactions' });
Wallet.hasMany(WithdrawalRequest, { foreignKey: 'walletId', as: 'withdrawalRequests' });

LedgerBlock.hasMany(Transaction, { foreignKey: 'referenceLedgerId', as: 'transactions' });

WithdrawalRequest.belongsTo(Wallet, { foreignKey: 'walletId', as: 'wallet' });
WithdrawalRequest.belongsTo(LedgerBlock, { foreignKey: 'ledgerBlockId', as: 'ledgerBlock' });

// --- Synchronisation sécurisée ---
async function syncModels() {
  // On synchronise seulement les nouvelles tables
  await Wallet.sync({ alter: true });
  await Transaction.sync({ alter: true });
  await LedgerBlock.sync({ alter: true });
  await WithdrawalRequest.sync({ alter: true });

  console.log('Tables blockchain synchronisées sans toucher à users ou profils.');
}

module.exports = {
  Wallet,
  LedgerBlock,
  Transaction,
  WithdrawalRequest,
  User,
  ProfileTutor,
  ProfileStudent,
  syncModels
};
