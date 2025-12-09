// booking-service/app.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const sequelize = require('./config/database');
require('./models/Reservation'); // init model

const bookingRoutes = require('./routes/bookingRoutes');

const app = express();

// Configuration CORS
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/api/booking', bookingRoutes);

app.get('/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    
    const [tables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'reservations'
    `);
    
    res.json({ 
      status: 'OK',
      service: 'Booking Service',
      database: 'Connected',
      tables: tables.map(t => t.table_name),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      service: 'Booking Service', 
      database: 'Disconnected',
      error: error.message
    });
  }
});

// Gestion des erreurs
app.use((err, req, res, next) => {
  console.error('Erreur globale booking-service:', err);
  res.status(500).json({ 
    success: false, 
    message: 'Erreur interne booking-service',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 3010;

// Synchronisation sécurisée (sans force: true pour garder les données)
sequelize.sync({ alter: true })
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Booking Service démarré sur le port ${PORT}`);
      console.log('📍 Routes disponibles:');
      console.log('   - POST   /api/booking/');
      console.log('   - PATCH  /api/booking/:id/confirm');
      console.log('   - PATCH  /api/booking/:id/cancel');
      console.log('   - PATCH  /api/booking/:id/complete');
      console.log('   - GET    /api/booking/user/:userId');
      console.log('   - GET    /api/booking/tutor/:tutorId');
      console.log('   - GET    /api/booking/:id');
      console.log('   - GET    /api/booking/:userId/stats');
      console.log('   - POST   /api/booking/webhook/blockchain');
      console.log('   - GET    /health');
    });
  })
  .catch(err => {
    console.error('❌ Erreur DB booking-service:', err);
    process.exit(1);
  });

module.exports = app;