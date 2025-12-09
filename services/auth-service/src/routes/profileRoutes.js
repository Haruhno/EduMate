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

// Routes pour les tuteurs/étudiants
router.get('/tutors/:tutorId', profileController.getTutorById);
router.get('/tutors/user/:userId', profileController.getTutorByUserId);
router.get('/students/:studentId', profileController.getStudentById);
router.get('/students/user/:userId', profileController.getStudentByUserId);

// Upload de fichiers
router.post('/upload', profileController.upload.single('file'), profileController.uploadFile);

module.exports = router;