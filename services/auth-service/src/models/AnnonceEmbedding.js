const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AnnonceEmbedding = sequelize.define('AnnonceEmbedding', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  annonceId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'annonces',
      key: 'id'
    },
    unique: true
  },
  embedding: {
    type: DataTypes.ARRAY(DataTypes.FLOAT),
    allowNull: false
  },
  textForEmbedding: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  qdrantId: {
    type: DataTypes.UUID,
    allowNull: true
  }
}, {
  tableName: 'annonce_embeddings',
  timestamps: true,
  indexes: [
    {
      name: 'idx_annonce_embedding',
      using: 'GIN',
      fields: ['embedding']
    },
    {
      name: 'idx_annonce_id',
      fields: ['annonceId']
    }
  ]
});

module.exports = AnnonceEmbedding;