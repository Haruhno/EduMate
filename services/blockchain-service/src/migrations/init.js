const sequelize = require('../config/database');
const { Wallet, LedgerBlock, Transaction, WithdrawalRequest } = require('../models/associations');

const initDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('Connexion à la base de données établie.');

    await sequelize.sync({ force: false });
    console.log('Tables synchronisées avec succès.');

    console.log('Structure de la base de données blockchain:');
    console.log('   - wallets : Stockage des portefeuilles utilisateurs');
    console.log('   - ledger_blocks : Chaîne de blocs immuable');
    console.log('   - transactions : Journal des transactions');
    console.log('   - withdrawal_requests : Demandes de retrait');

    process.exit(0);
  } catch (error) {
    console.error('Erreur initialisation base de données:', error);
    process.exit(1);
  }
};

initDatabase();