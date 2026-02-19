const AIConfig = require('../models/AIConfig');
const User = require('../models/User');

async function initializeGlobalConfig() {
  try {
    // Vérifier si une config globale existe déjà
    let globalConfig = await AIConfig.findOne({ where: { serviceName: 'global' } });
    
    if (globalConfig) {
      console.log('✅ Configuration IA globale existante:');
      console.log(`   🤖 Modèle: ${globalConfig.modelName}`);
      console.log(`   🔑 Clé API: ${globalConfig.apiKey.slice(0, 8)}...`);
      console.log(`   ${globalConfig.isActive ? '✓ Active' : '○ Inactive'}`);
      return;
    }

    // Trouver l'admin pour lastModifiedBy
    const admin = await User.findOne({ where: { role: 'admin' } });
    
    // Créer une config par défaut
    const defaultModel = process.env.DEFAULT_AI_MODEL || 'deepseek/deepseek-r1-0528:free';
    const defaultApiKey = process.env.DEFAULT_AI_API_KEY || 'CHANGEZ_CETTE_CLE_DANS_ADMIN';
    
    globalConfig = await AIConfig.create({
      serviceName: 'global',
      modelName: defaultModel,
      apiKey: defaultApiKey,
      provider: 'openrouter',
      isActive: true,
      notes: 'Configuration créée automatiquement au démarrage',
      lastModifiedBy: admin?.id || null
    });

    console.log('🆕 Configuration IA globale créée:');
    console.log(`   🤖 Modèle: ${globalConfig.modelName}`);
    console.log(`   🔑 Clé API: ${globalConfig.apiKey.slice(0, 8)}...`);
    
    if (defaultApiKey === 'CHANGEZ_CETTE_CLE_DANS_ADMIN') {
      console.log('');
      console.log('⚠️  IMPORTANT: Configurez votre clé API dans la page Admin!');
      console.log('   👉 http://localhost:5173/admin');
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Erreur initialisation config globale:', error.message);
  }
}

module.exports = initializeGlobalConfig;
