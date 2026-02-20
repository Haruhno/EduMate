require('dotenv').config();
const { initQdrant } = require('../src/config/qdrant');
const syncService = require('../src/services/SyncService');

async function main() {
  try {    
    // Initialiser Qdrant
    await initQdrant();
    console.log('✅ Qdrant initialisé');
    
    // Synchroniser les données
    const result = await syncService.syncExistingData();
    
    console.log('🎉 Synchronisation terminée avec succès!');
    console.log(`📊 Résultats: ${result.successCount} succès, ${result.errorCount} erreurs`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur synchronisation:', error);
    process.exit(1);
  }
}

main();