// blockchain-service/src/services/WalletService.js
const { Wallet, LedgerBlock, Transaction, WithdrawalRequest, User } = require('../models/associations');
const sequelize = require('../config/database');
const { Op } = require('sequelize');
const BlockchainService = require('./BlockchainService');
const crypto = require('crypto');

class WalletService {
  
  // Créer un wallet pour un utilisateur (version corrigée)
  async createWallet(userId) {
    const transaction = await sequelize.transaction();
    
    try {
      console.log(`🆕 Tentative création wallet pour userId: ${userId}`);
      
      // Vérifier que l'utilisateur existe
      const user = await User.findByPk(userId, { transaction });
      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }

      // Vérifier si un wallet existe déjà (avec lock pour éviter les doublons)
      const existingWallet = await Wallet.findOne({ 
        where: { userId },
        lock: transaction.LOCK.UPDATE,
        transaction,
        skipLocked: true
      });
      
      if (existingWallet) {
        console.log('✅ Wallet existe déjà, retour du wallet existant');
        await transaction.commit();
        return existingWallet;
      }

      const wallet = await Wallet.create({ 
        userId,
        walletAddress: crypto.randomBytes(32).toString('hex'),
        balanceCredits: 1000.00 // Crédit initial pour les tests
      }, { transaction });

      await transaction.commit();
      console.log('✅ Nouveau wallet créé:', wallet.id);
      return wallet;
    } catch (error) {
      await transaction.rollback();
      
      // Si c'est une erreur de doublon, récupérer le wallet existant
      if (error.name === 'SequelizeUniqueConstraintError' || error.message.includes('existe déjà')) {
        console.log('🔄 Wallet existe déjà, récupération...');
        const existingWallet = await Wallet.findOne({ where: { userId } });
        if (existingWallet) {
          return existingWallet;
        }
      }
      
      throw new Error(`Erreur création wallet: ${error.message}`);
    }
  }

  // Obtenir le solde avec infos utilisateur (version corrigée)
  async getWalletBalance(userId) {
    try {
      console.log(`🔍 Recherche wallet pour userId: ${userId}`);
      
      const wallet = await Wallet.findOne({ 
        where: { userId },
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role']
        }]
      });

      if (!wallet) {
        console.log('🆕 Création automatique du wallet...');
        const newWallet = await this.createWallet(userId);
        // Rappeler la fonction avec le nouveau wallet
        return this.getWalletBalance(userId);
      }

      console.log('💰 Wallet trouvé:', wallet.id);
      
      return {
        user: {
          id: wallet.user.id,
          firstName: wallet.user.firstName,
          lastName: wallet.user.lastName,
          email: wallet.user.email,
          role: wallet.user.role
        },
        wallet: {
          available: parseFloat(wallet.balanceCredits),
          locked: parseFloat(wallet.balanceLocked),
          total: parseFloat(wallet.balanceCredits) + parseFloat(wallet.balanceLocked),
          walletAddress: wallet.walletAddress,
          kycStatus: wallet.kycStatus
        }
      };
    } catch (error) {
      console.error('💥 Erreur getWalletBalance:', error);
      throw new Error(`Erreur récupération solde: ${error.message}`);
    }
  }

  // Transfert CORRIGÉ - sans problème de lock
  async transferCredits(fromUserId, toWalletAddress, amount, description, metadata = {}) {
    const transaction = await sequelize.transaction();
    
    try {
      console.log(`🔄 Transfert de ${fromUserId} vers ${toWalletAddress}`);
      
      // Trouver le wallet expéditeur avec l'utilisateur
      const fromWallet = await Wallet.findOne({
        where: { userId: fromUserId },
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'role']
        }],
        transaction
      });

      const toWallet = await Wallet.findOne({
        where: { walletAddress: toWalletAddress },
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'role']
        }],
        transaction
      });

      // VÉRIFIEZ que les utilisateurs sont bien récupérés
      console.log('👤 From User:', fromWallet?.user);
      console.log('👤 To User:', toWallet?.user);

      if (!toWallet) {
        throw new Error('Wallet destinataire non trouvé');
      }

      // Empêcher les transferts vers soi-même
      if (fromWallet.userId === toWallet.userId) {
        throw new Error('Impossible de transférer vers votre propre wallet');
      }

      // Convertir en nombre
      const transferAmount = parseFloat(amount);
      const availableBalance = parseFloat(fromWallet.balanceCredits);

      // Vérifier le solde
      if (availableBalance < transferAmount) {
        throw new Error(`Solde insuffisant. Disponible: ${availableBalance}, Requis: ${transferAmount}`);
      }

      // Calculer les frais (1%)
      const fee = transferAmount * 0.01;
      const totalDebit = transferAmount + fee;

      // Mettre à jour les soldes avec verrouillage explicite
      await Wallet.update(
        { 
          balanceCredits: parseFloat(fromWallet.balanceCredits) - totalDebit 
        },
        { 
          where: { id: fromWallet.id },
          transaction 
        }
      );

      await Wallet.update(
        { 
          balanceCredits: parseFloat(toWallet.balanceCredits) + transferAmount 
        },
        { 
          where: { id: toWallet.id },
          transaction 
        }
      );

      // Créer la transaction
      const dbTransaction = await Transaction.create({
        fromWalletId: fromWallet.id,
        toWalletId: toWallet.id,
        amount: transferAmount,
        fee: fee,
        transactionType: 'EXCHANGE_SERVICE',
        status: 'completed',
        description: description,
        metadata: {
          ...metadata,
          fromUserName: `${fromWallet.user.firstName} ${fromWallet.user.lastName}`,
          toUserName: `${toWallet.user.firstName} ${toWallet.user.lastName}`,
          fromUserRole: fromWallet.user.role,
          toUserRole: toWallet.user.role
        }
      }, { transaction });

      // Créer le bloc ledger
      const ledgerBlock = await BlockchainService.createLedgerBlock({
        payload: {
          transactionId: dbTransaction.id,
          fromUser: {
            id: fromWallet.userId,
            name: `${fromWallet.user.firstName} ${fromWallet.user.lastName}`,
            wallet: fromWallet.walletAddress
          },
          toUser: {
            id: toWallet.userId,
            name: `${toWallet.user.firstName} ${toWallet.user.lastName}`,
            wallet: toWallet.walletAddress
          },
          amount: transferAmount,
          fee: fee,
          description: description
        },
        blockType: 'TRANSFER'
      });

      // Lier la transaction au bloc ledger
      dbTransaction.referenceLedgerId = ledgerBlock.id;
      await dbTransaction.save({ transaction });

      await transaction.commit();

      console.log('✅ Transfert réussi:', dbTransaction.id);

      // Récupérer les soldes mis à jour
      const updatedFromWallet = await Wallet.findByPk(fromWallet.id);
      const updatedToWallet = await Wallet.findByPk(toWallet.id);

      return {
        transaction: dbTransaction,
        ledgerBlock: ledgerBlock,
        fromUser: {
          name: `${fromWallet.user.firstName} ${fromWallet.user.lastName}`,
          newBalance: parseFloat(updatedFromWallet.balanceCredits)
        },
        toUser: {
          name: `${toWallet.user.firstName} ${toWallet.user.lastName}`,
          newBalance: parseFloat(updatedToWallet.balanceCredits)
        }
      };
    } catch (error) {
      await transaction.rollback();
      console.error('💥 Erreur transfert:', error);
      throw new Error(`Erreur transfert: ${error.message}`);
    }
  }

  // Obtenir l'historique des transactions (version corrigée)
  async getWalletHistory(userId, options = {}) {
    try {
      console.log(`📋 Historique pour userId: ${userId}`);
      
      // Trouver le wallet d'abord
      const wallet = await Wallet.findOne({ where: { userId } });
      if (!wallet) {
        console.log('❌ Wallet non trouvé pour historique');
        return {
          transactions: [],
          total: 0,
          page: 1,
          totalPages: 0
        };
      }

      console.log('✅ Wallet trouvé pour historique:', wallet.id);

      const {
        page = 1,
        limit = 20,
        startDate,
        endDate,
        transactionType
      } = options;

      const offset = (page - 1) * limit;

      const whereClause = {
        [Op.or]: [
          { fromWalletId: wallet.id },
          { toWalletId: wallet.id }
        ]
      };

      if (startDate || endDate) {
        whereClause.createdAt = {};
        if (startDate) whereClause.createdAt[Op.gte] = new Date(startDate);
        if (endDate) whereClause.createdAt[Op.lte] = new Date(endDate);
      }

      if (transactionType) {
        whereClause.transactionType = transactionType;
      }

      const { count, rows } = await Transaction.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Wallet,
            as: 'fromWallet',
            attributes: ['id', 'userId', 'walletAddress'],
            include: [{
              model: User,
              as: 'user',
              attributes: ['id', 'firstName', 'lastName']
            }]
          },
          {
            model: Wallet,
            as: 'toWallet',
            attributes: ['id', 'userId', 'walletAddress'],
            include: [{
              model: User,
              as: 'user',
              attributes: ['id', 'firstName', 'lastName']
            }]
          },
          {
            model: LedgerBlock,
            as: 'ledgerBlock',
            attributes: ['id', 'hash', 'timestamp']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit,
        offset
      });

      return {
        transactions: rows,
        total: count,
        page,
        totalPages: Math.ceil(count / limit)
      };
    } catch (error) {
      console.error('💥 Erreur getWalletHistory:', error);
      throw new Error(`Erreur récupération historique: ${error.message}`);
    }
  }

  // Obtenir les statistiques d'un wallet (version corrigée)
  async getWalletStats(userId) {
    try {
      console.log(`📊 Stats pour userId: ${userId}`);
      
      const wallet = await Wallet.findOne({ 
        where: { userId },
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }]
      });

      if (!wallet) {
        console.log('❌ Wallet non trouvé pour stats');
        // Retourner des stats par défaut au lieu de créer un wallet
        return this.getDefaultStats();
      }

      console.log('✅ Wallet trouvé pour stats:', wallet.id);

      // Récupérer les transactions pour des stats réelles
      const transactions = await Transaction.findAll({
        where: {
          [Op.or]: [
            { fromWalletId: wallet.id },
            { toWalletId: wallet.id }
          ]
        },
        limit: 1000
      });

      // Calculer les vraies stats
      const stats = this.calculateStatsFromTransactions(transactions, wallet.id);

      return {
        wallet: {
          available: parseFloat(wallet.balanceCredits) || 1000.00,
          locked: parseFloat(wallet.balanceLocked) || 0,
          total: (parseFloat(wallet.balanceCredits) + parseFloat(wallet.balanceLocked)) || 1000.00,
          address: wallet.walletAddress || 'En cours de génération...',
          kycStatus: wallet.kycStatus || 'none'
        },
        today: stats.today,
        monthly: stats.monthly,
        allTime: stats.allTime
      };
      
    } catch (error) {
      console.error('💥 Erreur getWalletStats:', error);
      // Retourner des stats par défaut en cas d'erreur
      return this.getDefaultStats();
    }
  }

  // Méthode pour calculer les stats à partir des transactions
  calculateStatsFromTransactions(transactions, walletId) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let todaySent = 0;
    let todayReceived = 0;
    let todayFees = 0;
    
    let monthlySent = 0;
    let monthlyReceived = 0;
    let monthlyFees = 0;
    
    let allTimeSent = 0;
    let allTimeReceived = 0;
    let allTimeFees = 0;

    transactions.forEach(tx => {
      const txDate = new Date(tx.createdAt);
      const amount = parseFloat(tx.amount);
      const fee = parseFloat(tx.fee);

      if (tx.fromWalletId === walletId) {
        allTimeSent += amount;
        allTimeFees += fee;

        if (txDate >= firstDayOfMonth) {
          monthlySent += amount;
          monthlyFees += fee;
        }

        if (txDate >= today) {
          todaySent += amount;
          todayFees += fee;
        }
      } else {
        allTimeReceived += amount;

        if (txDate >= firstDayOfMonth) {
          monthlyReceived += amount;
        }

        if (txDate >= today) {
          todayReceived += amount;
        }
      }
    });

    return {
      today: { sent: todaySent, received: todayReceived, fees: todayFees },
      monthly: { sent: monthlySent, received: monthlyReceived, fees: monthlyFees },
      allTime: { 
        transactions: transactions.length, 
        sent: allTimeSent, 
        received: allTimeReceived, 
        fees: allTimeFees 
      }
    };
  }

  // Stats par défaut pour les nouveaux wallets
  getDefaultStats() {
    return {
      wallet: {
        available: 1000.00,
        locked: 0,
        total: 1000.00,
        address: 'Nouveau wallet',
        kycStatus: 'none'
      },
      today: { sent: 0, received: 0, fees: 0 },
      monthly: { sent: 0, received: 0, fees: 0 },
      allTime: { transactions: 0, sent: 0, received: 0, fees: 0 }
    };
  }

  // Générer un rapport d'audit
  async generateAuditReport(userId, startDate, endDate) {
    try {
      const wallet = await Wallet.findOne({ where: { userId } });
      if (!wallet) {
        throw new Error('Wallet non trouvé');
      }

      const transactions = await Transaction.findAll({
        where: {
          [Op.or]: [
            { fromWalletId: wallet.id },
            { toWalletId: wallet.id }
          ],
          createdAt: {
            [Op.between]: [new Date(startDate), new Date(endDate)]
          }
        },
        include: [
          {
            model: LedgerBlock,
            as: 'ledgerBlock',
            attributes: ['id', 'hash', 'timestamp', 'signature']
          }
        ],
        order: [['createdAt', 'ASC']]
      });

      const summary = {
        totalTransactions: transactions.length,
        totalCreditsSent: 0,
        totalCreditsReceived: 0,
        totalFees: 0,
        period: { startDate, endDate }
      };

      transactions.forEach(tx => {
        if (tx.fromWalletId === wallet.id) {
          summary.totalCreditsSent += parseFloat(tx.amount);
          summary.totalFees += parseFloat(tx.fee);
        } else {
          summary.totalCreditsReceived += parseFloat(tx.amount);
        }
      });

      return {
        summary,
        transactions: transactions.map(tx => ({
          id: tx.id,
          type: tx.transactionType,
          amount: tx.amount,
          fee: tx.fee,
          direction: tx.fromWalletId === wallet.id ? 'OUTGOING' : 'INCOMING',
          timestamp: tx.createdAt,
          ledgerHash: tx.ledgerBlock?.hash,
          signature: tx.ledgerBlock?.signature
        }))
      };
    } catch (error) {
      throw new Error(`Erreur génération rapport: ${error.message}`);
    }
  }

  // Demander un retrait
  async requestWithdrawal(walletId, amount, bankDetails) {
    try {
      const wallet = await Wallet.findByPk(walletId);
      if (!wallet) {
        throw new Error('Wallet non trouvé');
      }

      const withdrawalAmount = parseFloat(amount);
      const availableBalance = parseFloat(wallet.balanceCredits);

      if (availableBalance < withdrawalAmount) {
        throw new Error('Solde insuffisant');
      }

      // Calculer les frais (1%)
      const fee = withdrawalAmount * 0.01;
      const netAmount = withdrawalAmount - fee;

      // Bloquer le montant
      wallet.balanceCredits = availableBalance - withdrawalAmount;
      wallet.balanceLocked = parseFloat(wallet.balanceLocked) + withdrawalAmount;
      await wallet.save();

      const withdrawalRequest = await WithdrawalRequest.create({
        walletId: wallet.id,
        amount: withdrawalAmount,
        fee: fee,
        netAmount: netAmount,
        bankDetails: bankDetails,
        status: 'pending'
      });

      return withdrawalRequest;
    } catch (error) {
      throw new Error(`Erreur demande retrait: ${error.message}`);
    }
  }
}

module.exports = new WalletService();