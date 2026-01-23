const { DataTypes, Op } = require('sequelize');
const sequelize = require('../config/database');

const Reservation = sequelize.define('Reservation', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false,
    field: 'id'
  },
  tutorId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'tutor_id'
  },
  studentId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'student_id'
  },
  annonceId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'annonce_id'
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'date'
  },
  time: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'time'
  },
  duration: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'duration'
  },
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    field: 'amount'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'description'
  },
  studentNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'student_notes'
  },
  tutorNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'tutor_notes'
  },
  status: {
    type: DataTypes.ENUM('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'),
    allowNull: false,
    defaultValue: 'PENDING',
    field: 'status'
  },
  transactionHash: {
    type: DataTypes.STRING,
    allowNull: true, // allow null while pending (important)
    field: 'transaction_hash'
  },
  blockchainStatus: {
    type: DataTypes.ENUM('PENDING', 'CONFIRMED', 'FAILED', 'CANCELLED'),
    allowNull: true,
    field: 'blockchain_status'
  },
  blockchainFailed: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'blockchain_failed'
  },
  blockchainCancelled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'blockchain_cancelled'
  },
  cancelledBy: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'cancelled_by'
  },
  cancellationReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'cancellation_reason'
  }
}, {
  tableName: 'reservations',
  underscored: true, // ensure snake_case columns by default
  timestamps: true,
  indexes: [
    // Indexes on foreign keys and status
    { fields: ['tutor_id'] },
    { fields: ['student_id'] },
    { fields: ['annonce_id'] },
    { fields: ['status'] },
    // Partial unique index on transaction_hash to avoid conflicts when null
    // Note: Sequelize supports 'where' for indexes; Postgres will enforce unique only when not null
    {
      unique: true,
      fields: ['transaction_hash'],
      where: {
        transaction_hash: { [Op.ne]: null }
      },
      name: 'uniq_reservations_transaction_hash_not_null'
    }
  ]
});

// Associations can be defined in index file / after all models are initialized
Reservation.associate = (models) => {
  // ...existing associations...
  // e.g. Reservation.belongsTo(models.User, { as: 'tutor', foreignKey: 'tutorId' });
};

module.exports = Reservation;