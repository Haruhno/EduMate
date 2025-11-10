const express = require('express');
const cors = require('cors');
require('dotenv').config();

const sequelize = require('./config/database');
require('./models/associations');

const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const tutorRoutes = require('./routes/tutorRoutes');
const annonceRoutes = require('./routes/annonceRoutes'); // NOUVEAU

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Servir les fichiers uploadés
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/tutors', tutorRoutes);
app.use('/api/annonces', annonceRoutes); // NOUVEAU

// Route de santé
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'Auth Service',
    routes: [
      '/api/auth',
      '/api/profile',
      '/api/tutors',
      '/api/annonces' // NOUVEAU
    ]
  });
});

// Gestion des erreurs
app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({
    success: false,
    message: 'Erreur interne du serveur'
  });
});

const PORT = process.env.PORT || 3001;

sequelize.sync({ alter: true })
  .then(() => {
    console.log('Base de données synchronisée');
    console.log('Tables disponibles:');
    console.log('   - users');
    console.log('   - profile_tutors'); 
    console.log('   - profile_students');
    console.log('   - diplomas');
    console.log('   - annonces'); // NOUVEAU
    
    app.listen(PORT, () => {
      console.log(`Auth Service démarré sur le port ${PORT}`);
      console.log('Routes disponibles:');
      console.log('   - /api/auth');
      console.log('   - /api/profile');
      console.log('   - /api/tutors');
      console.log('   - /api/annonces'); // NOUVEAU
    });
  })
  .catch(error => {
    console.error('Erreur de synchronisation de la base de données:', error);
  });

module.exports = app;