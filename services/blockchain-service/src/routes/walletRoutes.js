// blockchain-service/src/routes/walletRoutes.js
const express = require('express');
const router = express.Router();
const WalletController = require('../controllers/WalletController');

// Routes utilisateur de base
router.get('/balance', WalletController.getBalance);
router.post('/transfer', WalletController.transfer);
router.get('/history', WalletController.getHistory);
router.post('/withdrawal/request', WalletController.requestWithdrawal);
router.get('/stats', WalletController.getStats);
router.get('/audit', WalletController.generateAuditReport);
router.post('/wallet/create', WalletController.createWallet);

// Route de test
router.get('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Blockchain service fonctionne!',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;