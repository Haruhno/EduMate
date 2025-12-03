// blockchain-service/src/controllers/WalletController.js
const { Wallet, LedgerBlock, Transaction, WithdrawalRequest, User } = require('../models/associations');
const WalletService = require('../services/WalletService');

class WalletController {
  
  async getBalance(req, res) {
    try {
      const userId = req.query.userId;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'userId requis dans les paramètres de requête'
        });
      }

      // Créer automatiquement le wallet s'il n'existe pas
      let wallet = await Wallet.findOne({ where: { userId } });
      if (!wallet) {
        console.log(`🆕 Création automatique du wallet pour userId: ${userId}`);
        wallet = await WalletService.createWallet(userId);
      }

      const balance = await WalletService.getWalletBalance(userId);
      res.json({
        success: true,
        message: 'Solde récupéré avec succès',
        data: balance
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  async getHistory(req, res) {
    try {
      const userId = req.query.userId;
      const { page, limit, startDate, endDate, transactionType } = req.query;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'userId requis dans les paramètres de requête'
        });
      }

      const history = await WalletService.getWalletHistory(userId, {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
        startDate,
        endDate,
        transactionType
      });

      res.json({
        success: true,
        message: 'Historique récupéré avec succès',
        data: history
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  async transfer(req, res) {
    try {
      const { fromUserId, toWalletAddress, amount, description, metadata } = req.body;

      if (!fromUserId) {
        return res.status(400).json({
          success: false,
          message: 'fromUserId requis dans le body'
        });
      }

      const result = await WalletService.transferCredits(
        fromUserId, 
        toWalletAddress, 
        amount, 
        description, 
        metadata
      );

      res.json({
        success: true,
        message: 'Transfert effectué avec succès',
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  async getStats(req, res) {
    try {
      const userId = req.query.userId;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'userId requis dans les paramètres de requête'
        });
      }

      const stats = await WalletService.getWalletStats(userId);
      res.json({
        success: true,
        message: 'Statistiques récupérées avec succès',
        data: stats
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  async generateAuditReport(req, res) {
    try {
      const userId = req.query.userId;
      const { startDate, endDate } = req.query;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'userId requis dans les paramètres de requête'
        });
      }

      const report = await WalletService.generateAuditReport(userId, startDate, endDate);
      res.json({
        success: true,
        message: 'Rapport d\'audit généré avec succès',
        data: report
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  async requestWithdrawal(req, res) {
    try {
      const { walletId, amount, bankDetails } = req.body;

      if (!walletId) {
        return res.status(400).json({
          success: false,
          message: 'walletId requis dans le body'
        });
      }

      const result = await WalletService.requestWithdrawal(walletId, amount, bankDetails);
      res.json({
        success: true,
        message: 'Demande de retrait créée avec succès',
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Nouvelle méthode pour créer un wallet
  async createWallet(req, res) {
    try {
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'userId requis dans le body'
        });
      }

      const wallet = await WalletService.createWallet(userId);
      res.json({
        success: true,
        message: 'Wallet créé avec succès',
        data: wallet
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = new WalletController();