const express = require('express');
const { Op, Sequelize } = require('sequelize');
const router = express.Router();
const { ProfileTutor, User } = require('../models/associations');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/seed', authMiddleware, async (req, res) => {
  try {
    const { count = 20 } = req.body;
    
    const tutorsData = [];
    const subjects = [
      'Mathématiques', 'Physique', 'Chimie', 'Français', 'Anglais',
      'Histoire-Géographie', 'SVT', 'Philosophie', 'Économie', 'Informatique',
      'Espagnol', 'Allemand', 'Programmation', 'Statistiques', 'Biologie'
    ];
    
    const firstNames = ['Jean', 'Marie', 'Pierre', 'Sophie', 'Luc', 'Emma', 'Thomas', 'Julie', 'David', 'Sarah'];
    const lastNames = ['Dupont', 'Martin', 'Bernard', 'Dubois', 'Moreau', 'Laurent', 'Simon', 'Lefebvre', 'Garcia'];
    const cities = ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Bordeaux', 'Lille', 'Nantes'];

    // Compter les tuteurs existants pour éviter les doublons d'email
    const existingCount = await User.count({
      where: {
        email: {
          [Op.like]: 'tuteur%@example.com'
        }
      }
    });

    // Créer des utilisateurs et profils tuteurs
    for (let i = 0; i < count; i++) {
      const emailIndex = existingCount + i;
      const user = await User.create({
        email: `tuteur${emailIndex}@example.com`,
        password: 'password123',
        firstName: firstNames[Math.floor(Math.random() * firstNames.length)],
        lastName: lastNames[Math.floor(Math.random() * lastNames.length)],
        role: 'tutor',
        isVerified: true
      });

      // Créer des spécialités variées
      const numSpecialties = Math.floor(Math.random() * 2) + 1;
      const specialties = [];
      for (let j = 0; j < numSpecialties; j++) {
        const subject = subjects[Math.floor(Math.random() * subjects.length)];
        if (!specialties.includes(subject)) {
          specialties.push(subject);
        }
      }

      const city = cities[Math.floor(Math.random() * cities.length)];
      
      const tutorProfile = await ProfileTutor.create({
        userId: user.id,
        specialties: specialties,
        hourlyRate: Math.floor(Math.random() * 40) + 20, // 20-60€
        rating: parseFloat((Math.random() * 1.5 + 3.5).toFixed(1)), // 3.5-5.0
        reviewsCount: Math.floor(Math.random() * 150),
        educationLevel: ['Licence', 'Master', 'Doctorat'][Math.floor(Math.random() * 3)],
        experience: `${Math.floor(Math.random() * 10) + 1} ans d'expérience`,
        bio: `Tuteur passionné spécialisé en ${specialties.join(', ')}. Je m'engage à vous faire progresser !`,
        availability: {
          online: Math.random() > 0.2,
          inPerson: Math.random() > 0.3
        },
        location: {
          address: `${city}, France`,
          city: city,
          coordinates: { 
            lat: 48.8566 + (Math.random() - 0.5) * 10, 
            lng: 2.3522 + (Math.random() - 0.5) * 10 
          }
        },
        isVerified: Math.random() > 0.3,
        isCompleted: true,
        completionPercentage: 100
      });

      tutorsData.push({
        id: tutorProfile.id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email
      });
    }

    const totalTutors = await ProfileTutor.count();

    res.json({
      success: true,
      message: `${count} nouveaux tuteurs créés avec succès ! Total: ${totalTutors} tuteurs`,
      data: {
        created: tutorsData.length,
        total: totalTutors,
        tutors: tutorsData
      }
    });
  } catch (error) {
    console.error('Erreur lors de la création des tuteurs:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création des tuteurs',
      error: error.message
    });
  }
});

// Route pour forcer la création (écrase les existants)
router.post('/seed-force', authMiddleware, async (req, res) => {
  try {
    const { count = 20 } = req.body;
    
    // Supprimer les tuteurs de test existants
    const testUsers = await User.findAll({
      where: {
        email: {
          [Op.like]: 'tuteur%@example.com'
        }
      }
    });

    const userIds = testUsers.map(user => user.id);
    
    if (userIds.length > 0) {
      await ProfileTutor.destroy({
        where: {
          userId: {
            [Op.in]: userIds
          }
        }
      });

      await User.destroy({
        where: {
          id: {
            [Op.in]: userIds
          }
        }
      });
    }

    // Créer de nouveaux tuteurs
    const tutorsData = [];
    const subjects = [
      'Mathématiques', 'Physique', 'Chimie', 'Français', 'Anglais',
      'Histoire-Géographie', 'SVT', 'Philosophie', 'Économie', 'Informatique'
    ];
    
    const firstNames = ['Jean', 'Marie', 'Pierre', 'Sophie', 'Luc', 'Emma', 'Thomas', 'Julie'];
    const lastNames = ['Dupont', 'Martin', 'Bernard', 'Dubois', 'Moreau', 'Laurent', 'Simon', 'Lefebvre'];

    for (let i = 0; i < count; i++) {
      const user = await User.create({
        email: `tuteur${i}@example.com`,
        password: 'password123',
        firstName: firstNames[Math.floor(Math.random() * firstNames.length)],
        lastName: lastNames[Math.floor(Math.random() * lastNames.length)],
        role: 'tutor',
        isVerified: true
      });

      const specialties = [subjects[Math.floor(Math.random() * subjects.length)]];
      if (Math.random() > 0.5) {
        specialties.push(subjects[Math.floor(Math.random() * subjects.length)]);
      }

      const tutorProfile = await ProfileTutor.create({
        userId: user.id,
        specialties: specialties,
        hourlyRate: Math.floor(Math.random() * 50) + 30,
        rating: Math.floor(Math.random() * 2) + 4,
        reviewsCount: Math.floor(Math.random() * 100) + 10,
        educationLevel: ['Licence', 'Master', 'Doctorat'][Math.floor(Math.random() * 3)],
        experience: `${Math.floor(Math.random() * 10) + 1} ans d'expérience`,
        bio: `Tuteur passionné avec une expertise en ${specialties.join(' et ')}`,
        availability: {
          online: Math.random() > 0.3,
          inPerson: Math.random() > 0.5
        },
        location: {
          address: 'Paris, France',
          city: 'Paris',
          coordinates: { lat: 48.8566, lng: 2.3522 }
        },
        isVerified: true,
        isCompleted: true,
        completionPercentage: 100
      });

      tutorsData.push({
        user: user,
        profile: tutorProfile
      });
    }

    res.json({
      success: true,
      message: `${count} tuteurs créés avec succès (anciens tuteurs supprimés)`,
      data: tutorsData
    });
  } catch (error) {
    console.error('Erreur lors de la création forcée des tuteurs:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création des tuteurs'
    });
  }
});

router.get('/search', authMiddleware, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 3,  
      subject, 
      level, 
      minRating, 
      maxPrice, 
      teachingMode, 
      location 
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    // Construction de la clause WHERE
    const whereClause = {
      isVerified: true,
      isCompleted: true
    };

    // Filtre par matière 
    if (subject) {
      whereClause.specialties = {
        [Op.contains]: [subject]  // Utiliser contains pour chercher dans le tableau
      };
    }

    // Filtre par niveau
    if (level) {
      whereClause.educationLevel = {
        [Op.iLike]: `%${level}%`
      };
    }

    // Filtre par prix maximum
    if (maxPrice) {
      whereClause.hourlyRate = {
        [Op.lte]: parseFloat(maxPrice)
      };
    }

    // Filtre par note minimum (sera appliqué après)
    let minRatingValue = minRating ? parseFloat(minRating) : 0;

    // Filtre par localisation
    if (location) {
      whereClause['$location.city$'] = {
        [Op.iLike]: `%${location}%`
      };
    }

    // Filtre par mode d'enseignement - CORRECTION IMPORTANTE
    if (teachingMode) {
      if (teachingMode === 'En ligne') {
        whereClause[Op.and] = [
          Sequelize.literal(`("ProfileTutor"."availability"->>'online')::boolean = true`)
        ];
      } else if (teachingMode === 'En présentiel') {
        whereClause[Op.and] = [
          Sequelize.literal(`("ProfileTutor"."availability"->>'inPerson')::boolean = true`)
        ];
      } else if (teachingMode === 'Les deux') {
        whereClause[Op.and] = [
          Sequelize.literal(`("ProfileTutor"."availability"->>'online')::boolean = true`),
          Sequelize.literal(`("ProfileTutor"."availability"->>'inPerson')::boolean = true`)
        ];
      }
    }

    console.log('Where clause:', JSON.stringify(whereClause, null, 2));

    // Compter le total
    const count = await ProfileTutor.count({
      where: whereClause,
      include: [{
        model: User,
        as: 'user',
        attributes: []
      }]
    });

    // Récupérer les tuteurs
    const tutors = await ProfileTutor.findAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'email']
      }],
      limit: limitNum,
      offset: offset,
      order: [['createdAt', 'DESC']]
    });

    // Appliquer le filtre de rating
    const filteredTutors = minRatingValue > 0 
      ? tutors.filter(tutor => (tutor.rating || 0) >= minRatingValue)
      : tutors;

    const totalPages = Math.ceil(count / limitNum);

    res.json({
      success: true,
      message: 'Tuteurs trouvés avec succès',
      data: {
        tutors: filteredTutors,
        totalTutors: count,
        currentPage: pageNum,
        totalPages: totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    });

  } catch (error) {
    console.error('Erreur lors de la recherche des tuteurs:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la recherche des tuteurs',
      error: error.message
    });
  }
});

// Récupérer tous les tuteurs
router.get('/', authMiddleware, async (req, res) => {
  try {
    const tutors = await ProfileTutor.findAll({
      where: { isVerified: true, isCompleted: true },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'email']
      }]
    });

    res.json({
      success: true,
      message: 'Tuteurs récupérés avec succès',
      data: tutors
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des tuteurs:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des tuteurs'
    });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const tutor = await ProfileTutor.findOne({
      where: { 
        id,
        isVerified: true,
        isCompleted: true 
      },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'email']
      }]
    });

    if (!tutor) {
      return res.status(404).json({
        success: false,
        message: 'Tuteur non trouvé'
      });
    }

    res.json({
      success: true,
      message: 'Tuteur récupéré avec succès',
      data: tutor
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du tuteur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du tuteur',
      error: error.message
    });
  }
});

router.get('/profile/:tutorId', authMiddleware, async (req, res) => {
  try {
    const { tutorId } = req.params;

    const tutor = await ProfileTutor.findOne({
      where: { 
        id: tutorId
      },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'email']
      }]
    });

    if (!tutor) {
      return res.status(404).json({
        success: false,
        message: 'Tuteur non trouvé'
      });
    }

    // Retourner spécifiquement le schedule et availability
    res.json({
      success: true,
      data: {
        schedule: tutor.schedule || [],
        availability: tutor.availability || { online: false, inPerson: false }
      }
    });
  } catch (error) {
    console.error('Erreur récupération profil tuteur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du profil',
      error: error.message
    });
  }
});

module.exports = router;