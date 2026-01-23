const { Sequelize } = require('sequelize');
require('dotenv').config();

console.log('🔧 [booking-service] Chargement configuration DB...');

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

// Log pour debug (sans afficher le mot de passe en clair)
console.log(`🔍 [booking-service] Configuration DB détectée:`);
console.log(`   - URL: ${bookingDbUrl ? 'Présente' : 'Absente'}`);
console.log(`   - Host: ${dbHost}`);
console.log(`   - Port: ${dbPort}`);
console.log(`   - User: ${dbUser}`);
console.log(`   - DB: ${dbName}`);
console.log(`   - Password: ${dbPass ? '***' + dbPass.slice(-2) : 'Non défini'}`);

let sequelize;

try {
  if (bookingDbUrl) {
    // Utiliser exactement l'URL fournie (ex: postgres://user:pass@host:port/db)
    console.log(`🔗 [booking-service] Using DATABASE_URL from environment`);
    sequelize = new Sequelize(bookingDbUrl, {
      dialect: 'postgres',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
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
  } else {
    // Construire la chaîne de connexion Postgres depuis les variables d'environnement
    // IMPORTANT: Ne pas utiliser encodeURIComponent si le mot de passe est simple comme "admin"
    const connectionString = `postgresql://${dbUser}:${dbPass}@${dbHost}:${dbPort}/${dbName}`;
    
    console.log(`🔗 [booking-service] Construction URL: postgresql://${dbUser}:***@${dbHost}:${dbPort}/${dbName}`);
    
    sequelize = new Sequelize(connectionString, {
      dialect: 'postgres',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
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
  }

  // Tester la connexion immédiatement
  sequelize.authenticate()
    .then(() => {
      console.log('✅ [booking-service] Connexion DB réussie!');
    })
    .catch(err => {
      console.error('❌ [booking-service] Erreur authentification DB:', err.message);
      console.error('💡 Vérifiez vos identifiants PostgreSQL');
    });

} catch (error) {
  console.error('💥 [booking-service] Erreur création instance Sequelize:', error.message);
  console.error('💡 Vérifiez votre configuration .env');
}

module.exports = sequelize;