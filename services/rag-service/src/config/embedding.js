const axios = require('axios');
require('dotenv').config();

/**
 * Générer un embedding avec Ollama 
 */
const generateEmbedding = async (text) => {
  try {
    if (!text || text.trim().length === 0) {
      throw new Error('Texte vide pour l\'embedding');
    }

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

  } catch (error) {
    console.error('❌ Erreur Ollama:', error.message);
    throw error;
  }
};

module.exports = { generateEmbedding };