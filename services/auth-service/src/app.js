const express = require('express');
const cors = require('cors');
require('dotenv').config();

const sequelize = require('./config/database');
const authRoutes = require('./routes/authRoutes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);

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
    console.log('Base de données synchronisée');
    app.listen(PORT, () => {
      console.log(`Auth Service démarré sur le port ${PORT}`);
    });
  })
  .catch(error => {
    console.error('Erreur de synchronisation de la base de données:', error);
  });

module.exports = app;