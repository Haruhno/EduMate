const User = require('../models/User');
const bcrypt = require('bcryptjs');

async function initializeAdmin() {
  try {
    const ADMIN_EMAIL = 'admin@edumate.com'; // Constante pour éviter les erreurs
    
    // Chercher si le compte admin existe
    let adminAccount = await User.findOne({ where: { email: ADMIN_EMAIL } });
    
    if (!adminAccount) {
      // Créer le compte admin
      const hashedPassword = await bcrypt.hash('admin', 12);
      
      adminAccount = await User.create({
        email: ADMIN_EMAIL,
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'EduMate',
        role: 'admin',
        isVerified: true,
        phone: null,
        countryCode: '+33'
      });
      
      console.log('✅ Compte admin créé avec succès');
      console.log('   📧 Email: admin@edumate.com');
      console.log('   🔑 Mot de passe: admin');
    } else {
      // S'assurer qu'il est bien admin
      if (adminAccount.role !== 'admin') {
        await adminAccount.update({ role: 'admin' });
        console.log('✅ Compte "admin@edumate.com" promu en administrateur');
      } else {
        console.log('👤 Compte admin existe déjà');
      }
    }

    // S'assurer que c'est le SEUL admin
    // Rétrograder tous les autres utilisateurs qui seraient admin
    const otherAdmins = await User.findAll({
      where: {
        role: 'admin',
        email: { [require('sequelize').Op.ne]: ADMIN_EMAIL } // tous sauf admin@edumate.com
      }
    });

    if (otherAdmins.length > 0) {
      for (const user of otherAdmins) {
        await user.update({ role: 'student' });
        console.log(`⚠️  ${user.email} rétrogradé de admin à student`);
      }
    }

    console.log('🎯 Un seul admin actif: admin@edumate.com');
    
  } catch (error) {
    console.error('❌ Erreur initialisation admin:', error.message);
  }
}

module.exports = initializeAdmin;