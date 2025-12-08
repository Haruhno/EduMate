const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:3001'],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Configuration Multer pour les fichiers
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
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

// Import des agents d'extraction
const CVParserAgent = require('./agents/cv-parser.agent');
const LinkedInParserAgent = require('./agents/linkedin-parser.agent');

// Routes
app.post('/api/v1/extract/cv', upload.single('cv'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Aucun fichier CV fourni'
      });
    }

    console.log('🔍 Analyse intelligente du CV:', req.file.originalname);
    
    // Utiliser l'agent intelligent d'extraction
    const result = await CVParserAgent.parseCV(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    res.json({
      success: true,
      message: 'CV analysé avec succès',
      data: result.data,
      metadata: result.metadata
    });

  } catch (error) {
    console.error('❌ Erreur extraction CV:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de l\'analyse du CV',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.post('/api/v1/extract/linkedin', async (req, res) => {
  try {
    const { linkedinUrl } = req.body;

    if (!linkedinUrl) {
      return res.status(400).json({
        success: false,
        message: 'URL LinkedIn requise'
      });
    }

    console.log('🔗 Extraction LinkedIn:', linkedinUrl);
    
    const result = await LinkedInParserAgent.scrapeLinkedInProfile(linkedinUrl);

    res.json({
      success: true,
      message: 'Profil LinkedIn extrait avec succès',
      data: result.data,
      metadata: result.metadata
    });

  } catch (error) {
    console.error('❌ Erreur extraction LinkedIn:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de l\'extraction LinkedIn'
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'CV Parser AI Service',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    features: ['Extraction intelligente CV', 'Scraping LinkedIn', 'IA intégrée']
  });
});

// Gestion des erreurs
app.use((err, req, res, next) => {
  console.error('❌ Erreur serveur:', err);
  
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message: 'Erreur de téléchargement de fichier',
      error: err.code
    });
  }
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Erreur interne du serveur'
  });
});

const PORT = process.env.PORT || 3004;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 CV Parser AI Service (INTELLIGENT) démarré sur le port ${PORT}`);
  console.log(`📊 Endpoint: http://localhost:${PORT}/api/v1/extract/cv`);
  console.log(`🔗 LinkedIn: http://localhost:${PORT}/api/v1/extract/linkedin`);
  console.log(`🏥 Health: http://localhost:${PORT}/health`);
});

module.exports = app;