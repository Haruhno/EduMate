// blockchain-service/src/routes/walletRoutes.js
const express = require('express');
const router = express.Router();
const WalletController = require('../controllers/WalletController');

// AJOUTE CES IMPORTS MANQUANTS
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const BlockchainService = require('../services/BlockchainService');
const sequelize = require('../config/database');

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

// === ROUTES POUR LES RÉSERVATIONS ===

// Route pour créer une transaction PENDING pour réservation
router.post('/transfer/booking-pending', async (req, res) => {
  try {
    console.log('🎯 [Blockchain] Création transaction PENDING pour réservation');
    console.log('📦 [Blockchain] Body:', req.body);
    
    const { fromUserId, toUserId, amount, description, metadata } = req.body;
    
    if (!fromUserId || !toUserId || !amount) {
      console.error('❌ [Blockchain] Paramètres manquants');
      return res.status(400).json({ 
        success: false, 
        message: 'fromUserId, toUserId et amount requis' 
      });
    }

    console.log(`👤 [Blockchain] fromUserId: ${fromUserId}, toUserId: ${toUserId}, amount: ${amount}`);

    // Récupérer les wallets
    const fromWallet = await Wallet.findOne({ where: { userId: fromUserId } });
    const toWallet = await Wallet.findOne({ where: { userId: toUserId } });

    if (!fromWallet) {
      console.error(`❌ [Blockchain] Wallet expéditeur non trouvé pour userId: ${fromUserId}`);
      return res.status(404).json({ 
        success: false, 
        message: `Wallet expéditeur non trouvé pour l'utilisateur ${fromUserId}` 
      });
    }

    if (!toWallet) {
      console.error(`❌ [Blockchain] Wallet destinataire non trouvé pour userId: ${toUserId}`);
      return res.status(404).json({ 
        success: false, 
        message: `Wallet destinataire non trouvé pour l'utilisateur ${toUserId}` 
      });
    }

    console.log(`✅ [Blockchain] Wallets trouvés: from=${fromWallet.id}, to=${toWallet.id}`);

    // Créer une transaction avec statut PENDING
    const transaction = await Transaction.create({
      fromWalletId: fromWallet.id,
      toWalletId: toWallet.id,
      amount: amount,
      transactionType: 'TUTOR_SESSION',
      status: 'pending', // IMPORTANT: statut pending, pas completed
      description: description || 'Réservation de cours en attente',
      metadata: {
        ...metadata,
        isPending: true,
        pendingSince: new Date().toISOString(),
        bookingStatus: 'PENDING',
        bookingId: metadata?.bookingId || null,
        annonceId: metadata?.annonceId || null
      }
    });

    console.log(`✅ [Blockchain] Transaction PENDING créée: ${transaction.id}`);

    // Créer un bloc ledger spécial pour les transactions en attente
    const ledgerBlock = await BlockchainService.createLedgerBlock({
      payload: {
        transactionId: transaction.id,
        fromUserId: fromUserId,
        toUserId: toUserId,
        fromWalletId: fromWallet.id,
        toWalletId: toWallet.id,
        amount: amount,
        description: description,
        status: 'PENDING',
        metadata: metadata
      },
      blockType: 'TRANSFER_PENDING'
    });

    console.log(`✅ [Blockchain] Bloc ledger créé: ${ledgerBlock.id}`);

    res.json({
      success: true,
      message: 'Transaction PENDING créée avec succès',
      data: {
        transaction: {
          id: transaction.id,
          amount: transaction.amount,
          status: transaction.status,
          metadata: transaction.metadata
        },
        ledgerBlock: {
          id: ledgerBlock.id,
          hash: ledgerBlock.hash,
          timestamp: ledgerBlock.timestamp
        },
        note: 'Le tuteur doit confirmer pour finaliser la transaction'
      }
    });
  } catch (error) {
    console.error('💥 [Blockchain] Erreur création transaction PENDING:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Route pour confirmer une transaction PENDING
router.post('/transfer/booking-confirm', async (req, res) => {
  try {
    console.log('✅ [Blockchain] Confirmation transaction PENDING');
    console.log('📦 [Blockchain] Body:', req.body);
    
    const { transactionId, bookingId, confirmedBy, metadata } = req.body;
    
    if (!transactionId) {
      return res.status(400).json({ 
        success: false, 
        message: 'transactionId requis' 
      });
    }

    console.log(`🔍 [Blockchain] Recherche transaction: ${transactionId}`);

    // Récupérer la transaction PENDING
    const transaction = await Transaction.findByPk(transactionId);
    if (!transaction) {
      console.error(`❌ [Blockchain] Transaction non trouvée: ${transactionId}`);
      return res.status(404).json({ 
        success: false, 
        message: 'Transaction PENDING non trouvée' 
      });
    }

    if (transaction.status !== 'pending') {
      console.error(`❌ [Blockchain] Transaction déjà traitée, status: ${transaction.status}`);
      return res.status(400).json({ 
        success: false, 
        message: `La transaction a déjà le statut: ${transaction.status}` 
      });
    }

    // Récupérer les wallets
    const fromWallet = await Wallet.findByPk(transaction.fromWalletId);
    const toWallet = await Wallet.findByPk(transaction.toWalletId);
    
    if (!fromWallet || !toWallet) {
      console.error(`❌ [Blockchain] Wallets non trouvés: from=${transaction.fromWalletId}, to=${transaction.toWalletId}`);
      return res.status(404).json({ 
        success: false, 
        message: 'Wallet non trouvé' 
      });
    }

    // Vérifier le solde de l'étudiant
    const availableBalance = parseFloat(fromWallet.balanceCredits);
    const transferAmount = parseFloat(transaction.amount);
    
    console.log(`💰 [Blockchain] Solde disponible: ${availableBalance}, Montant: ${transferAmount}`);
    
    if (availableBalance < transferAmount) {
      console.error(`❌ [Blockchain] Solde insuffisant: ${availableBalance} < ${transferAmount}`);
      return res.status(402).json({ 
        success: false, 
        message: `Solde insuffisant. Disponible: ${availableBalance}, Requis: ${transferAmount}` 
      });
    }

    const dbTransaction = await sequelize.transaction();
    
    try {
      // Effectuer le transfert réel
      fromWallet.balanceCredits = availableBalance - transferAmount;
      toWallet.balanceCredits = parseFloat(toWallet.balanceCredits) + transferAmount;
      
      await fromWallet.save({ transaction: dbTransaction });
      await toWallet.save({ transaction: dbTransaction });

      // Mettre à jour la transaction
      transaction.status = 'completed';
      transaction.metadata = {
        ...transaction.metadata,
        isPending: false,
        confirmedAt: new Date().toISOString(),
        confirmedBy: confirmedBy,
        bookingId: bookingId,
        ...metadata
      };
      await transaction.save({ transaction: dbTransaction });

      // Créer un bloc ledger de confirmation
      const ledgerBlock = await BlockchainService.createLedgerBlock({
        payload: {
          originalTransactionId: transactionId,
          bookingId: bookingId,
          fromUserId: fromWallet.userId,
          toUserId: toWallet.userId,
          fromWalletId: fromWallet.id,
          toWalletId: toWallet.id,
          amount: transaction.amount,
          confirmedBy: confirmedBy,
          metadata: metadata
        },
        blockType: 'TRANSFER_CONFIRMED'
      }, dbTransaction);

      // Lier la transaction au bloc ledger
      transaction.referenceLedgerId = ledgerBlock.id;
      await transaction.save({ transaction: dbTransaction });

      await dbTransaction.commit();

      console.log(`✅ [Blockchain] Transaction confirmée: ${transaction.id}, montant transféré: ${transferAmount}`);

      res.json({
        success: true,
        message: 'Transaction confirmée avec succès',
        data: {
          transaction: transaction,
          ledgerBlock: ledgerBlock,
          fromUser: {
            id: fromWallet.userId,
            newBalance: parseFloat(fromWallet.balanceCredits)
          },
          toUser: {
            id: toWallet.userId,
            newBalance: parseFloat(toWallet.balanceCredits)
          }
        }
      });
    } catch (error) {
      await dbTransaction.rollback();
      console.error('💥 [Blockchain] Erreur lors de la confirmation:', error);
      throw error;
    }
  } catch (error) {
    console.error('💥 [Blockchain] Erreur confirmation transaction:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Route pour annuler une transaction PENDING
router.post('/transfer/booking-cancel', async (req, res) => {
  try {
    const { transactionId, bookingId, cancelledBy, reason, metadata } = req.body;
    
    if (!transactionId) {
      return res.status(400).json({ 
        success: false, 
        message: 'transactionId requis' 
      });
    }

    const transaction = await Transaction.findByPk(transactionId);
    if (!transaction) {
      return res.status(404).json({ 
        success: false, 
        message: 'Transaction non trouvée' 
      });
    }

    transaction.status = 'cancelled';
    transaction.metadata = {
      ...transaction.metadata,
      cancelledAt: new Date().toISOString(),
      cancelledBy: cancelledBy,
      reason: reason,
      bookingId: bookingId,
      ...metadata
    };
    
    await transaction.save();

    // Créer un bloc ledger d'annulation
    const ledgerBlock = await BlockchainService.createLedgerBlock({
      payload: {
        originalTransactionId: transactionId,
        bookingId: bookingId,
        cancelledBy: cancelledBy,
        reason: reason,
        metadata: metadata
      },
      blockType: 'TRANSFER_CANCELLED'
    });

    res.json({
      success: true,
      message: 'Transaction annulée avec succès',
      data: {
        transaction,
        ledgerBlock
      }
    });
  } catch (error) {
    console.error('Erreur annulation transaction:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

module.exports = router;