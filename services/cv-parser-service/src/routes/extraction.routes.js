const express = require('express');
const router = express.Router();
const multer = require('multer');
const CVParserAgent = require('../agents/cv-parser.agent');
const LinkedInParserAgent = require('../agents/linkedin-parser.agent');

// Configuration multer pour les fichiers
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non supporté. Formats acceptés: PDF, DOC, DOCX, TXT'));
    }
  }
});

/**
 * @route POST /api/v1/extract/cv
 * @desc Analyser un fichier CV
 */
router.post('/cv', upload.single('cv'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Aucun fichier CV fourni'
      });
    }

    console.log('Analyse du CV:', req.file.originalname);

    const result = await CVParserAgent.parseCV(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    res.json({
      success: true,
      message: 'CV analysé avec succès',
      ...result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/v1/extract/linkedin
 * @desc Extraire les données d'un profil LinkedIn
 */
router.post('/linkedin', async (req, res, next) => {
  try {
    const { linkedinUrl } = req.body;

    if (!linkedinUrl) {
      return res.status(400).json({
        success: false,
        message: 'URL LinkedIn requise'
      });
    }

    console.log('Extraction LinkedIn:', linkedinUrl);

    const result = await LinkedInParserAgent.scrapeLinkedInProfile(linkedinUrl);

    res.json({
      success: true,
      message: 'Profil LinkedIn extrait avec succès',
      ...result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/v1/extract/batch
 * @desc Analyser plusieurs CV en batch
 */
router.post('/batch', upload.array('cvs', 10), async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Aucun fichier fourni'
      });
    }

    console.log(`Analyse batch de ${req.files.length} CVs`);

    const results = [];
    const errors = [];

    for (const file of req.files) {
      try {
        const result = await CVParserAgent.parseCV(
          file.buffer,
          file.originalname,
          file.mimetype
        );
        results.push(result);
      } catch (error) {
        errors.push({
          filename: file.originalname,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Analyse batch terminée: ${results.length} succès, ${errors.length} erreurs`,
      data: {
        successful: results,
        failed: errors,
        summary: {
          total: req.files.length,
          successful: results.length,
          failed: errors.length
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/v1/extract/status/:jobId
 * @desc Vérifier le statut d'une extraction
 */
router.get('/status/:jobId', (req, res) => {
  const { jobId } = req.params;
  
  // TODO: Implémenter le suivi des jobs
  res.json({
    success: true,
    data: {
      jobId,
      status: 'completed',
      progress: 100
    }
  });
});

module.exports = router;