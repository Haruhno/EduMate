// services/message-service/src/config/mongodb.js
const mongoose = require('mongoose');

const connectMongoDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/edumate_messages';
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ MongoDB connecté avec succès pour le Message Service');
    
    // Événements de connexion
    mongoose.connection.on('error', (err) => {
      console.error('❌ Erreur MongoDB:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB déconnecté');
    });
    
  } catch (error) {
    console.error('❌ Erreur de connexion MongoDB:', error);
    process.exit(1);
  }
};

module.exports = connectMongoDB;