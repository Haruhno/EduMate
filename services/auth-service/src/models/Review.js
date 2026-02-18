const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Review = sequelize.define('Review', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // Référence au booking concerné
  bookingId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  
  // L'utilisateur qui fait l'avis
  reviewerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  
  // L'utilisateur évalué
  targetUserId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  
  // Avis textuel (pour tuteur et étudiant)
  comment: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  
  // Note de 1-5 étoiles (seulement si c'est un étudiant qui note un tuteur)
  rating: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 5
    }
  },
  
  // Type de réviseur (tutor ou student) - pour identifier le contexte
  reviewerType: {
    type: DataTypes.ENUM('tutor', 'student'),
    allowNull: false
  },
  
  // Confirmé et irréversible
  isConfirmed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  
  confirmedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'reviews',
  timestamps: true
});

// Associations (will be set up in database initialization)
Review.associate = (models) => {
  Review.belongsTo(models.User, {
    foreignKey: 'reviewerId',
    as: 'reviewer'
  });
  
  Review.belongsTo(models.User, {
    foreignKey: 'targetUserId',
    as: 'target'
  });
};

module.exports = Review;
