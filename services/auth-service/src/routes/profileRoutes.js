const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const profileController = require('../controllers/profileController');
const authMiddleware = require('../middlewares/authMiddleware');

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

// Routes sécurisées par middleware
router.get('/status', authMiddleware, profileController.getProfileStatus);
router.get('/', authMiddleware, profileController.getProfile);
router.post('/save', authMiddleware, profileController.saveProfile);
router.post('/complete', authMiddleware, profileController.completeProfile);
router.post('/upload', authMiddleware, upload.single('file'), profileController.uploadFile);

router.get('/tutor/:tutorId', profileController.getTutorById);

module.exports = router;
