const { LedgerBlock } = require('../models/associations');
const sequelize = require('../config/database');
const crypto = require('crypto');
const { Op } = require('sequelize');

class BlockchainService {
  constructor() {
    this.privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY;
  }

  // Créer un nouveau bloc dans le ledger (VERSION CORRIGÉE)
  async createLedgerBlock(blockData, externalTransaction = null) {
    console.log('📦 [createLedgerBlock] Début création bloc...');
    console.log('📦 [createLedgerBlock] Type de bloc:', blockData.blockType);
    console.log('📦 [createLedgerBlock] Payload:', JSON.stringify(blockData.payload));
    
    let transaction = externalTransaction;
    let shouldCommit = false;
    
    if (!transaction) {
      console.log('🔄 [createLedgerBlock] Création transaction interne');
      transaction = await sequelize.transaction();
      shouldCommit = true;
    } else {
      console.log('🔄 [createLedgerBlock] Utilisation transaction externe fournie');
    }
    
    try {
      // Récupérer le dernier bloc pour le previousHash et l'index
      const lastBlock = await LedgerBlock.findOne({
        order: [['index', 'DESC']],
        transaction
      });

      const previousHash = lastBlock ? lastBlock.hash : '0'.repeat(64);
      const nextIndex = lastBlock ? lastBlock.index + 1 : 0;

      console.log(`🔗 [createLedgerBlock] Previous hash: ${previousHash.substring(0, 16)}...`);
      console.log(`📈 [createLedgerBlock] Next index: ${nextIndex}`);

      // Créer le bloc avec toutes les données requises
      const newBlockData = {
        previousHash: previousHash,
        timestamp: new Date(),
        payload: blockData.payload,
        blockType: blockData.blockType,
        status: 'confirmed',
        index: nextIndex
      };

      // Calculer le hash AVANT la création
      const hash = this.calculateHash(newBlockData);
      newBlockData.hash = hash;

      console.log(`🔐 [createLedgerBlock] Hash calculé: ${hash.substring(0, 16)}...`);

      // Signer le bloc si une clé privée est disponible
      if (this.privateKey) {
        newBlockData.signature = this.signBlock(newBlockData);
      }

      console.log('💾 [createLedgerBlock] Sauvegarde du bloc dans la base...');
      const newBlock = await LedgerBlock.create(newBlockData, { transaction });

      if (shouldCommit) {
        console.log('✅ [createLedgerBlock] Commit de la transaction interne');
        await transaction.commit();
      }
      
      console.log(`✅ [createLedgerBlock] Bloc ledger créé: ${newBlock.id} (index: ${newBlock.index})`);
      return newBlock;
    } catch (error) {
      console.error('💥 [createLedgerBlock] Erreur création bloc:', error);
      
      if (shouldCommit && transaction) {
        console.log('↩️ [createLedgerBlock] Rollback de la transaction interne');
        await transaction.rollback();
      }
      throw new Error(`Erreur création bloc ledger: ${error.message}`);
    }
  }

  // Méthode pour calculer le hash
  calculateHash(blockData) {
    const data = `${blockData.index}|${blockData.previousHash}|${blockData.timestamp.getTime()}|${JSON.stringify(blockData.payload)}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  // Signer un bloc avec la clé privée du service
  signBlock(block) {
    if (!this.privateKey) return null;
    
    try {
      // Vérifier que la clé privée est dans le bon format
      // Si c'est une chaîne Base64, la décoder
      let privateKey = this.privateKey;
      
      // Si la clé commence par "-----BEGIN PRIVATE KEY-----", c'est déjà au format PEM
      if (privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
        // C'est une clé au format PEM, utiliser directement
      } else {
        // Essayer de traiter comme Base64
        try {
          privateKey = Buffer.from(privateKey, 'base64').toString('utf8');
        } catch (e) {
          console.warn('⚠️ Clé privée non en Base64, utilisation directe');
        }
      }
      
      const sign = crypto.createSign('SHA256');
      sign.update(block.hash);
      sign.end();
      
      return sign.sign(privateKey, 'hex');
    } catch (error) {
      console.error('❌ Erreur signature bloc:', error.message);
      console.warn('⚠️ Signature désactivée pour le moment');
      return null;
    }
  }

  // Vérifier la signature d'un bloc
  verifyBlockSignature(block, publicKey) {
    if (!block.signature) return false;
    
    try {
      const verify = crypto.createVerify('SHA256');
      verify.update(block.hash);
      verify.end();
      return verify.verify(publicKey, block.signature, 'hex');
    } catch (error) {
      console.error('❌ Erreur vérification signature:', error);
      return false;
    }
  }

  // Vérifier l'intégrité de la chaîne
  async verifyChainIntegrity() {
    try {
      const blocks = await LedgerBlock.findAll({
        order: [['index', 'ASC']]
      });

      if (blocks.length === 0) {
        return { valid: true, blockCount: 0, message: 'Chaîne vide' };
      }

      for (let i = 1; i < blocks.length; i++) {
        const currentBlock = blocks[i];
        const previousBlock = blocks[i - 1];

        if (currentBlock.previousHash !== previousBlock.hash) {
          return {
            valid: false,
            invalidBlock: currentBlock.index,
            reason: 'Previous hash mismatch'
          };
        }

        if (!this.verifyBlock(currentBlock)) {
          return {
            valid: false,
            invalidBlock: currentBlock.index,
            reason: 'Block hash invalid'
          };
        }
      }

      return { valid: true, blockCount: blocks.length };
    } catch (error) {
      console.error('💥 Erreur vérification chaîne:', error);
      return { valid: false, error: error.message };
    }
  }

  // Vérifier un bloc individuel
  verifyBlock(block) {
    const calculatedHash = this.calculateHash({
      index: block.index,
      previousHash: block.previousHash,
      timestamp: block.timestamp,
      payload: block.payload
    });
    
    return block.hash === calculatedHash;
  }

  // Récupérer l'historique des transactions d'un wallet
  async getWalletHistory(walletId, options = {}) {
    try {
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
          { fromWalletId: walletId },
          { toWalletId: walletId }
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
            attributes: ['id', 'userId', 'walletAddress']
          },
          {
            model: Wallet,
            as: 'toWallet',
            attributes: ['id', 'userId', 'walletAddress']
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
      throw new Error(`Erreur récupération historique: ${error.message}`);
    }
  }

  // Générer un rapport d'audit
  async generateAuditReport(walletId, startDate, endDate) {
    try {
      const transactions = await Transaction.findAll({
        where: {
          [Op.or]: [
            { fromWalletId: walletId },
            { toWalletId: walletId }
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
        if (tx.fromWalletId === walletId) {
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
          direction: tx.fromWalletId === walletId ? 'OUTGOING' : 'INCOMING',
          timestamp: tx.createdAt,
          ledgerHash: tx.ledgerBlock?.hash,
          signature: tx.ledgerBlock?.signature
        }))
      };
    } catch (error) {
      throw new Error(`Erreur génération rapport: ${error.message}`);
    }
  }

  // Obtenir les informations de la chaîne
  async getChainInfo() {
    try {
      const totalBlocks = await LedgerBlock.count();
      const lastBlock = await LedgerBlock.findOne({
        order: [['index', 'DESC']]
      });
      
      const integrity = await this.verifyChainIntegrity();

      return {
        totalBlocks,
        lastBlock: lastBlock ? {
          index: lastBlock.index,
          hash: lastBlock.hash,
          timestamp: lastBlock.timestamp
        } : null,
        integrity,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Erreur récupération info chaîne: ${error.message}`);
    }
  }
}

module.exports = new BlockchainService();