const express = require('express');
const cors = require('cors');
require('dotenv').config();

const sequelize = require('./config/database');
// Importez les associations pour que les modèles soient enregistrés
require('./models/associations');

const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const tutorRoutes = require('./routes/tutorRoutes');

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

// Après les autres routes

app.use('/api/tutors', tutorRoutes);

// Route de santé
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'Auth Service' });
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

// Synchronisation de la base de données et démarrage du serveur
sequelize.sync({ alter: true })
  .then(() => {
    console.log('✅ Base de données synchronisée');
    console.log('📊 Tables disponibles:');
    console.log('   - users');
    console.log('   - profile_tutors'); 
    console.log('   - profile_students');
    
    app.listen(PORT, () => {
      console.log(`🚀 Auth Service démarré sur le port ${PORT}`);
    });
  })
  .catch(error => {
    console.error('❌ Erreur de synchronisation de la base de données:', error);
  });

module.exports = app;