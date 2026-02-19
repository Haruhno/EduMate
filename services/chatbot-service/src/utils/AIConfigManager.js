const axios = require('axios');

class AIConfigManager {
    constructor() {
        // Plus besoin d'auth service URL, on charge depuis .env
    }

    async getConfig(serviceName = 'global') {
        try {
            const apiKey = process.env.OPENROUTER_API_KEY;
            const model = process.env.OPENROUTER_MODEL || 'qwen/qwen3.5-397b-a17b';
            
            if (!apiKey) {
                throw new Error('OPENROUTER_API_KEY manquante dans .env');
            }
            
            console.log(`[AIConfigManager] Config .env chargée: ${model} | ${apiKey.slice(0, 10)}...`);
            
            return {
                modelName: model,
                apiKey: apiKey,
                provider: 'openrouter',
                isActive: true
            };
        } catch (error) {
            console.error(`[AIConfigManager] Erreur récupération config:`, error.message);
            throw new Error(`Configuration IA manquante: ${error.message}`);
        }
    }

    clearCache() {
        // Plus de cache nécessaire, on charge directement depuis .env
        console.log(`[AIConfigManager] Rien à vider (config depuis .env)`);
    }
}

module.exports = AIConfigManager;