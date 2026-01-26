const Reservation = require('../models/Reservation');
const blockchainClient = require('./blockchainClient');
const { Op } = require('sequelize');
const sequelize = require('../config/database');
const axios = require('axios');

class BookingService {
  
  // Créer une réservation avec transaction PENDING
 async createReservation({ tutorId, studentId, annonceId, annonceTitle, date, time, amount, duration, description, studentNotes }) {
  const transaction = await sequelize.transaction();
  
  try {
    // Récupérer l'userId du tuteur à partir de profile_tutors
    let tutorUserId;
    try {
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
      tutorUserId = tutorProfile.userId;
      console.log(`✅ Tutor userId trouvé: ${tutorUserId} pour tutorId: ${tutorId}`);
    } catch (error) {
      console.error('❌ Erreur récupération userId tuteur:', error);
      throw new Error('Impossible de récupérer les informations du tuteur');
    }

    // RÉCUPÉRER LE TITRE DE L'ANNONCE
    let finalAnnonceTitle = annonceTitle || `Annonce #${annonceId.substring(0, 8)}`;
    
    if (!annonceTitle) {
      try {
        console.log(`📚 Récupération titre annonce ${annonceId} depuis marketplace-service...`);
        const annonceResponse = await axios.get(
          `http://localhost:3002/api/annonces/${annonceId}`,
          { 
            timeout: 5000,
            headers: {
              'Accept': 'application/json'
            }
          }
        );
        
        if (annonceResponse.data?.success && annonceResponse.data?.data?.title) {
          finalAnnonceTitle = annonceResponse.data.data.title;
          console.log(`✅ Titre récupéré: "${finalAnnonceTitle}"`);
        } else {
          console.warn(`⚠️ Réponse annonce sans titre:`, annonceResponse.data);
        }
      } catch (error) {
        console.warn(`⚠️ Impossible de récupérer l'annonce ${annonceId}:`, error.message);
        // On garde le titre par défaut "Annonce #..."
      }
    } else {
      console.log(`📝 Titre fourni directement: "${annonceTitle}"`);
    }

    // Vérifier si une réservation similaire existe déjà
    const existingReservation = await Reservation.findOne({
      where: {
        tutorId: tutorUserId,
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

    console.log(`📝 Création réservation avec titre: "${finalAnnonceTitle}"`);

    // Créer la réservation en base avec le titre
    const reservation = await Reservation.create({
      tutorId: tutorUserId, // Stocker le userId du tuteur
      studentId,
      annonceId,
      annonceTitle: finalAnnonceTitle, // ← TITRE STOCKÉ ICI
      date,
      time,
      duration: duration || 60,
      amount,
      description: description || 'Session de tutorat',
      studentNotes,
      status: 'PENDING',
      blockchainStatus: 'PENDING',
      blockchainFailed: false,
      blockchainCancelled: false
    }, { transaction });

    console.log(`✅ Réservation créée avec ID: ${reservation.id}, titre: "${reservation.annonceTitle}"`);

    // Créer une transaction blockchain PENDING avec le bon userId
    try {
      const blockchainResponse = await blockchainClient.post('/transfer/booking-pending', {
        fromUserId: studentId,
        toUserId: tutorUserId,
        amount: amount,
        description: `Réservation #${reservation.id} - ${finalAnnonceTitle} - Session du ${date} à ${time} (En attente)`,
        metadata: {
          bookingId: reservation.id,
          annonceId: annonceId,
          annonceTitle: finalAnnonceTitle,
          tutorId: tutorUserId,
          tutorProfileId: tutorId,
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
        
        console.log(`✅ Transaction blockchain créée pour réservation ${reservation.id}`);
      } else {
        reservation.blockchainFailed = true;
        await reservation.save({ transaction });
        console.warn(`⚠️ Réponse blockchain non réussie:`, blockchainResponse.data);
      }
    } catch (blockchainError) {
      console.error('❌ Erreur blockchain lors de la création:', blockchainError.message);
      reservation.blockchainFailed = true;
      await reservation.save({ transaction });
      console.warn('⚠️ Réservation créée mais blockchain échouée, transaction rollback?');
    }

    await transaction.commit();
    
    // Retourner la réservation avec le titre
    const reservationWithTitle = reservation.toJSON();
    reservationWithTitle.annonceTitle = reservation.annonceTitle;
    reservationWithTitle.annonce = {
      title: reservation.annonceTitle,
      subject: 'Matière non spécifiée',
      description: reservation.description || 'Description non disponible'
    };
    
    console.log(`🎉 Réservation ${reservation.id} créée avec succès. Titre: "${reservation.annonceTitle}"`);
    
    return reservationWithTitle;
    
  } catch (error) {
    await transaction.rollback();
    console.error('💥 Erreur création réservation:', error);
    console.error('📋 Stack trace:', error.stack);
    throw error;
  }
}
  // Confirmer une réservation (par le tuteur)
  // Confirmer une réservation (par le tuteur)
async confirmReservation(reservationId, tutorId, tutorNotes = null) {
  const transaction = await sequelize.transaction();
  
  try {      
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

      // COMMIT DE LA TRANSACTION ICI - IMPORTANT !
      await transaction.commit();
      
    } catch (blockchainError) {
      // Rollback en cas d'erreur blockchain (avant le commit)
      await transaction.rollback();
      console.error('Erreur blockchain lors de la confirmation:', blockchainError);
      
      // Vérifier si c'est une erreur de solde insuffisant
      if (blockchainError.message.includes('solde') || blockchainError.message.includes('insufficient')) {
        throw new Error('Solde insuffisant dans le wallet de l\'étudiant');
      }
      
      throw new Error(`Erreur confirmation blockchain: ${blockchainError.message}`);
    }
    
    // Code APRÈS le commit (hors transaction)
    // Charger la réservation fraîchement depuis la base
    const confirmedReservation = await Reservation.findByPk(reservationId);
    
    // Préparer l'objet de retour
    const reservationObj = confirmedReservation.toJSON();
    
    // Ajouter les données enrichies
    reservationObj.annonceTitle = confirmedReservation.annonceTitle;
    reservationObj.annonce = {
      title: confirmedReservation.annonceTitle || `Annonce #${confirmedReservation.annonceId.substring(0, 8)}`,
      subject: 'Matière non spécifiée',
      description: confirmedReservation.description || 'Description non disponible'
    };
    
    console.log(`✅ Réservation ${reservationId} confirmée avec succès`);
    
    return reservationObj;
    
  } catch (error) {
    // Gestion d'erreurs générales
    // Vérifier si la transaction est toujours active avant de rollback
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    console.error('Erreur confirmation réservation:', error);
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
      
      const reservations = await Reservation.findAll({
        where: whereClause,
        order: [['createdAt', 'DESC']]
      });

      // Enrichir avec annonceTitle
      const enrichedReservations = reservations.map(reservation => {
        const reservationObj = reservation.toJSON();
        
        // Créer l'objet annonce
        reservationObj.annonce = {
          title: reservation.annonceTitle || `Annonce #${reservation.annonceId}`,
          subject: 'Matière non spécifiée',
          description: reservation.description || 'Description non disponible'
        };
        
        return reservationObj;
      });

      return enrichedReservations;
    } catch (error) {
      console.error('Erreur récupération réservations:', error);
      throw error;
    }
  }
  // Obtenir les réservations d'un tuteur (basé sur userId)
  async getReservationsByTutor(tutorUserId, filters = {}, authToken = null) {
    try {
      console.log(`📊 Récupération réservations pour tuteur userId=${tutorUserId}`);
      
      const whereClause = { tutorId: tutorUserId };
      if (filters.status) whereClause.status = filters.status;
      
      const reservations = await Reservation.findAll({
        where: whereClause,
        order: [['createdAt', 'DESC']]
      });

      console.log(`✅ ${reservations.length} réservations trouvées`);

      // Enrichir les réservations
      const enrichedReservations = await Promise.all(
        reservations.map(async (reservation) => {
          const reservationObj = reservation.toJSON();
          
          // 1. RÉCUPÉRER LES INFOS DE L'ÉTUDIANT
          try {
            console.log(`👤 Récupération étudiant ${reservation.studentId}...`);
            // Utiliser le service auth (port 3001) pour récupérer l'utilisateur
            const studentResponse = await axios.get(
              `http://localhost:3001/api/users/${reservation.studentId}`,
              {
                timeout: 3000,
                headers: authToken ? { Authorization: authToken } : {}
              }
            );
            
            if (studentResponse.data?.success) {
              reservationObj.student = {
                firstName: studentResponse.data.data.firstName,
                lastName: studentResponse.data.data.lastName,
                email: studentResponse.data.data.email
              };
              console.log(`✅ Étudiant trouvé: ${reservationObj.student.firstName} ${reservationObj.student.lastName}`);
            } else {
              console.warn(`⚠️ Réponse API étudiant sans succès:`, studentResponse.data);
              reservationObj.student = {
                firstName: 'Étudiant',
                lastName: '',
                email: 'email@inconnu.com'
              };
            }
          } catch (error) {
            console.error(`❌ Erreur récupération étudiant ${reservation.studentId}:`, error.message);
            // Valeurs par défaut
            reservationObj.student = {
              firstName: 'Étudiant',
              lastName: '',
              email: 'email@inconnu.com'
            };
          }
          
          // 2. RÉCUPÉRER LES INFOS DE L'ANNONCE
          console.log(`📚 Récupération annonce ${reservation.annonceId}...`);
          try {
            const annonceResponse = await axios.get(
              `http://localhost:3002/api/annonces/${reservation.annonceId}`,
              {
                timeout: 3000,
                headers: authToken ? { Authorization: authToken } : {}
              }
            );
            
            if (annonceResponse.data?.success) {
              const annonceData = annonceResponse.data.data;
              reservationObj.annonce = {
                title: annonceData.title || reservation.annonceTitle,
                subject: annonceData.subject || 'Matière non spécifiée',
                description: annonceData.description || reservation.description || 'Description non disponible'
              };
              console.log(`✅ Annonce trouvée: "${reservationObj.annonce.title}"`);
            } else {
              console.warn(`⚠️ Réponse annonce sans succès`);
              reservationObj.annonce = {
                title: reservation.annonceTitle || `Annonce #${reservation.annonceId}`,
                subject: 'Matière non spécifiée',
                description: reservation.description || 'Description non disponible'
              };
            }
          } catch (error) {
            console.warn(`⚠️ Impossible de récupérer annonce ${reservation.annonceId}:`, error.message);
            reservationObj.annonce = {
              title: reservation.annonceTitle || `Annonce #${reservation.annonceId}`,
              subject: 'Matière non spécifiée',
              description: reservation.description || 'Description non disponible'
            };
          }
          
          // 3. Inclure le titre dans l'objet racine aussi
          reservationObj.annonceTitle = reservation.annonceTitle;
          
          return reservationObj;
        })
      );

      return enrichedReservations;
    } catch (error) {
      console.error('💥 Erreur récupération réservations tuteur:', error);
      
      // Fallback: retourner au moins les réservations sans enrichissement
      try {
        const whereClause = { tutorId: tutorUserId };
        if (filters.status) whereClause.status = filters.status;
        
        const plainReservations = await Reservation.findAll({
          where: whereClause,
          order: [['createdAt', 'DESC']]
        });
        
        return plainReservations.map(r => {
          const obj = r.toJSON();
          // Valeurs par défaut pour l'étudiant
          obj.student = {
            firstName: 'Étudiant',
            lastName: '',
            email: 'email@inconnu.com'
          };
          obj.annonceTitle = r.annonceTitle;
          obj.annonce = {
            title: r.annonceTitle || `Annonce #${r.annonceId}`,
            subject: 'Matière non spécifiée',
            description: r.description || 'Description non disponible'
          };
          return obj;
        });
      } catch (fallbackError) {
        console.error('💥 Même en fallback:', fallbackError);
        throw error;
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