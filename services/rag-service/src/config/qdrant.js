const { QdrantClient } = require('@qdrant/js-client-rest');
require('dotenv').config();

const client = new QdrantClient({
  host: process.env.QDRANT_HOST || 'localhost',
  port: parseInt(process.env.QDRANT_PORT) || 6333,
});

const COLLECTION_NAME = process.env.QDRANT_COLLECTION || 'tutor_annonces';

// Dimensions selon le modèle Ollama utilisé
const EMBEDDING_DIMENSIONS = {
  'nomic-embed-text': 768,
  'all-minilm-l6-v2': 384,
  'mistral-embed': 1024
};

function getEmbeddingDimension() {
  const model = process.env.OLLAMA_EMBEDDING_MODEL || 'mxbai-embed-large';
  
  if (model.includes('nomic')) {
    console.log('📐 Dimension 768D pour nomic-embed-text');
    return 1024; 
  }
  if (model === 'mxbai-embed-large') {
    console.log('📐 Dimension 1024D pour mxbai-embed-large');
    return 768;
  }
  
  const dim = EMBEDDING_DIMENSIONS[model] || 768;
  console.log(`📐 Dimension pour ${model}: ${dim}D`);
  return 1024;
}

async function initQdrant() {
  try {
    const embeddingDim = getEmbeddingDimension();
    console.log(`📐 Dimension des embeddings: ${embeddingDim}`);

    const collections = await client.getCollections();
    const exists = collections.collections.some(c => c.name === COLLECTION_NAME);
    
    if (exists) {
      try {
        const collectionInfo = await client.getCollection(COLLECTION_NAME);
        
        // Vérifier si la collection a la bonne structure
        const currentDim = collectionInfo.config?.vectors?.size;
        
        if (!currentDim) {
          console.warn(`⚠️ Configuration de collection invalide! Suppression et recréation...`);
          await client.deleteCollection(COLLECTION_NAME);
          await createCollection(embeddingDim);
        } else if (currentDim !== embeddingDim) {
          console.warn(`⚠️ Dimension mismatch! (${currentDim} vs ${embeddingDim}) - Suppression et recréation...`);
          await client.deleteCollection(COLLECTION_NAME);
          await createCollection(embeddingDim);
        } else {
          console.log(`✅ Collection existe avec la bonne dimension (${embeddingDim}D)`);
        }
      } catch (error) {
        console.warn(`⚠️ Erreur lecture collection: ${error.message}`);
        await client.deleteCollection(COLLECTION_NAME);
        await createCollection(embeddingDim);
      }
    } else {
      await createCollection(embeddingDim);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Erreur initialisation Qdrant:', error.message);
    throw error;
  }
}

async function createCollection(embeddingDim) {
  try {
    // Attendre un peu avant de recréer
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await client.createCollection(COLLECTION_NAME, {
      vectors: {
        size: embeddingDim,
        distance: 'Cosine'
      }
    });
    console.log(`✅ Collection créée (dimension: ${embeddingDim}D)`);
    
    const indexFields = [
      { name: 'level', schema: 'keyword' },
      { name: 'teachingMode', schema: 'keyword' },
      { name: 'subjects', schema: 'text' },
      { name: 'hourlyRate', schema: 'float' },
      { name: 'tutorRating', schema: 'float' }
    ];
    
    for (const field of indexFields) {
      try {
        await client.createPayloadIndex(COLLECTION_NAME, {
          field_name: field.name,
          field_schema: field.schema
        });
        console.log(`  ✅ Index: ${field.name}`);
      } catch (error) {
        if (!error.message.includes('already exists')) {
          console.warn(`  ⚠️ Index ${field.name}: ${error.message}`);
        }
      }
    }
  } catch (error) {
    // Si la collection existe déjà (conflit), c'est OK
    if (error.message.includes('Conflict') || error.message.includes('already exists')) {
      console.log(`ℹ️ Collection déjà existe, utilisation de celle-ci`);
      return;
    }
    throw error;
  }
}

module.exports = {
  client,
  COLLECTION_NAME,
  initQdrant,
  getEmbeddingDimension
};