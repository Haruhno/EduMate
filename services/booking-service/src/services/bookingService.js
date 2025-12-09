// booking-service/services/bookingService.js
const Reservation = require('../models/Reservation');
const blockchainClient = require('./blockchainClient');
const { Op } = require('sequelize');
const sequelize = require('../config/database');
const axios = require('axios');

class BookingService {
  
  // Créer une réservation avec transaction PENDING
  // Dans bookingService.js, remplacez la méthode createReservation :
  async createReservation({ tutorId, studentId, annonceId, date, time, amount, duration, description, studentNotes }) {
    const transaction = await sequelize.transaction();
    
    try {
      console.log('🎯 Création réservation avec annonceId:', annonceId);
      console.log('🎯 tutorId (profile_tutors):', tutorId, 'studentId (user):', studentId);
      
      // AJOUTER : Récupérer l'userId du tuteur à partir de profile_tutors
      let tutorUserId;
      try {
        // CORRECTION : Utiliser "userId" avec majuscule, pas "userid"
        const [tutorProfile] = await sequelize.query(`
          SELECT "userId" FROM profile_tutors WHERE id = :tutorId
        `, {
          replacements: { tutorId },
          type: sequelize.QueryTypes.SELECT,
          transaction
        });
        
        if (!tutorProfile) {
          throw new Error('Profil tuteur non trouvé');
        }
        
        tutorUserId = tutorProfile.userId; // Note: userId avec majuscule
        console.log('✅ userId du tuteur trouvé:', tutorUserId);
      } catch (error) {
        console.error('❌ Erreur récupération userId tuteur:', error);
        throw new Error('Impossible de récupérer les informations du tuteur');
      }
      
      // Vérifier si une réservation similaire existe déjà
      const existingReservation = await Reservation.findOne({
        where: {
          tutorId: tutorUserId, // Utiliser le userId, pas le profileId
          studentId,
          annonceId,
          date,
          time,
          status: ['PENDING', 'CONFIRMED']
        },
        transaction
      });

      if (existingReservation) {
        throw new Error('Une réservation pour cette session existe déjà');
      }

      // Créer la réservation en base avec le userId du tuteur
      const reservation = await Reservation.create({
        tutorId: tutorUserId, // Stocker le userId du tuteur
        studentId,
        annonceId,
        date,
        time,
        duration: duration || 60,
        amount,
        description: description || 'Session de tutorat',
        studentNotes,
        status: 'PENDING',
        blockchainStatus: 'PENDING'
      }, { transaction });

      console.log('✅ Réservation créée en base:', reservation.id);

      // Créer une transaction blockchain PENDING avec le bon userId
      try {
        const blockchainResponse = await blockchainClient.post('/transfer/booking-pending', {
          fromUserId: studentId, // userId de l'étudiant (déjà correct)
          toUserId: tutorUserId, // userId du tuteur
          amount: amount,
          description: `Réservation #${reservation.id} - Session du ${date} à ${time} (En attente)`,
          metadata: {
            bookingId: reservation.id,
            annonceId: annonceId,
            tutorId: tutorUserId, // userId du tuteur
            tutorProfileId: tutorId, // Conserver aussi l'ID du profil pour référence
            studentId: studentId,
            date: date,
            time: time,
            duration: duration || 60,
            type: 'TUTOR_SESSION_PENDING',
            status: 'PENDING'
          }
        });

        if (blockchainResponse.data.success) {
          // Mettre à jour la réservation avec les infos blockchain
          reservation.blockchainTransactionId = blockchainResponse.data.data.transaction?.id;
          reservation.transactionHash = blockchainResponse.data.data.ledgerBlock?.hash;
          reservation.blockchainStatus = 'PENDING';
          await reservation.save({ transaction });
          
          console.log('✅ Transaction blockchain PENDING créée:', reservation.blockchainTransactionId);
        } else {
          console.warn('⚠️ Échec création transaction blockchain:', blockchainResponse.data.message);
          reservation.blockchainFailed = true;
          await reservation.save({ transaction });
        }
      } catch (blockchainError) {
        console.error('❌ Erreur blockchain lors de la création:', blockchainError.message);
        reservation.blockchainFailed = true;
        await reservation.save({ transaction });
      }

      await transaction.commit();
      return reservation;
      
    } catch (error) {
      await transaction.rollback();
      console.error('💥 Erreur création réservation:', error);
      throw error;
    }
  }

  // Confirmer une réservation (par le tuteur)
  async confirmReservation(reservationId, tutorId, tutorNotes = null) {
    const transaction = await sequelize.transaction();
    
    try {
      console.log(`🎯 Confirmation réservation ${reservationId} par tuteur ${tutorId}`);
      
      // Récupérer et vérifier la réservation
      const reservation = await Reservation.findByPk(reservationId, { transaction });
      if (!reservation) {
        throw new Error('Réservation non trouvée');
      }

      if (String(reservation.tutorId) !== String(tutorId)) {
        throw new Error('Seul le tuteur concerné peut confirmer cette réservation');
      }

      if (reservation.status !== 'PENDING') {
        throw new Error(`La réservation ne peut pas être confirmée. Statut actuel: ${reservation.status}`);
      }

      // Finaliser la transaction blockchain
      let blockchainResponse;
      try {
        if (reservation.blockchainTransactionId) {
          blockchainResponse = await blockchainClient.post('/transfer/booking-confirm', {
            transactionId: reservation.blockchainTransactionId,
            bookingId: reservation.id,
            confirmedBy: tutorId,
            metadata: {
              bookingId: reservation.id,
              confirmedAt: new Date().toISOString(),
              tutorNotes: tutorNotes
            }
          });

          if (!blockchainResponse.data.success) {
            throw new Error('Échec confirmation blockchain: ' + blockchainResponse.data.message);
          }

          console.log('✅ Transaction blockchain confirmée');
        } else {
          // Si pas de transaction PENDING, en créer une nouvelle directement
          blockchainResponse = await blockchainClient.post('/transfer', {
            fromUserId: reservation.studentId,
            toWalletAddress: await this.getTutorWalletAddress(tutorId),
            amount: reservation.amount,
            description: `Réservation #${reservation.id} - Session du ${reservation.date} à ${reservation.time}`,
            metadata: {
              bookingId: reservation.id,
              type: 'TUTOR_SESSION',
              status: 'CONFIRMED'
            }
          });

          if (!blockchainResponse.data.success) {
            throw new Error('Échec transfert blockchain: ' + blockchainResponse.data.message);
          }
        }

        // Mettre à jour la réservation
        reservation.status = 'CONFIRMED';
        reservation.blockchainStatus = 'CONFIRMED';
        reservation.transactionHash = blockchainResponse.data.data.ledgerBlock?.hash;
        reservation.blockchainTransactionId = blockchainResponse.data.data.transaction?.id;
        
        if (tutorNotes) {
          reservation.tutorNotes = tutorNotes;
        }
        
        await reservation.save({ transaction });

        await transaction.commit();
        
        // Retourner les données enrichies
        const enrichedReservation = reservation.toJSON();
        enrichedReservation.blockchain = {
          transactionId: reservation.blockchainTransactionId,
          transactionHash: reservation.transactionHash,
          amount: reservation.amount,
          confirmedAt: new Date().toISOString()
        };

        return enrichedReservation;
        
      } catch (blockchainError) {
        await transaction.rollback();
        console.error('❌ Erreur blockchain lors de la confirmation:', blockchainError);
        
        // Vérifier si c'est une erreur de solde insuffisant
        if (blockchainError.message.includes('solde') || blockchainError.message.includes('insufficient')) {
          throw new Error('Solde insuffisant dans le wallet de l\'étudiant');
        }
        
        throw new Error(`Erreur confirmation blockchain: ${blockchainError.message}`);
      }
      
    } catch (error) {
      await transaction.rollback();
      console.error('💥 Erreur confirmation réservation:', error);
      throw error;
    }
  }

  // Annuler une réservation
  async cancelReservation(reservationId, userId, reason = null) {
    const transaction = await sequelize.transaction();
    
    try {
      const reservation = await Reservation.findByPk(reservationId, { transaction });
      if (!reservation) throw new Error('Réservation non trouvée');

      // Vérifier les autorisations
      const isStudent = String(reservation.studentId) === String(userId);
      const isTutor = String(reservation.tutorId) === String(userId);
      
      if (!isStudent && !isTutor) {
        throw new Error('Non autorisé à annuler cette réservation');
      }

      if (reservation.status === 'CANCELLED') {
        await transaction.commit();
        return reservation;
      }

      // Annuler la transaction blockchain si elle existe
      if (reservation.blockchainTransactionId && reservation.blockchainStatus === 'PENDING') {
        try {
          await blockchainClient.post('/transfer/booking-cancel', {
            transactionId: reservation.blockchainTransactionId,
            bookingId: reservation.id,
            cancelledBy: userId,
            reason: reason,
            metadata: {
              cancelledAt: new Date().toISOString(),
              cancelledByRole: isStudent ? 'student' : 'tutor',
              reason: reason
            }
          });
        } catch (blockchainError) {
          console.warn('⚠️  Erreur annulation blockchain:', blockchainError.message);
        }
      }

      // Mettre à jour la réservation
      reservation.status = 'CANCELLED';
      reservation.blockchainStatus = 'CANCELLED';
      reservation.cancelledBy = isStudent ? 'student' : 'tutor';
      reservation.cancellationReason = reason;
      
      if (reason) {
        if (isStudent) {
          reservation.studentNotes = reason;
        } else {
          reservation.tutorNotes = reason;
        }
      }
      
      await reservation.save({ transaction });
      await transaction.commit();
      
      return reservation;
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // Marquer une réservation comme complétée
  async completeReservation(reservationId, tutorId) {
    const reservation = await Reservation.findByPk(reservationId);
    if (!reservation) throw new Error('Réservation non trouvée');

    if (String(reservation.tutorId) !== String(tutorId)) {
      throw new Error('Seul le tuteur concerné peut marquer la session comme terminée');
    }

    if (reservation.status !== 'CONFIRMED') {
      throw new Error(`La réservation doit être CONFIRMED avant d'être marquée comme COMPLETED. Statut actuel: ${reservation.status}`);
    }

    reservation.status = 'COMPLETED';
    await reservation.save();

    return reservation;
  }

  // Obtenir les réservations d'un utilisateur
  async getReservationsByUser(userId, filters = {}) {
    try {
      const whereClause = {
        [Op.or]: [
          { studentId: userId },
          { tutorId: userId }
        ]
      };
      
      if (filters.status) {
        whereClause.status = filters.status;
      }
      
      if (filters.startDate) {
        whereClause.date = {
          [Op.gte]: filters.startDate
        };
      }
      
      if (filters.endDate) {
        whereClause.date = {
          ...whereClause.date,
          [Op.lte]: filters.endDate
        };
      }

      const reservations = await Reservation.findAll({
        where: whereClause,
        order: [['createdAt', 'DESC']]
      });

      console.log(`📊 Récupération réservations pour userId=${userId}: ${reservations.length} résultats`);
      
      return reservations;
      
    } catch (error) {
      console.error('Erreur récupération réservations:', error);
      throw error;
    }
  }

  // Obtenir les réservations d'un tuteur (basé sur userId)
  // Dans bookingService.js, remplacez la méthode getReservationsByTutor :

  async getReservationsByTutor(tutorUserId, filters = {}) {
    try {
      console.log(`📊 Récupération réservations pour tuteur userId=${tutorUserId}`);
      
      const whereClause = { tutorId: tutorUserId }; // Utilise directement userId du tuteur
      
      if (filters.status) {
        whereClause.status = filters.status;
      }
      
      if (filters.startDate) {
        whereClause.date = {
          [Op.gte]: filters.startDate
        };
      }
      
      if (filters.endDate) {
        whereClause.date = {
          ...whereClause.date,
          [Op.lte]: filters.endDate
        };
      }

      const reservations = await Reservation.findAll({
        where: whereClause,
        order: [['createdAt', 'DESC']]
      });

      console.log(`✅ Réservations trouvées: ${reservations.length} résultats`);
      
      // Récupérer les informations des étudiants et des annonces
      const enrichedReservations = await Promise.all(
        reservations.map(async (reservation) => {
          const reservationObj = reservation.toJSON();
          
          try {
            // Option 1: Utiliser la route publique /all pour récupérer tous les utilisateurs
            // (si elle retourne les infos complètes)
            const allUsersResponse = await axios.get('http://localhost:3001/api/auth/all');
            
            if (allUsersResponse.data.success && Array.isArray(allUsersResponse.data.data)) {
              const student = allUsersResponse.data.data.find(user => user.id === reservation.studentId);
              if (student) {
                reservationObj.student = {
                  firstName: student.firstName,
                  lastName: student.lastName,
                  email: student.email
                };
              }
            }
          } catch (authError) {
            console.warn(`⚠️ Route /all non disponible, tentative alternative:`, authError.message);
            
            try {
              // Option 2: Tenter la route publique GET /api/users/:id
              // Celle-ci semble disponible d'après tes routes
              const studentResponse = await axios.get(
                `http://localhost:3001/api/users/${reservation.studentId}`
              );
              
              if (studentResponse.data.success) {
                reservationObj.student = {
                  firstName: studentResponse.data.data.firstName,
                  lastName: studentResponse.data.data.lastName,
                  email: studentResponse.data.data.email
                };
              }
            } catch (userError) {
              console.warn(`⚠️ Impossible de récupérer l'étudiant ${reservation.studentId}:`, userError.message);
            }
          }
          
          try {
            // Récupérer les infos de l'annonce depuis le service marketplace
            // Note: Vérifie si cette route est publique ou nécessite un token
            const annonceResponse = await axios.get(
              `http://localhost:3002/api/annonces/${reservation.annonceId}`,
              {
                // Si le service marketplace nécessite un token, utilise celui du context
                headers: {
                  Authorization: req?.headers?.authorization || ''
                }
              }
            );
            
            if (annonceResponse.data.success) {
              reservationObj.annonce = {
                title: annonceResponse.data.data.title,
                subject: annonceResponse.data.data.subject,
                description: annonceResponse.data.data.description
              };
            }
          } catch (annonceError) {
            console.warn(`⚠️ Impossible de récupérer l'annonce ${reservation.annonceId}:`, annonceError.message);
            
            // Fallback: chercher dans la réponse d'erreur ou utiliser des valeurs par défaut
            if (annonceError.response?.data?.annonce) {
              reservationObj.annonce = annonceError.response.data.annonce;
            } else {
              // Valeurs par défaut pour éviter les erreurs frontend
              reservationObj.annonce = {
                title: `Annonce #${reservation.annonceId}`,
                subject: 'Matière non spécifiée',
                description: 'Description non disponible'
              };
            }
          }
          
          return reservationObj;
        })
      );
      
      return enrichedReservations;
      
    } catch (error) {
      console.error('💥 Erreur récupération réservations tuteur:', error);
      // Retourner les réservations sans enrichissement plutôt que de planter
      try {
        const whereClause = { tutorId: tutorUserId };
        if (filters.status) whereClause.status = filters.status;
        
        const plainReservations = await Reservation.findAll({
          where: whereClause,
          order: [['createdAt', 'DESC']]
        });
        
        console.log(`⚠️ Retour des réservations sans enrichissement: ${plainReservations.length} résultats`);
        return plainReservations.map(r => r.toJSON());
      } catch (fallbackError) {
        console.error('💥 Erreur même en fallback:', fallbackError);
        throw error; // Propager l'erreur originale
      }
    }
  }

  // Obtenir les statistiques
  async getReservationStats(userId, userRole) {
    try {
      const whereClause = userRole === 'tutor' 
        ? { tutorId: userId }  // userId direct pour les tuteurs
        : { studentId: userId }; // userId direct pour les étudiants

      console.log(`📈 Calcul stats pour userId=${userId}, role=${userRole}`);

      const reservations = await Reservation.findAll({
        where: whereClause
      });

      const stats = {
        total: reservations.length,
        pending: reservations.filter(r => r.status === 'PENDING').length,
        confirmed: reservations.filter(r => r.status === 'CONFIRMED').length,
        cancelled: reservations.filter(r => r.status === 'CANCELLED').length,
        completed: reservations.filter(r => r.status === 'COMPLETED').length,
        totalAmount: reservations
          .filter(r => r.status === 'CONFIRMED' || r.status === 'COMPLETED')
          .reduce((sum, r) => sum + parseFloat(r.amount), 0),
        pendingAmount: reservations
          .filter(r => r.status === 'PENDING')
          .reduce((sum, r) => sum + parseFloat(r.amount), 0),
        // Stats supplémentaires
        earnings: userRole === 'tutor' ? reservations
          .filter(r => r.status === 'CONFIRMED' || r.status === 'COMPLETED')
          .reduce((sum, r) => sum + parseFloat(r.amount), 0) : 0,
        spending: userRole === 'student' ? reservations
          .filter(r => r.status === 'CONFIRMED' || r.status === 'COMPLETED')
          .reduce((sum, r) => sum + parseFloat(r.amount), 0) : 0
      };

      console.log(`📈 Stats calculées pour userId=${userId}:`, stats);
      
      return stats;
    } catch (error) {
      console.error('Erreur calcul statistiques:', error);
      throw error;
    }
  }

  // Obtenir une réservation par ID
  async getReservationById(reservationId, userId = null) {
    const reservation = await Reservation.findByPk(reservationId);

    if (!reservation) {
      throw new Error('Réservation non trouvée');
    }

    // Vérifier les autorisations si userId est fourni
    if (userId) {
      const isOwner = String(reservation.studentId) === String(userId) || 
                     String(reservation.tutorId) === String(userId);
      if (!isOwner) {
        throw new Error('Non autorisé à voir cette réservation');
      }
    }

    return reservation;
  }

  // Mettre à jour le statut blockchain
  async updateBlockchainStatus(reservationId, blockchainStatus, transactionHash = null) {
    const reservation = await Reservation.findByPk(reservationId);
    if (!reservation) throw new Error('Réservation non trouvée');
    
    reservation.blockchainStatus = blockchainStatus;
    
    if (transactionHash) {
      reservation.transactionHash = transactionHash;
    }
    
    await reservation.save();
    return reservation;
  }

  // Méthode utilitaire pour obtenir l'adresse du wallet d'un tuteur
  async getTutorWalletAddress(tutorId) {
    try {
      const response = await blockchainClient.get(`/balance?userId=${tutorId}`);
      if (response.data.success) {
        return response.data.data.wallet.walletAddress;
      }
      throw new Error('Impossible de récupérer le wallet du tuteur');
    } catch (error) {
      throw new Error(`Erreur récupération wallet tuteur: ${error.message}`);
    }
  }

  // Nouvelle méthode: Vérifier si un utilisateur est tuteur
  async isUserTutor(userId) {
    // Cette méthode peut être implémentée si besoin
    // Actuellement, on suppose que si l'utilisateur a le rôle 'tutor', c'est un tuteur
    return true; // Simplifié pour l'instant
  }

  // Nouvelle méthode: Récupérer les réservations avec détails complets
  async getReservationsWithDetails(userId, role = 'user') {
    try {
      let reservations;
      
      if (role === 'tutor') {
        reservations = await this.getReservationsByTutor(userId);
      } else if (role === 'student') {
        reservations = await this.getReservationsByUser(userId, {});
        // Filtrer pour ne garder que celles où l'utilisateur est étudiant
        reservations = reservations.filter(r => String(r.studentId) === String(userId));
      } else {
        reservations = await this.getReservationsByUser(userId);
      }

      return reservations;
    } catch (error) {
      console.error('Erreur récupération réservations avec détails:', error);
      throw error;
    }
  }

  // Nouvelle méthode: Compter les réservations par statut
  async countReservationsByStatus(userId, role = 'user') {
    try {
      let reservations;
      
      if (role === 'tutor') {
        reservations = await this.getReservationsByTutor(userId);
      } else if (role === 'student') {
        reservations = await this.getReservationsByUser(userId, {});
        reservations = reservations.filter(r => String(r.studentId) === String(userId));
      } else {
        reservations = await this.getReservationsByUser(userId);
      }

      const counts = {
        total: reservations.length,
        pending: reservations.filter(r => r.status === 'PENDING').length,
        confirmed: reservations.filter(r => r.status === 'CONFIRMED').length,
        cancelled: reservations.filter(r => r.status === 'CANCELLED').length,
        completed: reservations.filter(r => r.status === 'COMPLETED').length
      };

      return counts;
    } catch (error) {
      console.error('Erreur comptage réservations:', error);
      throw error;
    }
  }

  // Nouvelle méthode: Vérifier la disponibilité
  async checkAvailability(tutorId, date, time) {
    try {
      const existingReservation = await Reservation.findOne({
        where: {
          tutorId,
          date,
          time,
          status: ['PENDING', 'CONFIRMED']
        }
      });

      return {
        available: !existingReservation,
        conflictingReservation: existingReservation
      };
    } catch (error) {
      console.error('Erreur vérification disponibilité:', error);
      throw error;
    }
  }

  // Nouvelle méthode: Récupérer les réservations à venir
  async getUpcomingReservations(userId, role = 'user') {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      let reservations;
      if (role === 'tutor') {
        reservations = await this.getReservationsByTutor(userId);
      } else if (role === 'student') {
        const allReservations = await this.getReservationsByUser(userId, {});
        reservations = allReservations.filter(r => String(r.studentId) === String(userId));
      } else {
        reservations = await this.getReservationsByUser(userId);
      }

      // Filtrer les réservations à venir (date >= aujourd'hui) et non annulées
      const upcoming = reservations.filter(r => {
        const reservationDate = new Date(r.date);
        const todayDate = new Date(today);
        return reservationDate >= todayDate && r.status !== 'CANCELLED';
      });

      // Trier par date et heure
      upcoming.sort((a, b) => {
        const dateA = new Date(a.date + 'T' + a.time);
        const dateB = new Date(b.date + 'T' + b.time);
        return dateA - dateB;
      });

      return upcoming;
    } catch (error) {
      console.error('Erreur récupération réservations à venir:', error);
      throw error;
    }
  }

  // Nouvelle méthode: Récupérer les réservations passées
  async getPastReservations(userId, role = 'user') {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      let reservations;
      if (role === 'tutor') {
        reservations = await this.getReservationsByTutor(userId);
      } else if (role === 'student') {
        const allReservations = await this.getReservationsByUser(userId, {});
        reservations = allReservations.filter(r => String(r.studentId) === String(userId));
      } else {
        reservations = await this.getReservationsByUser(userId);
      }

      // Filtrer les réservations passées (date < aujourd'hui)
      const past = reservations.filter(r => {
        const reservationDate = new Date(r.date);
        const todayDate = new Date(today);
        return reservationDate < todayDate;
      });

      // Trier par date décroissante
      past.sort((a, b) => {
        const dateA = new Date(a.date + 'T' + a.time);
        const dateB = new Date(b.date + 'T' + b.time);
        return dateB - dateA;
      });

      return past;
    } catch (error) {
      console.error('Erreur récupération réservations passées:', error);
      throw error;
    }
  }
}

module.exports = new BookingService();