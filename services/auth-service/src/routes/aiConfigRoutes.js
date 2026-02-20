const express = require('express');
const router = express.Router();
const aiConfigController = require('../controllers/aiConfigController');
const adminMiddleware = require('../middlewares/adminMiddleware');
const authMiddleware = require('../middlewares/authMiddleware');

// Route publique pour les services (config globale)
router.get('/public/global', aiConfigController.getGlobalConfigPublic);

// Routes admin sécurisées
router.get('/admin/all', adminMiddleware, aiConfigController.getAllConfigs);
router.post('/admin/upsert', adminMiddleware, aiConfigController.upsertConfig);
router.delete('/admin/:configId', adminMiddleware, aiConfigController.deleteConfig);
router.patch('/admin/:configId/toggle', adminMiddleware, aiConfigController.toggleConfigStatus);

router.get('/global', authMiddleware, adminMiddleware, aiConfigController.getGlobalConfig);
router.put('/global', authMiddleware, adminMiddleware, aiConfigController.upsertGlobalConfig);
router.patch('/global/toggle', authMiddleware, adminMiddleware, aiConfigController.toggleGlobalConfig);

module.exports = router;