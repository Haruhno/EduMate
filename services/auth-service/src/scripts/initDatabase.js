const sequelize = require('../config/database');
const User = require('../models/User');
const ProfileTutor = require('../models/ProfileTutor');
const ProfileStudent = require('../models/ProfileStudent');

const initDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('Connexion à la base de données établie.');

    // Synchroniser tous les modèles
    await sequelize.sync({ alter: true });
    console.log('Base de données synchronisée avec succès.');

    console.log('Tables créées:');
    console.log('- users');
    console.log('- profile_tutors');
    console.log('- profile_students');

  } catch (error) {
    console.error('Erreur lors de l\'initialisation de la base de données:', error);
    process.exit(1);
  }
};

initDatabase();