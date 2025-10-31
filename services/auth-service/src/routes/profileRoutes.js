const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const profileController = require('../controllers/profileController');

// Configuration multer directement dans les routes
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024
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

// Routes
router.post('/save', profileController.saveProfile);
router.get('/', profileController.getProfile);
router.post('/complete', profileController.completeProfile);
router.get('/status', profileController.getProfileStatus);
router.post('/upload', upload.single('file'), profileController.uploadFile);

module.exports = router;