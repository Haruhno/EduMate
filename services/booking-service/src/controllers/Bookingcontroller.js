const bookingService = require('../services/bookingService');
const axios = require('axios');

const BLOCKCHAIN_SERVICE_URL = process.env.BLOCKCHAIN_SERVICE_URL || process.env.BLOCKCHAIN_URL || 'http://localhost:3010';

exports.create = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { tutorId, annonceId, annonceTitle, date, time, amount, duration, description, studentNotes } = req.body;
    
    if (!tutorId || !annonceId || !date || !time || amount === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: 'Données manquantes: tutorId, annonceId, date, time et amount sont requis' 
      });
    }

    const reservation = await bookingService.createReservation({
      tutorId,
      studentId,
      annonceId,
      annonceTitle,
      date,
      time,
      amount,
      duration,
      description,
      studentNotes
    });

    const responsePayload = {
      success: true,
      message: 'Réservation créée avec succès. En attente de confirmation du tuteur.',
      data: reservation
    };

    if (reservation.blockchainFailed) {
      responsePayload.warning = 'La tentative de création de la transaction blockchain a échoué. La réservation est créée en base mais la transaction on-chain a échoué. Un suivi est recommandé.';
      responsePayload.blockchainFailed = true;
    } else if (reservation.blockchainStatus === 'PENDING') {
      responsePayload.message = 'Réservation créée et transaction blockchain PENDING créée. En attente de confirmation on-chain.';
      responsePayload.blockchainStatus = 'PENDING';
      if (reservation.transactionHash) responsePayload.transactionHash = reservation.transactionHash;
    }

    res.status(201).json(responsePayload);
  } catch (error) {
    console.error('Erreur création réservation:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Erreur lors de la création de la réservation' 
    });
  }
};

exports.confirm = async (req, res) => {
  try {
    const reservationId = req.params.id;
    const tutorId = req.user.id;
    const { tutorNotes } = req.body;

    const reservation = await bookingService.confirmReservation(reservationId, tutorId, tutorNotes);

    res.json({ 
      success: true, 
      message: 'Réservation confirmée et transaction blockchain finalisée avec succès',
      data: reservation
    });
  } catch (error) {
    console.error('Erreur confirmation réservation:', error);
    const status = error.code === 'INSUFFICIENT_FUNDS' ? 402 : 500;
    res.status(status).json({ success: false, message: error.message || 'Erreur lors de la confirmation de la réservation' });
  }
};

exports.cancel = async (req, res) => {
  try {
    const reservationId = req.params.id;
    const userId = req.user.id;
    const { reason } = req.body;

    const reservation = await bookingService.cancelReservation(reservationId, userId, reason);

    res.json({ 
      success: true, 
      message: 'Réservation annulée avec succès',
      data: reservation
    });
  } catch (error) {
    console.error('Erreur annulation réservation:', error);
    res.status(500).json({ success: false, message: error.message || 'Erreur lors de l\'annulation de la réservation' });
  }
};

exports.complete = async (req, res) => {
  try {
    const reservationId = req.params.id;
    const tutorId = req.user.id;

    const reservation = await bookingService.completeReservation(reservationId, tutorId);

    res.json({ success: true, message: 'Réservation marquée comme complétée', data: reservation });
  } catch (error) {
    console.error('Erreur complétion réservation:', error);
    res.status(500).json({ success: false, message: error.message || 'Erreur lors de la marquage de la session comme terminée' });
  }
};

exports.getByUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    // student should call getReservationsByUser
    const reservations = await bookingService.getReservationsByUser(userId, { status });

    res.json({ success: true, data: reservations });
  } catch (error) {
    console.error('Erreur récupération réservations:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération des réservations' });
  }
};

exports.getByTutor = async (req, res) => {
  try {
    const paramTutorId = req.params.tutorId;
    const requestingUserId = req.user.id;
    const userRole = req.user.role;
    const authToken = req.headers.authorization; // ← Récupérer le token
    const { status, startDate, endDate } = req.query;

    console.log(`🔍 getByTutor appelé: paramTutorId=${paramTutorId}, requestingUserId=${requestingUserId}, role=${userRole}`);

    let tutorUserId = null;

    if (userRole === 'tutor') {
      tutorUserId = requestingUserId;
      
      if (paramTutorId && String(paramTutorId) !== String(tutorUserId)) {
        console.log(`❌ Tentative accès non autorisé: ${requestingUserId} essaie d'accéder aux réservations de ${paramTutorId}`);
        return res.status(403).json({
          success: false,
          message: 'Vous n\'êtes pas autorisé à voir ces réservations'
        });
      }
    } else {
      if (!paramTutorId) {
        return res.status(400).json({
          success: false,
          message: 'tutorId requis'
        });
      }
      tutorUserId = paramTutorId;
    }

    console.log(`✅ tutorUserId final: ${tutorUserId}`);

    const filters = {};
    if (status !== undefined && status !== null && String(status).trim() !== '') {
      filters.status = String(status).toUpperCase();
    }
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    // Passer le token au service
    const reservations = await bookingService.getReservationsByTutor(
      tutorUserId, 
      filters,
      authToken // ← Passer le token
    );

    const stats = await bookingService.getReservationStats(tutorUserId, 'tutor');

    const count = Array.isArray(reservations) ? reservations.length : (reservations?.length ?? 0);
    console.log(`✅ Résultats: ${count} réservations pour tutorUserId=${tutorUserId}`);

    return res.json({
      success: true,
      data: {
        reservations,
        stats
      }
    });
  } catch (error) {
    console.error('💥 Erreur récupération réservations tuteur:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la récupération des réservations'
    });
  }
};

exports.getStats = async (req, res) => {
  try {
    const userId = req.params.userId;
    const requestingUserId = req.user.id;
    
    // Vérifier que l'utilisateur demande ses propres stats
    if (String(userId) !== String(requestingUserId)) {
      return res.status(403).json({ success: false, message: 'Vous n\'êtes pas autorisé à voir ces statistiques' });
    }

    const stats = await bookingService.getReservationStats(userId, req.user.role);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Erreur récupération statistiques:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération des statistiques' });
  }
};

exports.getById = async (req, res) => {
  try {
    const reservationId = req.params.id;
    const userId = req.user.id;

    const reservation = await bookingService.getReservationById(reservationId, userId);
    res.json({ success: true, data: reservation });
  } catch (error) {
    console.error('Erreur récupération détails réservation:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération des détails de la réservation' });
  }
};

exports.getStats = async (req, res) => {
  try {
    const userId = req.params.userId;
    const requestingUserId = req.user.id;
    if (String(userId) !== String(requestingUserId)) {
      return res.status(403).json({ success: false, message: 'Vous n\'êtes pas autorisé à voir ces statistiques' });
    }

    const stats = await bookingService.getReservationStats(userId, req.user.role);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Erreur récupération statistiques:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération des statistiques' });
  }
};

// Webhook pour les notifications blockchain
exports.blockchainWebhook = async (req, res) => {
  try {
    const { event, data } = req.body;
    const webhookSecret = req.headers['x-webhook-secret'];
    if (webhookSecret !== process.env.BLOCKCHAIN_WEBHOOK_SECRET) {
      return res.status(401).json({ success: false, message: 'Non autorisé' });
    }

    console.log(`📬 Webhook booking reçu: ${event}`, data);

    switch (event) {
      case 'TRANSACTION_CONFIRMED':
        if (data.metadata?.bookingId) {
          await bookingService.updateBlockchainStatus(data.metadata.bookingId, 'CONFIRMED', data.transactionHash);
        }
        break;
      case 'TRANSACTION_PENDING':
        if (data.metadata?.bookingId) {
          await bookingService.updateBlockchainStatus(data.metadata.bookingId, 'PENDING', data.transactionHash);
        }
        break;
      case 'TRANSACTION_FAILED':
      case 'TRANSACTION_CANCELLED':
        if (data.metadata?.bookingId) {
          // Save transactionHash on failures/cancels for audit/debug
          await bookingService.updateBlockchainStatus(data.metadata.bookingId, 'FAILED', data.transactionHash);
          console.warn(`Transaction ${event} for booking ${data.metadata.bookingId}, hash: ${data.transactionHash}`);
        }
        break;
      default:
        console.log(`Événement non géré: ${event}`);
    }

    res.json({ success: true, message: 'Webhook traité' });
  } catch (error) {
    console.error('Erreur traitement webhook:', error);
    res.status(500).json({ success: false, message: 'Erreur traitement webhook' });
  }
};