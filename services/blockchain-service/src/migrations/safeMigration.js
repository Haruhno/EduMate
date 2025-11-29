const sequelize = require('../config/database');
const { Wallet, LedgerBlock, Transaction, WithdrawalRequest } = require('../models/associations');

const safeMigration = async () => {
  try {
    await sequelize.authenticate();
    console.log('🔗 Connexion à la base de données établie');

    // Synchroniser UNIQUEMENT les tables blockchain
    await Wallet.sync({ alter: true });
    await LedgerBlock.sync({ alter: true });
    await Transaction.sync({ alter: true });
    await WithdrawalRequest.sync({ alter: true });

    console.log('\n🎉 Migration blockchain terminée avec succès!');
    console.log('\n📊 Tables blockchain disponibles:');
    console.log('   - wallets');
    console.log('   - ledger_blocks');
    console.log('   - transactions');
    console.log('   - withdrawal_requests');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    process.exit(1);
  }
};

safeMigration();