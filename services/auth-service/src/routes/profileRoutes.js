const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const profileController = require('../controllers/profileController');
const authMiddleware = require('../middlewares/authMiddleware');

const storage = multer.memoryStorage();
// Configuration multer pour l'upload
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers JPEG, PNG et PDF sont autorisés'));
    }
  }
});

// Middleware pour protéger les routes
router.use(authMiddleware);

// Routes existantes
router.post('/save', profileController.saveProfile);
router.get('/', profileController.getProfile);
router.post('/complete', profileController.completeProfile);
router.get('/status', profileController.getProfileStatus);

// Route pour ajouter des compétences
router.post('/skills/add', profileController.addSkills);

// Routes pour les tuteurs/étudiants
router.get('/tutors/:tutorId', profileController.getTutorById);
router.get('/tutors/user/:userId', profileController.getTutorByUserId);
router.get('/students/:studentId', profileController.getStudentById);
router.get('/students/user/:userId', profileController.getStudentByUserId);

// Upload de fichiers
router.post('/upload', profileController.upload.single('file'), profileController.uploadFile);
// Routes pour récupérer les diplômes et expériences d'un utilisateur
router.get('/diplomas/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const { Diploma } = require('../models/associations');

    const diplomas = await Diploma.findAll({
      where: { 
        userId,
        profileType: 'tutor'
      },
      order: [
        ['isCurrent', 'DESC'],
        ['startYear', 'DESC']
      ]
    });

    res.json({
      success: true,
      data: diplomas.map(diploma => ({
        id: diploma.id,
        educationLevel: diploma.educationLevel,
        field: diploma.field,
        school: diploma.school,
        country: diploma.country,
        startYear: diploma.startYear,
        endYear: diploma.endYear,
        isCurrent: diploma.isCurrent,
        diplomaFile: diploma.fileName ? {
          name: diploma.fileName,
          path: diploma.filePath,
          size: diploma.fileSize
        } : null
      }))
    });
  } catch (error) {
    console.error('Erreur récupération diplômes:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des diplômes'
    });
  }
});

router.get('/experiences/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const { Experience } = require('../models/associations');

    const experiences = await Experience.findAll({
      where: { 
        userId,
        profileType: 'tutor'
      },
      order: [
        ['isCurrent', 'DESC'],
        ['startYear', 'DESC'],
        ['startMonth', 'DESC']
      ]
    });

    res.json({
      success: true,
      data: experiences.map(experience => ({
        id: experience.id,
        jobTitle: experience.jobTitle,
        employmentType: experience.employmentType,
        company: experience.company,
        location: experience.location,
        startMonth: experience.startMonth,
        startYear: experience.startYear,
        endMonth: experience.endMonth,
        endYear: experience.endYear,
        isCurrent: experience.isCurrent,
        description: experience.description
      }))
    });
  } catch (error) {
    console.error('Erreur récupération expériences:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des expériences'
    });
  }
});
module.exports = router;