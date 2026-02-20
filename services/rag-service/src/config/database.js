const { Pool } = require('pg');
require('dotenv').config();

console.log('🔍 Configuration PostgreSQL:');
console.log(`   Host: ${process.env.POSTGRES_HOST || 'localhost'}`);
console.log(`   Port: ${process.env.POSTGRES_PORT || 5432}`);
console.log(`   DB: ${process.env.POSTGRES_DB || 'edumate'}`);

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'edumate',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'admin',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test de connexion immédiat
async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as time, version() as version');
    console.log('✅ PostgreSQL connecté:');
    console.log(`   - Heure: ${result.rows[0].time}`);
    console.log(`   - Version: ${result.rows[0].version.split('\n')[0]}`);
    
    // Vérifier les annonces
    const annonces = await client.query('SELECT COUNT(*) as count FROM annonces WHERE "isActive" = true');
    console.log(`   - Annonces actives: ${annonces.rows[0].count}`);
    
    client.release();
    return true;
  } catch (error) {
    console.error('❌ PostgreSQL non connecté:', error.message);
    return false;
  }
}

// Tester la connexion au démarrage
testConnection().then(success => {
  if (!success) {
    console.log('💡 Vérifiez que:');
    console.log('   1. PostgreSQL est démarré');
    console.log('   2. La base "edumate" existe');
    console.log('   3. Les identifiants sont corrects');
  }
});

pool.on('error', (err) => {
  console.error('❌ Erreur PostgreSQL:', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
  testConnection
};