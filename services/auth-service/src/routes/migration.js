// backend/routes/migration.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { User, ProfileTutor } = require('../models/associations');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/migrate-to-tutor', authMiddleware, auth, async (req, res) => {
  try {
    const { specialties, hourlyRate, experience, availability } = req.body;
    const userId = req.user.id;

    // Vérifier que l'utilisateur est bien un étudiant
    if (req.user.role !== 'student') {
      return res.status(400).json({
        success: false,
        message: 'Seuls les étudiants peuvent migrer vers un compte tuteur'
      });
    }

    // Mettre à jour le rôle de l'utilisateur
    await User.update(
      { role: 'tutor' },
      { where: { id: userId } }
    );

    // Créer le profil tuteur
    const tutorProfile = await ProfileTutor.create({
      userId,
      specialties,
      hourlyRate,
      experience,
      availability,
      isVerified: false, // À vérifier par l'admin
      isCompleted: true,
      completionPercentage: 100
    });

    // Récupérer l'utilisateur mis à jour
    const updatedUser = await User.findByPk(userId);

    res.json({
      success: true,
      message: 'Compte migré vers tuteur avec succès',
      data: {
        user: updatedUser,
        tutorProfile
      }
    });

  } catch (error) {
    console.error('Erreur migration vers tuteur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la migration'
    });
  }
});

module.exports = router;