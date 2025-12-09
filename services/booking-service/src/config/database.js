const { Sequelize } = require('sequelize');
require('dotenv').config();

// Prioriser la même DB centrale "edumate" : DATABASE_URL (utilisée par les autres services)
// fallback to BOOKING_DB_URL if specifically provided for booking-service
const bookingDbUrl = process.env.DATABASE_URL || process.env.BOOKING_DB_URL || null;

// paramètres individuels (utiles si BOOKING_DB_URL/DATABASE_URL absent)
const dbHost = process.env.BOOKING_DB_HOST || process.env.DB_HOST || 'localhost';
const dbPort = process.env.BOOKING_DB_PORT || process.env.DB_PORT || '5432';
const dbUser = process.env.BOOKING_DB_USER || process.env.DB_USER || 'postgres';
const dbPass = process.env.BOOKING_DB_PASS || process.env.DB_PASS || 'admin';
// Utiliser par défaut la base centrale "edumate"
const dbName = process.env.BOOKING_DB_NAME || process.env.DB_NAME || 'edumate';

let sequelize;

if (bookingDbUrl) {
  // Utiliser exactement l'URL fournie (ex: postgres://user:pass@host:port/db)
  sequelize = new Sequelize(bookingDbUrl, {
    dialect: 'postgres',
    logging: false,
    define: {
      underscored: true,
      freezeTableName: false
    },
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  });
  console.log('[booking-service] Using DATABASE_URL/BOOKING_DB_URL from environment.');
} else {
  // Construire la chaîne de connexion Postgres depuis les variables d'environnement
  const connectionString = `postgres://${dbUser}:${encodeURIComponent(dbPass)}@${dbHost}:${dbPort}/${dbName}`;
  sequelize = new Sequelize(connectionString, {
    dialect: 'postgres',
    logging: false,
    define: {
      underscored: true,
      freezeTableName: false
    },
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  });
  console.log(`[booking-service] No DATABASE_URL/BOOKING_DB_URL provided — using constructed Postgres connection: ${dbHost}:${dbPort}/${dbName}`);
}

module.exports = sequelize;
