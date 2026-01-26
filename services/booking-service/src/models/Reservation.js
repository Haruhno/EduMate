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
  annonceTitle: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'annonce_title'
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
    allowNull: true,
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
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['tutor_id'] },
    { fields: ['student_id'] },
    { fields: ['annonce_id'] },
    { fields: ['status'] },
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

Reservation.associate = (models) => {
  // Associations
};

module.exports = Reservation;