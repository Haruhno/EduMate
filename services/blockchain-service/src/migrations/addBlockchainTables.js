const sequelize = require('../config/database');
const { Wallet, LedgerBlock, Transaction, WithdrawalRequest } = require('../models/associations');

const migrateBlockchainTables = async () => {
  try {
    await sequelize.authenticate();
    console.log('Connexion à la base EduMate établie.');

    // Synchroniser uniquement les nouvelles tables
    await Wallet.sync({ alter: true });
    await LedgerBlock.sync({ alter: true });
    await Transaction.sync({ alter: true });
    await WithdrawalRequest.sync({ alter: true });

    console.log('Tables blockchain ajoutées à la base EduMate:');
    console.log('✅ wallets');
    console.log('✅ ledger_blocks'); 
    console.log('✅ transactions');
    console.log('✅ withdrawal_requests');
    console.log('');
    console.log('Structure intégrée:');
    console.log('   - wallets.userId → users.id');
    console.log('   - transactions.fromWalletId → wallets.id');
    console.log('   - transactions.toWalletId → wallets.id');

    process.exit(0);
  } catch (error) {
    console.error('Erreur migration tables blockchain:', error);
    process.exit(1);
  }
};

migrateBlockchainTables();