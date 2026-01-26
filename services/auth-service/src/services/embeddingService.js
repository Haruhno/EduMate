const axios = require('axios');
const qdrantClient = require('../config/qdrant');

class EmbeddingService {
  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.collectionName = process.env.QDRANT_COLLECTION || 'annonces_embeddings';
    this.embeddingDimension = 1536; // Pour text-embedding-ada-002
  }

  // Générer un embedding avec OpenAI
  async generateEmbedding(text) {
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/embeddings',
        {
          model: 'text-embedding-ada-002',
          input: text
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.data[0].embedding;
    } catch (error) {
      console.error('Erreur génération embedding:', error);
      throw new Error(`Erreur génération embedding: ${error.message}`);
    }
  }

  // Initialiser la collection Qdrant
  async initializeCollection() {
    try {
      const collections = await qdrantClient.getCollections();
      const exists = collections.collections.some(
        c => c.name === this.collectionName
      );

      if (!exists) {
        await qdrantClient.createCollection(this.collectionName, {
          vectors: {
            size: this.embeddingDimension,
            distance: 'Cosine'
          }
        });
        console.log(`Collection ${this.collectionName} créée avec succès`);
      }

      return true;
    } catch (error) {
      console.error('Erreur initialisation collection Qdrant:', error);
      throw error;
    }
  }

  // Stocker un embedding dans Qdrant
  async storeEmbeddingInQdrant(annonceId, embedding, metadata) {
    try {
      await this.initializeCollection();

      const pointId = annonceId.replace(/-/g, '').substring(0, 16);
      
      await qdrantClient.upsert(this.collectionName, {
        wait: true,
        points: [
          {
            id: pointId,
            vector: embedding,
            payload: {
              annonceId,
              ...metadata,
              timestamp: new Date().toISOString()
            }
          }
        ]
      });

      return pointId;
    } catch (error) {
      console.error('Erreur stockage embedding dans Qdrant:', error);
      throw error;
    }
  }

  // Recherche vectorielle
  async searchSimilarAnnonces(query, limit = 10, filters = {}) {
    try {
      // Générer l'embedding de la requête
      const queryEmbedding = await this.generateEmbedding(query);
      
      // Construire le filtre pour Qdrant
      const qdrantFilters = this.buildQdrantFilters(filters);
      
      const searchResult = await qdrantClient.search(this.collectionName, {
        vector: queryEmbedding,
        limit,
        with_payload: true,
        with_vector: false,
        filter: qdrantFilters
      });

      return searchResult.map(result => ({
        annonceId: result.payload.annonceId,
        score: result.score,
        metadata: result.payload
      }));
    } catch (error) {
      console.error('Erreur recherche vectorielle:', error);
      throw error;
    }
  }

  buildQdrantFilters(filters) {
    const conditions = [];

    if (filters.subject) {
      conditions.push({
        key: 'subjects',
        match: {
          any: Array.isArray(filters.subject) ? filters.subject : [filters.subject]
        }
      });
    }

    if (filters.level) {
      conditions.push({
        key: 'level',
        match: {
          value: filters.level
        }
      });
    }

    if (filters.maxPrice) {
      conditions.push({
        key: 'hourlyRate',
        range: {
          lte: parseFloat(filters.maxPrice)
        }
      });
    }

    if (filters.minPrice) {
      conditions.push({
        key: 'hourlyRate',
        range: {
          gte: parseFloat(filters.minPrice)
        }
      });
    }

    if (filters.teachingMode) {
      conditions.push({
        key: 'teachingMode',
        match: {
          value: filters.teachingMode
        }
      });
    }

    return conditions.length > 0 ? {
      must: conditions
    } : undefined;
  }

  // Supprimer un embedding de Qdrant
  async deleteEmbeddingFromQdrant(annonceId) {
    try {
      const pointId = annonceId.replace(/-/g, '').substring(0, 16);
      
      await qdrantClient.delete(this.collectionName, {
        wait: true,
        points: [pointId]
      });

      return true;
    } catch (error) {
      console.error('Erreur suppression embedding de Qdrant:', error);
      throw error;
    }
  }
}

module.exports = new EmbeddingService();