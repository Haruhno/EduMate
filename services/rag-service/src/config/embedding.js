const axios = require('axios');
require('dotenv').config();


/**
 * Générer un embedding avec Ollama ou OpenRouter (Qwen)
 */
const generateEmbedding = async (text) => {
  try {
    if (!text || text.trim().length === 0) {
      throw new Error('Texte vide pour l\'embedding');
    }

    const embeddingMethod = process.env.EMBEDDING_METHOD || 'ollama';

    if (embeddingMethod === 'openrouter') {
      // Utiliser OpenRouter (Qwen) pour générer l'embedding
      const openrouterApiKey = process.env.OPENROUTER_API_KEY;
      const model = process.env.OPENROUTER_MODEL || 'qwen/qwen1.5-110b-chat';
      if (!openrouterApiKey) throw new Error('OPENROUTER_API_KEY manquant');
      console.log(`📐 Embedding via OpenRouter (${model}): "${text.substring(0, 100)}..."`);
      const response = await axios.post(
        'https://openrouter.ai/api/v1/embeddings',
        {
          model,
          input: text
        },
        {
          timeout: 60000,
          headers: {
            'Authorization': `Bearer ${openrouterApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      if (!response.data.data || !response.data.data[0]?.embedding) {
        throw new Error('Aucun embedding retourné par OpenRouter');
      }
      console.log(`✅ Embedding généré via OpenRouter (${response.data.data[0].embedding.length} dimensions)`);
      return response.data.data[0].embedding;
    } else {
      // Par défaut: Ollama
      const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
      const ollamaModel = process.env.OLLAMA_EMBEDDING_MODEL || 'mxbai-embed-large';
      console.log(`📐 Embedding avec ${ollamaModel}: "${text.substring(0, 100)}..."`);
      const response = await axios.post(
        `${ollamaUrl}/api/embeddings`,
        {
          model: ollamaModel,
          prompt: text
        },
        {
          timeout: 60000,
          headers: { 'Content-Type': 'application/json' }
        }
      );
      if (!response.data.embedding || response.data.embedding.length === 0) {
        throw new Error('Aucun embedding retourné');
      }
      console.log(`✅ Embedding généré (${response.data.embedding.length} dimensions)`);
      return response.data.embedding;
    }
  } catch (error) {
    console.error('❌ Erreur embedding:', error.message);
    throw error;
  }
};

module.exports = { generateEmbedding };