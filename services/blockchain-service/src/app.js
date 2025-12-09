// blockchain-service/src/app.js
const express = require('express');
const cors = require('cors');
const sequelize = require('./config/database');

const app = express();

// Configuration CORS
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: false
}));

// Middleware pour logger les requêtes (AJOUTER ÇA)
app.use((req, res, next) => {
  console.log(`📨 [Blockchain] ${req.method} ${req.url}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('📦 Body:', JSON.stringify(req.body));
  }
  next();
});

app.use(express.json());

// Import simple APRÈS la configuration de app
const walletRoutes = require('./routes/walletRoutes');

// Routes
app.use('/api/blockchain', walletRoutes);

// Route de santé
app.get('/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    
    const [tables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('wallets', 'ledger_blocks', 'transactions', 'withdrawal_requests')
    `);
    
    const existingTables = tables.map(t => t.table_name);
    
    res.json({ 
      status: 'OK', 
      service: 'Blockchain Service',
      database: 'Connected',
      blockchain_tables: existingTables,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      service: 'Blockchain Service', 
      database: 'Disconnected',
      error: error.message
    });
  }
});

// Gestion des erreurs
app.use((error, req, res, next) => {
  console.error('💥 Erreur globale blockchain:', error);
  res.status(500).json({
    success: false,
    message: 'Erreur interne du serveur',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// Route 404
app.use('*', (req, res) => {
  console.log(`❌ Route non trouvée: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: 'Route non trouvée'
  });
});

const PORT = process.env.PORT || 3003;

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Connexion à la base de données établie');
    
    app.listen(PORT, () => {
      console.log(`🚀 Blockchain Service démarré sur le port ${PORT}`);
      console.log('📍 Routes disponibles:');
      console.log('   - /api/blockchain/balance');
      console.log('   - /api/blockchain/transfer');
      console.log('   - /api/blockchain/transfer/booking-pending (NOUVELLE)');
      console.log('   - /api/blockchain/transfer/booking-confirm (NOUVELLE)');
      console.log('   - /api/blockchain/history');
      console.log('   - /api/blockchain/stats');
      console.log('   - /api/blockchain/test');
      console.log('   - /health');
    });
  } catch (error) {
    console.error('❌ Erreur démarrage serveur:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;