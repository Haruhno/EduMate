import { useState, useEffect } from 'react';
import type { FC } from 'react'; 
import { useNavigate } from 'react-router-dom';
import styles from './HistoriqueCours.module.css';
import blockchainService from '../../services/blockchainService';
import authService from '../../services/authService';
import { getAcceptedSkillExchangesForHistory, submitSkillExchangeReview, confirmSkillExchangeReview, rejectSkillExchange } from '../../services/skillExchangeService';
import messageService from '../../services/messageService';
import ReviewModal, { type ReviewData } from './ReviewModal';

interface User {
  id?: string;
  userId?: string;  // ✅ Ajouter userId pour supporter les deux types d'ID
  name: string;
  avatar: string;
  role: string;
  rating: number;
  reviews: number;
  experience?: string;
  color?: string;
}

interface Review {
  rating: number;
  comment: string;
}

interface Session {
  id: number | string;
  reviewId?: string;
  date: string;
  time: string;
  student?: User;
  tutor?: User;
  subject: string;
  level: string;
  mode: 'online' | 'inperson';
  price: string;
  notes?: string;
  duration?: string;
  review?: Review;
  color?: string;
  status?: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'REVIEW_COMPLETED' | 'DISPUTED' | 'ACCEPTED';
  isSkillExchange?: boolean;
  skillsOffered?: Array<{ name: string; level?: string }>;
  skillsRequested?: Array<{ name: string; level?: string }>;
}

interface SessionsPageProps {
  userRole?: 'tutor' | 'student';
}

const normalizeTimestampMs = (value?: string | number | null): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') {
    return value < 1e12 ? value * 1000 : value;
  }
  const numeric = Number(value);
  if (!Number.isNaN(numeric)) {
    return numeric < 1e12 ? numeric * 1000 : numeric;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const getExchangeDateTime = (exchange: any, fallbackMs: number) => {
  if (exchange.bookings && exchange.bookings.length > 0) {
    const booking = exchange.bookings[0];
    const dateTimeStr = `${booking.date}T${booking.time}`;
    const startTimeMs = Date.parse(dateTimeStr);
    return {
      startTimeMs: Number.isNaN(startTimeMs) ? fallbackMs : startTimeMs,
      dateLabel: booking.date,
      timeLabel: booking.time,
    };
  }

  const createdAtMs = normalizeTimestampMs(exchange.createdAt);
  const safeMs = createdAtMs ?? fallbackMs;
  return {
    startTimeMs: safeMs,
    dateLabel: new Date(safeMs).toLocaleDateString('fr-FR'),
    timeLabel: new Date(safeMs).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
  };
};

const dedupeSkills = (skills?: Array<{ name?: string; level?: string }>) => {
  if (!skills || skills.length === 0) return [] as Array<{ name: string; level?: string }>;
  const map = new Map<string, { name: string; level?: string }>();
  skills.forEach((skill) => {
    const name = skill.name?.trim();
    if (!name) return;
    const key = name.toLowerCase();
    if (!map.has(key)) {
      map.set(key, { name, level: skill.level });
    }
  });
  return Array.from(map.values());
};

const mergeSessionsById = (prev: Session[], next: Session[]) => {
  const map = new Map<string, Session>();
  prev.forEach((session) => map.set(String(session.id), session));
  next.forEach((session) => map.set(String(session.id), session));
  return Array.from(map.values());
};

// Données de démonstration avec types
const tutorUpcomingSessions: Session[] = [
  {
    id: 1,
    date: "23 Décembre 2025",
    time: "15:00 - 17:00",
    student: {
      name: "Emma Martin",
      avatar: "👩‍🎓",
      role: "Étudiante - Terminale S",
      rating: 4.8,
      reviews: 12
    },
    subject: "Mathématiques",
    level: "Terminale",
    mode: "online",
    price: "45🪙",
    notes: "Révision chapitres 7 et 8 - Préparation au bac",
    duration: "2h",
    color: "#FF6B6B"
  },
  {
    id: 2,
    date: "29 Décembre 2025",
    time: "18:00 - 19:30",
    student: {
      name: "Lucas Bernard",
      avatar: "👨‍🎓",
      role: "Étudiant - 1ère ES",
      rating: 4.5,
      reviews: 8
    },
    subject: "Économie",
    level: "1ère",
    mode: "inperson",
    price: "40🪙",
    notes: "Introduction à la macroéconomie - TD sur les indicateurs",
    duration: "1h30",
    color: "#4ECDC4"
  }
];

const tutorPastSessions: Session[] = [
  {
    id: 3,
    date: "10 Mars 2024",
    time: "14:00 - 16:00",
    student: {
      name: "Sophie Dubois",
      avatar: "👩‍💼",
      role: "Étudiante - Terminale",
      rating: 4.9,
      reviews: 15
    },
    subject: "Physique-Chimie",
    level: "Terminale",
    mode: "online",
    price: "45🪙",
    review: {
      rating: 5,
      comment: "Professeur exceptionnel ! Les explications sont claires et les exercices pertinents."
    },
    color: "#FFD166"
  },
  {
    id: 4,
    date: "8 Mars 2024",
    time: "10:00 - 12:00",
    student: {
      name: "Thomas Moreau",
      avatar: "👨‍🔬",
      role: "Étudiant - Prépa",
      rating: 4.7,
      reviews: 20
    },
    subject: "Mathématiques",
    level: "CPGE",
    mode: "inperson",
    price: "50🪙",
    review: {
      rating: 4,
      comment: "Très bon cours, quelques points à approfondir pour le prochain chapitre."
    },
    color: "#06D6A0"
  },
  {
    id: 5,
    date: "5 Mars 2024",
    time: "16:30 - 18:00",
    student: {
      name: "Léa Petit",
      avatar: "👩‍🔬",
      role: "Étudiante - Licence",
      rating: 4.6,
      reviews: 5
    },
    subject: "Statistiques",
    level: "L3",
    mode: "online",
    price: "42🪙",
    review: {
      rating: 5,
      comment: "Merci pour votre patience et vos explications détaillées !"
    },
    color: "#118AB2"
  },
  {
    id: 6,
    date: "1 Mars 2024",
    time: "09:00 - 11:00",
    student: {
      name: "Antoine Rousseau",
      avatar: "👨‍🎨",
      role: "Étudiant - BTS",
      rating: 4.4,
      reviews: 3
    },
    subject: "Marketing",
    level: "BTS",
    mode: "online",
    price: "38🪙",
    review: {
      rating: 4,
      comment: "Cours très pratique avec des cas concrets. Très utile !"
    },
    color: "#7209B7"
  },
  {
    id: 7,
    date: "25 Février 2024",
    time: "17:00 - 19:00",
    student: {
      name: "Camille Leroy",
      avatar: "👩‍💻",
      role: "Étudiante - Master",
      rating: 4.8,
      reviews: 18
    },
    subject: "Data Science",
    level: "M1",
    mode: "inperson",
    price: "55🪙",
    review: {
      rating: 5,
      comment: "Expertise impressionnante. Les exemples en Python étaient parfaits."
    },
    color: "#F72585"
  }
];

const studentUpcomingSessions: Session[] = [
  {
    id: 8,
    date: "19 Mars 2024",
    time: "16:00 - 18:00",
    tutor: {
      name: "Dr. Michel Durand",
      avatar: "👨‍🏫",
      role: "Professeur Agrégé",
      rating: 4.9,
      reviews: 47,
      experience: "15 ans d'expérience"
    },
    subject: "Philosophie",
    level: "Terminale",
    mode: "online",
    price: "55🪙",
    notes: "Préparation dissertation - Thème : La liberté",
    duration: "2h",
    color: "#9D4EDD"
  },
  {
    id: 9,
    date: "22 Mars 2024",
    time: "17:30 - 19:00",
    tutor: {
      name: "Mme. Isabelle Renault",
      avatar: "👩‍🏫",
      role: "Ingénieure ENS",
      rating: 4.8,
      reviews: 32,
      experience: "12 ans d'expérience"
    },
    subject: "Informatique",
    level: "BTS",
    mode: "inperson",
    price: "60🪙",
    notes: "Algorithmique avancée - Structures de données",
    duration: "1h30",
    color: "#FF9E00"
  }
];

const studentPastSessions: Session[] = [
  {
    id: 10,
    date: "12 Mars 2024",
    time: "14:00 - 15:30",
    tutor: {
      name: "M. Jean Lefebvre",
      avatar: "👨‍🔧",
      role: "Docteur en Physique",
      rating: 4.7,
      reviews: 28,
      experience: "10 ans d'expérience"
    },
    subject: "Physique Quantique",
    level: "Master",
    mode: "online",
    price: "65🪙",
    review: {
      rating: 5,
      comment: "Explications lumineuses sur des concepts complexes. Je recommande !"
    },
    color: "#00B4D8"
  },
  {
    id: 11,
    date: "9 Mars 2024",
    time: "11:00 - 13:00",
    tutor: {
      name: "Dr. Marie Curie",
      avatar: "👩‍🔬",
      role: "Chercheuse CNRS",
      rating: 5.0,
      reviews: 41,
      experience: "20 ans d'expérience"
    },
    subject: "Chimie Organique",
    level: "Licence",
    mode: "inperson",
    price: "70🪙",
    review: {
      rating: 5,
      comment: "Un cours magistral ! La qualité d'enseignement est exceptionnelle."
    },
    color: "#FF0054"
  },
  {
    id: 12,
    date: "6 Mars 2024",
    time: "09:00 - 10:30",
    tutor: {
      name: "M. Pierre Lambert",
      avatar: "👨‍💻",
      role: "Data Scientist",
      rating: 4.6,
      reviews: 19,
      experience: "8 ans d'expérience"
    },
    subject: "Python",
    level: "Débutant",
    mode: "online",
    price: "45🪙",
    review: {
      rating: 4,
      comment: "Bon cours d'introduction, pratique et bien structuré."
    },
    color: "#7209B7"
  },
  {
    id: 13,
    date: "28 Février 2024",
    time: "15:00 - 17:00",
    tutor: {
      name: "M. David Martinez",
      avatar: "👨‍🔬",
      role: "PhD Biologie",
      rating: 4.9,
      reviews: 35,
      experience: "7 ans d'expérience"
    },
    subject: "Biologie Moléculaire",
    level: "Licence",
    mode: "inperson",
    price: "60🪙",
    review: {
      rating: 5,
      comment: "Passionnant ! Beaucoup de schémas et d'explications claires."
    },
    color: "#38B000"
  },
  {
    id: 14,
    date: "22 Février 2024",
    time: "10:00 - 12:00",
    tutor: {
      name: "Mme. Sarah Cohen",
      avatar: "👩‍⚖️",
      role: "Avocate - Professeur",
      rating: 4.8,
      reviews: 24,
      experience: "14 ans d'expérience"
    },
    subject: "Droit Civil",
    level: "Master",
    mode: "online",
    price: "75🪙",
    review: {
      rating: 4,
      comment: "Approche très pédagogique des articles de loi complexes."
    },
    color: "#8338EC"
  }
];

const SessionsPage: FC<SessionsPageProps> = ({ userRole = 'tutor' }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [tutorView, setTutorView] = useState<'received' | 'created'>('received'); // Pour tuteurs: "Reçues" vs "Réservées"
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upcomingSessions, setUpcomingSessions] = useState<Session[]>([]);
  const [pastSessions, setPastSessions] = useState<Session[]>([]);
  
  // States pour le ReviewModal
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [visioModalOpen, setVisioModalOpen] = useState(false);
  const [visioLink, setVisioLink] = useState('');
  const [visioSending, setVisioSending] = useState(false);
  const [visioSession, setVisioSession] = useState<Session | null>(null);
  
  const currentUser = authService.getCurrentUser();
  // ⚠️ IMPORTANT: Utiliser currentUser.role comme source de vérité (pas le prop userRole)
  const isTutor = currentUser?.role === 'tutor';
  
  // Rediriger vers MessagePage avec l'ID du tuteur, la conversation sera créée sur cette page
  const handleContact = async (userId: string) => {
    navigate('/messages', { state: { recipientId: userId } });
  };

  // Ouvrir le ReviewModal pour une session
  const handleOpenReviewModal = (session: Session) => {
    setSelectedSession(session);
    setReviewModalOpen(true);
    setReviewError(null);
  };

  const extractVisioLink = (content?: string | null) => {
    if (!content || !content.startsWith('VISIO_LINK|')) return null;
    const parts = content.split('|');
    return {
      url: parts[1] || '',
      title: parts[2] || 'Lien de visio',
      details: parts[3] || ''
    };
  };

  const handlePrepareSession = (session: Session) => {
    setVisioSession(session);
    setVisioLink('');
    setVisioModalOpen(true);
  };

  const handleSendVisioLink = async () => {
    if (!visioSession) return;
    const recipientId = visioSession.student?.userId || visioSession.student?.id;

    if (!recipientId) {
      setError("Impossible de déterminer l'étudiant");
      return;
    }

    let parsedUrl: URL | null = null;
    try {
      parsedUrl = new URL(visioLink.trim());
    } catch {
      setError('Lien de visio invalide');
      return;
    }

    try {
      setVisioSending(true);
      const response = await messageService.startConversation(recipientId);
      if (response?.success && response.data?._id) {
        const title = visioSession.subject || 'Séance de visio';
        const details = `${visioSession.date || ''} ${visioSession.time || ''}`.trim();
        const content = `VISIO_LINK|${parsedUrl.toString()}|${title}|${details}`;
        await messageService.sendMessage(response.data._id, content, 'system');
        setVisioModalOpen(false);
        setVisioLink('');
        setVisioSession(null);
      } else {
        setError('Impossible de démarrer la conversation');
      }
    } catch (err: any) {
      setError(err?.message || "Erreur lors de l'envoi du lien");
    } finally {
      setVisioSending(false);
    }
  };

  const handleJoinSession = async (session: Session) => {
    const recipientId = session.tutor?.userId || session.tutor?.id;
    if (!recipientId) {
      setError("Impossible de déterminer le tuteur");
      return;
    }

    try {
      const response = await messageService.startConversation(recipientId);
      if (!response?.success || !response.data?._id) {
        setError('Impossible de charger la conversation');
        return;
      }

      const messagesResponse = await messageService.getMessages(response.data._id, 1, 100);
      const messages = messagesResponse?.data || [];
      const lastVisio = [...messages].reverse().find((message: any) => extractVisioLink(message?.content));
      const visioData = extractVisioLink(lastVisio?.content);

      if (visioData?.url) {
        window.open(visioData.url, '_blank');
        return;
      }

      setError('Aucun lien de visio trouvé. Contactez le tuteur.');
      navigate('/messages', { state: { recipientId } });
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de la récupération du lien');
    }
  };

  const handleCancelSession = async (session: Session) => {
    try {
      if (session.isSkillExchange) {
        await rejectSkillExchange(String(session.id));
      } else {
        await blockchainService.cancelBooking(String(session.id));
      }

      setUpcomingSessions(prev => prev.filter((item) => String(item.id) !== String(session.id)));
      setPastSessions(prev => prev.filter((item) => String(item.id) !== String(session.id)));
    } catch (err: any) {
      setError(err?.message || "Erreur lors de l'annulation");
    }
  };

  // Soumettre et confirmer l'avis
  const handleSubmitReview = async (reviewData: ReviewData) => {
    if (!selectedSession || !currentUser?.id) {
      setReviewError('Données manquantes');
      return;
    }

    try {
      setReviewLoading(true);
      setReviewError(null);

      // reviewData contient déjà targetUserId du MenuModal
      if (!reviewData.targetUserId) {
        throw new Error('Impossible de déterminer l\'utilisateur cible');
      }

      const reviewId = selectedSession.reviewId || String(selectedSession.id);

      // Soumettre l'avis
      const submitResult = selectedSession.isSkillExchange
        ? await submitSkillExchangeReview(String(selectedSession.id), {
            targetUserId: reviewData.targetUserId,
            comment: reviewData.comment,
            rating: reviewData.rating,
          })
        : await blockchainService.submitReview(String(reviewId), {
            targetUserId: reviewData.targetUserId,
            comment: reviewData.comment,
            rating: reviewData.rating,
          });

      console.log('✅ Avis soumis:', submitResult);

      // Confirmer l'avis (irréversible)
      const confirmResult = selectedSession.isSkillExchange
        ? await confirmSkillExchangeReview(String(selectedSession.id))
        : await blockchainService.confirmReview(String(reviewId));

      console.log('✅ Avis confirmé:', confirmResult);

      if (confirmResult?.allPartiesConfirmed || confirmResult?.bookingStatus === 'COMPLETED') {
        setPastSessions((prev) =>
          prev.map((session) =>
            session.id === selectedSession.id
              ? { ...session, status: 'REVIEW_COMPLETED' }
              : session
          )
        );
      }

      // Fermer le modal
      setReviewModalOpen(false);
      setSelectedSession(null);
    } catch (err: any) {
      console.error('❌ Erreur soumission avis:', err);
      setReviewError(err.message || 'Erreur lors de la soumission de l\'avis');
      throw err; // Repropager pour que le modal affiche l'erreur
    } finally {
      setReviewLoading(false);
    }
  };
  
  useEffect(() => {
    if (!currentUser?.id) return;
    
    const loadSessions = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (!isTutor) {
          // Charger uniquement les cours acceptés (CONFIRMED/COMPLETED) de l'étudiant
          const response = await blockchainService.getStudentCourses(currentUser.id);
          
          if (response?.success && response.data) {
            const bookings = response.data;
            console.log('📚 [HistoriqueCours Étudiant] Cours reçus:', bookings);
            
            // Séparer les cours à venir et passés
            const now = Math.floor(Date.now() / 1000); // Timestamp en secondes
            console.log('🕒 [HistoriqueCours Étudiant] Timestamp actuel:', now, new Date(now * 1000).toLocaleString());
            console.log(`✅ [HistoriqueCours Étudiant] ${bookings.length} cours reçus du backend`);
            
            const upcoming = bookings.filter((b: any) => {
              // Vérifier si startTime existe, sinon recréer à partir de date/time
              const startTime = b.startTime || (b.date && b.time ? Math.floor(new Date(`${b.date}T${b.time}`).getTime() / 1000) : null);
              const isUpcoming = startTime > now;
              console.log(`📅 Booking ${b.id}: startTime=${startTime} (${new Date(startTime * 1000).toLocaleString()}), isUpcoming=${isUpcoming}`);
              return isUpcoming;
            });
            
            const past = bookings.filter((b: any) => {
              const startTime = b.startTime || (b.date && b.time ? Math.floor(new Date(`${b.date}T${b.time}`).getTime() / 1000) : null);
              return startTime <= now;
            });
            
            console.log(`✅ [HistoriqueCours Étudiant] ${upcoming.length} à venir, ${past.length} passés`);
            
            // Transformer les données du backend au format Session
            const transformBooking = (booking: any): Session => {
              const startTime = booking.startTime || (booking.date && booking.time ? Math.floor(new Date(`${booking.date}T${booking.time}`).getTime() / 1000) : null);
              const isSkillExchange = booking.amount === 0 || booking.isSkillExchange === true;
              const notes = isSkillExchange
                ? (booking.studentNotes || booking.description || booking.annonce?.description || '')
                : (booking.annonce?.description || '');
              return {
                id: booking.blockchainId || booking.id,
                date: new Date(startTime * 1000).toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                }),
                time: new Date(startTime * 1000).toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit'
                }),
                tutor: booking.tutor ? {
                  id: booking.tutorId || booking.tutor.id,
                  name: `${booking.tutor.firstName || ''} ${booking.tutor.lastName || ''}`.trim(),
                  avatar: '👨‍🏫',
                  role: 'Tuteur',
                  rating: 4.8,
                  reviews: 0,
                  experience: `${booking.tutor.experienceYears || 5} ans d'expérience`,
                  color: '#3B82F6'
                } : undefined,
                subject: isSkillExchange ? 'Échange de cours' : (booking.annonce?.subject || booking.description || 'Cours particulier'),
                level: isSkillExchange ? 'Échange de compétences' : (booking.annonce?.level || 'Tous niveaux'),
                mode: booking.annonce?.teachingMode === 'online' || booking.annonce?.teachingMode === 'En ligne' ? 'online' : 'inperson',
                price: isSkillExchange ? '0€' : `${booking.amount}🪙`,
                notes,
                duration: `${booking.duration}min`,
                color: '#3B82F6',
                status: booking.status
              };
            };
            
            setUpcomingSessions(upcoming.map(transformBooking));
            setPastSessions(past.map(transformBooking));
          }
        } else {
          // Pour tuteur, charger selon la vue (reçues ou réservées)
          let response;
          
          if (tutorView === 'received') {
            // Cours REÇUS (réservations où je suis le tuteur)
            response = await blockchainService.getBookingsByTutor(currentUser.id);
          } else {
            // Cours RÉSERVÉS (réservations où je suis l'étudiant)
            response = await blockchainService.getBookingsByStudent(currentUser.id);
          }
          
          if (response?.success && response.data) {
            const bookings = response.data;
            console.log(`📚 [HistoriqueCours Tuteur] ${tutorView === 'received' ? 'Cours reçus' : 'Cours réservés'}:`, bookings);
            
            // Séparer les cours à venir et passés
            const now = Math.floor(Date.now() / 1000); // Timestamp en secondes
            console.log('🕒 [HistoriqueCours Tuteur] Timestamp actuel:', now, new Date(now * 1000).toLocaleString());
            
            // Filtrer les cours acceptés (CONFIRMED, COMPLETED, REVIEW_COMPLETED) - exclure PENDING et CANCELLED
            const validBookings = bookings.filter((b: any) => 
              ['CONFIRMED', 'COMPLETED', 'REVIEW_COMPLETED'].includes(b.status)
            );
            console.log(`✅ [HistoriqueCours Tuteur] ${validBookings.length} cours valides (CONFIRMED/COMPLETED/REVIEW_COMPLETED)`);
            
            const upcoming = validBookings.filter((b: any) => {
              const startTime = b.startTime || (b.date && b.time ? Math.floor(new Date(`${b.date}T${b.time}`).getTime() / 1000) : null);
              const isUpcoming = startTime > now;
              console.log(`📅 Booking ${b.id}: startTime=${startTime} (${new Date(startTime * 1000).toLocaleString()}), isUpcoming=${isUpcoming}`);
              return isUpcoming;
            });
            
            const past = validBookings.filter((b: any) => {
              const startTime = b.startTime || (b.date && b.time ? Math.floor(new Date(`${b.date}T${b.time}`).getTime() / 1000) : null);
              return startTime <= now;
            });
            
            console.log(`✅ [HistoriqueCours Tuteur] ${upcoming.length} à venir, ${past.length} passés`);
            
            // Transformer les données du backend au format Session
            const transformBooking = (booking: any): Session => {
              const startTime = booking.startTime || (booking.date && booking.time ? Math.floor(new Date(`${booking.date}T${booking.time}`).getTime() / 1000) : null);
              const isSkillExchange = booking.amount === 0 || booking.isSkillExchange === true;
              const notes = isSkillExchange
                ? (booking.studentNotes || booking.description || booking.annonce?.description || '')
                : (booking.annonce?.description || '');
              return {
                id: booking.blockchainId || booking.id,
                date: new Date(startTime * 1000).toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                }),
                time: new Date(startTime * 1000).toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit'
                }),
                student: tutorView === 'received' ? (booking.student ? {
                  id: booking.studentId || booking.student.id,
                  name: `${booking.student.firstName || ''} ${booking.student.lastName || ''}`.trim(),
                  avatar: '👩‍🎓',
                  role: 'Étudiant',
                  rating: 4.5,
                  reviews: 0,
                  color: '#8B5CF6'
                } : undefined) : (booking.tutor ? {
                  id: booking.tutorId || booking.tutor.id,
                  name: `${booking.tutor.firstName || ''} ${booking.tutor.lastName || ''}`.trim(),
                  avatar: '👨‍🏫',
                  role: 'Tuteur',
                  rating: 4.8,
                  reviews: 0,
                  experience: `${booking.tutor.experienceYears || 5} ans d'expérience`,
                  color: '#3B82F6'
                } : undefined),
                subject: isSkillExchange ? 'Échange de cours' : (booking.annonce?.subject || booking.description || 'Cours particulier'),
                level: isSkillExchange ? 'Échange de compétences' : (booking.annonce?.level || 'Tous niveaux'),
                mode: booking.annonce?.teachingMode === 'online' || booking.annonce?.teachingMode === 'En ligne' ? 'online' : 'inperson',
                price: isSkillExchange ? '0€' : `${booking.amount}🪙`,
                notes,
                duration: `${booking.duration}min`,
                color: tutorView === 'received' ? '#8B5CF6' : '#3B82F6',
                status: booking.status
              };
            };
            
            setUpcomingSessions(upcoming.map(transformBooking));
            setPastSessions(past.map(transformBooking));
          }
        }
        
        // Charger les échanges de compétences acceptés (indépendamment pour tuteur et étudiant)
        try {
          const exchangesResponse = await getAcceptedSkillExchangesForHistory();
          if (exchangesResponse?.data) {
            const allExchanges = exchangesResponse.data;
            const nowMs = Date.now();
            const getStartTimeMs = (exchange: any) => getExchangeDateTime(exchange, nowMs + 86400000).startTimeMs;
            
            if (!isTutor) {
              // Étudiant: filtrer les échanges où je suis l'étudiant
              const acceptedExchanges = allExchanges.filter(
                (ex: any) => ex.studentId === currentUser.id && (ex.status || '').toUpperCase() === 'ACCEPTED'
              );
              
              console.log('🔄 [HistoriqueCours Étudiant] Échanges acceptés:', acceptedExchanges);

              // Transformer les échanges en sessions
              const transformExchange = (exchange: any): Session => {
                const { startTimeMs } = getExchangeDateTime(exchange, nowMs + 86400000);
                const skillsOffered = dedupeSkills(exchange.skillsOffered || (exchange.skillOffered ? [exchange.skillOffered] : []));
                const skillsRequested = dedupeSkills(exchange.skillsRequested || (exchange.skillRequested ? [exchange.skillRequested] : []));
                const primaryRequested = skillsRequested[0];
                const requestedNames = skillsRequested.map((skill) => skill.name).filter(Boolean) as string[];
                const subject = exchange.annonce?.title || exchange.annonce?.subject || (requestedNames.length > 0
                  ? requestedNames.join(', ')
                  : 'Échange de cours');
                const level = exchange.annonce?.level || (primaryRequested?.level
                  ? `${primaryRequested.level.charAt(0).toUpperCase()}${primaryRequested.level.slice(1)}`
                  : 'Échange de compétences');
                const exchangeId = exchange.id || `${exchange.studentId}-${exchange.tutorId}-${exchange.createdAt || startTimeMs}`;
                const reviewId = exchange.frontendId || exchangeId;

                return {
                  id: exchangeId,
                  reviewId,
                  date: new Date(startTimeMs).toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  }),
                  time: new Date(startTimeMs).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                  tutor: exchange.tutor ? {
                    id: exchange.tutorId || exchange.tutor.id,
                    name: exchange.tutor.firstName || exchange.tutor.name || 'Tuteur',
                    avatar: '👨‍🏫',
                    role: 'Tuteur',
                    rating: 4.8,
                    reviews: 0,
                    color: '#8B5CF6'
                  } : undefined,
                  subject,
                  level,
                  mode: 'online' as const,
                  price: '0€',
                  notes: exchange.studentNotes || '',
                  duration: exchange.bookings?.[0]?.duration ? `${exchange.bookings[0].duration}min` : '60min',
                  color: '#8B5CF6',
                  status: 'ACCEPTED' as const,
                  isSkillExchange: true,
                  skillsOffered,
                  skillsRequested
                };
              };

              const exchangeUpcoming = acceptedExchanges.filter((ex: any) => {
                const startTimeMs = getStartTimeMs(ex);
                return startTimeMs > nowMs;
              });

              const exchangePast = acceptedExchanges.filter((ex: any) => {
                const startTimeMs = getStartTimeMs(ex);
                return startTimeMs <= nowMs;
              });

              setUpcomingSessions(prev => mergeSessionsById(prev, exchangeUpcoming.map(transformExchange)));
              setPastSessions(prev => mergeSessionsById(prev, exchangePast.map(transformExchange)));
            } else if (tutorView === 'received') {
              // Tuteur (vue reçus): filtrer les échanges où je suis le tuteur
              const acceptedExchanges = allExchanges.filter(
                (ex: any) => ex.tutorId === currentUser.id && (ex.status || '').toUpperCase() === 'ACCEPTED'
              );
              
              console.log('🔄 [HistoriqueCours Tuteur] Échanges reçus:', acceptedExchanges);

              // Transformer les échanges en sessions
              const transformExchange = (exchange: any): Session => {
                const { startTimeMs } = getExchangeDateTime(exchange, nowMs + 86400000);
                const skillsOffered = dedupeSkills(exchange.skillsOffered || (exchange.skillOffered ? [exchange.skillOffered] : []));
                const skillsRequested = dedupeSkills(exchange.skillsRequested || (exchange.skillRequested ? [exchange.skillRequested] : []));
                const primaryRequested = skillsRequested[0];
                const requestedNames = skillsRequested.map((skill) => skill.name).filter(Boolean) as string[];
                const subject = exchange.annonce?.title || exchange.annonce?.subject || (requestedNames.length > 0
                  ? requestedNames.join(', ')
                  : 'Échange de cours');
                const level = exchange.annonce?.level || (primaryRequested?.level
                  ? `${primaryRequested.level.charAt(0).toUpperCase()}${primaryRequested.level.slice(1)}`
                  : 'Échange de compétences');
                const exchangeId = exchange.id || `${exchange.studentId}-${exchange.tutorId}-${exchange.createdAt || startTimeMs}`;
                const reviewId = exchange.frontendId || exchangeId;

                return {
                  id: exchangeId,
                  reviewId,
                  date: new Date(startTimeMs).toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  }),
                  time: new Date(startTimeMs).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                  student: exchange.student ? {
                    id: exchange.studentId || exchange.student.id,
                    name: exchange.student.firstName || exchange.student.name || 'Étudiant',
                    avatar: '👩‍🎓',
                    role: 'Étudiant',
                    rating: 4.8,
                    reviews: 0,
                    color: '#EC4899'
                  } : undefined,
                  subject,
                  level,
                  mode: 'online' as const,
                  price: '0€',
                  notes: exchange.studentNotes || '',
                  duration: exchange.bookings?.[0]?.duration ? `${exchange.bookings[0].duration}min` : '60min',
                  color: '#EC4899',
                  status: 'ACCEPTED' as const,
                  isSkillExchange: true,
                  skillsOffered,
                  skillsRequested
                };
              };

              const exchangeUpcoming = acceptedExchanges.filter((ex: any) => {
                const startTimeMs = getStartTimeMs(ex);
                return startTimeMs > nowMs;
              });

              const exchangePast = acceptedExchanges.filter((ex: any) => {
                const startTimeMs = getStartTimeMs(ex);
                return startTimeMs <= nowMs;
              });

              setUpcomingSessions(prev => mergeSessionsById(prev, exchangeUpcoming.map(transformExchange)));
              setPastSessions(prev => mergeSessionsById(prev, exchangePast.map(transformExchange)));
            }
          }
        } catch (err) {
          console.error('Erreur lors du chargement des échanges acceptés:', err);
        }
      } catch (err: any) {
          console.error('Erreur chargement sessions:', err);
          setError(err.message || 'Erreur lors du chargement des sessions');
        } finally {
          setLoading(false);
        }
      };
    
    loadSessions();
  }, [currentUser?.id, isTutor, tutorView]);
  
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Chargement des sessions...</p>
        </div>
      </div>
    );
  }
  
  const renderUserProfile = (user: User) => (
    <div className={styles.userProfile}>
      <div className={styles.userAvatar} style={{ backgroundColor: user.color }}>
        {user.avatar}
      </div>
      <div className={styles.userInfo}>
        <h3 className={styles.userName}>{user.name}</h3>
        <div className={styles.userRole}>
          <span className={styles.roleIcon}>🎓</span>
          {user.role}
        </div>
        <div className={styles.userRating}>
          <div className={styles.ratingStars}>
            {[...Array(5)].map((_, i) => (
              <span 
                key={i} 
                className={`${styles.star} ${i < Math.floor(user.rating) ? styles.filled : ''}`}
              >
                ★
              </span>
            ))}
          </div>
          <span className={styles.ratingValue}>
            {user.rating}/5 ({user.reviews} avis)
          </span>
        </div>
        {user.experience && (
          <div className={styles.userExperience}>
            <span style={{ color: '#3B82F6', fontWeight: 600, fontSize: '0.9rem' }}>
              {user.experience}
            </span>
          </div>
        )}
      </div>
    </div>
  );
  
  const renderSessionCard = (session: Session, isPast: boolean = false) => {
    const user = isTutor ? session.student : session.tutor;
    
    if (!user) return null;
    
    return (
      <div key={session.id} className={styles.sessionCard}>
        <div className={styles.sessionHeader}>
          <div className={styles.dateTime}>
            <div className={styles.sessionDate}>
              <span className={styles.dateIcon}>📅</span>
              {session.date}
            </div>
            <div className={styles.sessionTime}>
              <span className={styles.timeIcon}>🕒</span>
              {session.time} • {session.duration || '1h30'}
            </div>
          </div>
          <div className={styles.sessionStatusContainer}>
            {/* Badge de statut blockchain */}
            {session.status && (
              <div className={`${styles.statusBadge} ${styles[`status${session.status}`]}`}>
                {session.status === 'PENDING' && '⏳ En attente'}
                {session.status === 'CONFIRMED' && '✅ Confirmé'}
                {session.status === 'CANCELLED' && '❌ Annulé'}
                {session.status === 'COMPLETED' && '✔️ Terminé'}
                {session.status === 'REVIEW_COMPLETED' && '✨ Avis confirmé'}
                {session.status === 'DISPUTED' && '⚠️ Litige'}
              </div>
            )}
            {/* Badge temporel */}
            <div className={`${styles.sessionStatus} ${isPast ? styles.statusCompleted : styles.statusUpcoming}`}>
              {isPast ? (
                <>
                  ✅ Passé
                  {session.status === 'REVIEW_COMPLETED' && ' • ✅ Complété!'}
                </>
              ) : (
                '🔜 À venir'
              )}
            </div>
          </div>
        </div>
        
        <div className={styles.sessionBody}>
          <div>
            {renderUserProfile(user)}
            
            <div className={styles.sessionDetails}>
              <div className={styles.detailGroup}>
                <div className={styles.detailLabel}>
                  <span className={styles.labelIcon}>📚</span>
                  MATIÈRE
                </div>
                <div className={styles.detailValue}>
                  <span className={styles.subjectBadge}>
                    {session.subject}
                  </span>
                </div>
              </div>
              
              <div className={styles.detailGroup}>
                <div className={styles.detailLabel}>
                  <span className={styles.labelIcon}>🎯</span>
                  NIVEAU
                </div>
                <div className={styles.detailValue}>
                  {session.level}
                </div>
              </div>
              
              <div className={styles.detailGroup}>
                <div className={styles.detailLabel}>
                  <span className={styles.labelIcon}>📍</span>
                  MODE
                </div>
                <div className={styles.detailValue}>
                  <span className={`${styles.modeBadge} ${
                    session.mode === 'online' ? styles.modeOnline : styles.modeInPerson
                  }`}>
                    {session.mode === 'online' ? '🖥️ En ligne' : '👥 Présentiel'}
                  </span>
                </div>
              </div>
            </div>

            {/* Afficher les compétences pour les échanges */}
            {session.isSkillExchange && (session.skillsOffered || session.skillsRequested) && (
              <div className={styles.skillsExchange}>
                {session.skillsOffered && session.skillsOffered.length > 0 && (
                  <div className={styles.skillsSection}>
                    <div className={styles.skillsSectionLabel}>
                      <span>📚 {isTutor ? 'Compétences que l\'étudiant enseigne' : 'Mes compétences à enseigner'}</span>
                    </div>
                    <div className={styles.skillsList}>
                      {session.skillsOffered.map((skill: any, idx: number) => (
                        <div key={idx} className={styles.skillBadge}>
                          <span className={styles.skillName}>{skill.name}</span>
                          {skill.level && (
                            <span className={styles.skillLevel}>
                              {skill.level.charAt(0).toUpperCase() + skill.level.slice(1)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {session.skillsRequested && session.skillsRequested.length > 0 && (
                  <div className={styles.skillsSection}>
                    <div className={styles.skillsSectionLabel}>
                      <span>🎓 {isTutor ? 'Compétences que l\'étudiant veut apprendre' : 'Compétences à apprendre'}</span>
                    </div>
                    <div className={styles.skillsList}>
                      {session.skillsRequested.map((skill: any, idx: number) => (
                        <div key={idx} className={styles.skillBadge}>
                          <span className={styles.skillName}>{skill.name}</span>
                          {skill.level && (
                            <span className={styles.skillLevel}>
                              {skill.level.charAt(0).toUpperCase() + skill.level.slice(1)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {session.notes && (
              <div className={styles.sessionNotes}>
                <div className={styles.notesLabel}>
                  <span className={styles.notesIcon}>📝</span>
                  NOTES DE LA SÉANCE
                </div>
                <p className={styles.notesText}>{session.notes}</p>
              </div>
            )}
            
            {isPast && session.review && (
              <div className={styles.reviewCard}>
                <div className={styles.reviewHeader}>
                  <div className={styles.reviewRating}>
                    <div className={styles.ratingStars}>
                      {[...Array(5)].map((_, i) => (
                        <span 
                          key={i} 
                          className={`${styles.star} ${i < session.review!.rating ? styles.filled : ''}`}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                    <span style={{ color: '#6B7280', fontWeight: 600, fontSize: '0.9rem' }}>
                      Avis de {isTutor ? "l'élève" : "l'étudiant"}
                    </span>
                  </div>
                </div>
                <p className={styles.reviewComment}>"{session.review!.comment}"</p>
              </div>
            )}
          </div>
          
          <div className={styles.priceSection}>
            <div className={styles.sessionPrice}>
              {session.price}
              <span className={styles.priceUnit}>par séance</span>
            </div>
            
            <div className={styles.sessionActions}>
              {!isPast ? (
                <>
                  <button
                    className={`${styles.actionButton} ${styles.primaryButton}`}
                    onClick={() => {
                      if (isTutor) {
                        handlePrepareSession(session);
                      } else {
                        handleJoinSession(session);
                      }
                    }}
                  >
                    <span>🎥</span>
                    {isTutor ? 'Préparer la séance' : 'Rejoindre le cours'}
                  </button>
                  <button 
                    className={`${styles.actionButton} ${styles.secondaryButton}`}
                    onClick={() => {
                      const contactId = user.userId || user.id;
                      contactId && handleContact(contactId);
                    }}
                  >
                    <span>💬</span>
                    Contacter {isTutor ? "l'élève" : "le tuteur"}
                  </button>
                  <button
                    className={`${styles.actionButton} ${styles.dangerButton}`}
                    onClick={() => handleCancelSession(session)}
                  >
                    <span>❌</span>
                    Annuler la séance
                  </button>
                </>
                  ) : (
                    <button 
                      className={`${styles.actionButton} ${styles.primaryButton}`}
                      onClick={() => handleOpenReviewModal(session)}
                    >
                      <span>✓</span>
                      Confirmer
                    </button>
                  )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSectionHeader = (title: string, subtitle: string, sessionCount: number) => (
    <div className={styles.sectionHeader}>
      <div>
        <h2 className={styles.sectionTitle}>{title}</h2>
        <p className={styles.sectionSubtitle}>
          {subtitle} • <strong>{sessionCount} séances</strong>
        </p>
      </div>
    </div>
  );

  return (
    <div className={`${styles.container} ${isTutor ? styles.tutorPage : styles.studentPage}`}>
      {/* En-tête */}
      <header className={styles.header}>
        <h1 className={styles.title}>
          {isTutor ? 'Mes Cours' : 'Mes Séances'}
        </h1>
        <p className={styles.subtitle}>
          {isTutor 
            ? 'Gérez vos séances de tutorat, consultez vos statistiques et suivez la progression de vos élèves'
            : 'Suivez vos prochaines séances, consultez votre historique et gérez vos réservations'
          }
        </p>
      </header>
      
      {/* Erreur */}
      {error && (
        <div style={{
          padding: '16px',
          marginBottom: '20px',
          backgroundColor: '#FEE2E2',
          border: '1px solid #FECACA',
          borderRadius: '8px',
          color: '#991B1B'
        }}>
          <strong>Erreur:</strong> {error}
        </div>
      )}
      
      {/* Navigation par onglets */}
      <div className={styles.tabsContainer}>
        <button 
          className={`${styles.tabButton} ${activeTab === 'upcoming' ? styles.active : ''}`}
          onClick={() => setActiveTab('upcoming')}
        >
          À Venir
          <span className={styles.tabBadge}>{upcomingSessions.length}</span>
        </button>
        <button 
          className={`${styles.tabButton} ${activeTab === 'past' ? styles.active : ''}`}
          onClick={() => setActiveTab('past')}
        >
          Passés
          <span className={styles.tabBadge}>{pastSessions.length}</span>
        </button>
        
        {/* Pour tuteurs: toggles pour changer la perspective */}
        {isTutor && (
          <div className={styles.perspectiveToggleContainer}>
            <button 
              className={`${styles.perspectiveButton} ${tutorView === 'received' ? styles.active : ''}`}
              onClick={() => setTutorView('received')}
              title="Voir les cours qu'on vous a réservé"
            >
              Mes cours reçus
            </button>
            <button 
              className={`${styles.perspectiveButton} ${tutorView === 'created' ? styles.active : ''}`}
              onClick={() => setTutorView('created')}
              title="Voir les cours que vous avez réservé"
            >
              Mes cours réservés
            </button>
          </div>
        )}
      </div>
      
      {/* Section Cours à Venir */}
      <div className={`${styles.sectionContainer} ${activeTab === 'upcoming' ? styles.active : ''}`}>
        <section className={styles.upcomingSection}>
          {renderSectionHeader(
            "Cours à Venir",
            "Vos prochaines séances programmées",
            upcomingSessions.length
          )}
          
          <div className={styles.sessionsGrid}>
            {upcomingSessions.length > 0 ? (
              upcomingSessions.map(session => renderSessionCard(session, false))
            ) : (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📅</div>
                <h3 className={styles.emptyTitle}>Aucune séance à venir</h3>
                <p className={styles.emptyText}>
                  Vous n'avez pas de séances programmées pour le moment.
                  {isTutor 
                    ? ' Créez des annonces pour attirer de nouveaux élèves !'
                    : ' Trouvez un tuteur pour vos prochaines révisions !'
                  }
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
      
      {/* Section Cours Passés */}
      <div className={`${styles.sectionContainer} ${activeTab === 'past' ? styles.active : ''}`}>
        <section className={styles.pastSection}>
          {renderSectionHeader(
            "Historique des Cours",
            "Consultez vos séances terminées et les retours",
            pastSessions.length
          )}
          
          <div className={styles.sessionsGrid}>
            {pastSessions.length > 0 ? (
              pastSessions.map(session => renderSessionCard(session, true))
            ) : (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📚</div>
                <h3 className={styles.emptyTitle}>Aucun cours passé</h3>
                <p className={styles.emptyText}>
                  Vous n'avez pas encore terminé de séances.
                  {isTutor 
                    ? ' Vos futurs cours apparaîtront ici une fois terminés.'
                    : ' Vos séances à venir apparaîtront ici une fois terminées.'
                  }
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      {visioModalOpen && (
        <div className={styles.visioOverlay}>
          <div className={styles.visioModal}>
            <div className={styles.visioHeader}>
              <h2 className={styles.visioTitle}>Programmer la séance</h2>
              <button
                className={styles.visioClose}
                onClick={() => {
                  setVisioModalOpen(false);
                  setVisioSession(null);
                  setVisioLink('');
                }}
                disabled={visioSending}
              >
                ✕
              </button>
            </div>
            <div className={styles.visioBody}>
              <label className={styles.visioLabel}>Lien de visio</label>
              <input
                className={styles.visioInput}
                placeholder="https://meet.google.com/xxx-xxxx-xxx"
                value={visioLink}
                onChange={(event) => setVisioLink(event.target.value)}
                disabled={visioSending}
              />
              <p className={styles.visioHint}>Le lien sera envoye a l'etudiant dans Messages.</p>
            </div>
            <div className={styles.visioFooter}>
              <button
                className={styles.visioCancel}
                onClick={() => {
                  setVisioModalOpen(false);
                  setVisioSession(null);
                  setVisioLink('');
                }}
                disabled={visioSending}
              >
                Annuler
              </button>
              <button
                className={styles.visioConfirm}
                onClick={handleSendVisioLink}
                disabled={visioSending || !visioLink.trim()}
              >
                {visioSending ? 'Envoi...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ReviewModal pour les cours passés */}
      {selectedSession && (
        <ReviewModal
          isOpen={reviewModalOpen}
          onClose={() => {
            setReviewModalOpen(false);
            setSelectedSession(null);
          }}
          onSubmit={handleSubmitReview}
          reviewerType={isTutor ? 'tutor' : 'student'}
          targetName={isTutor 
            ? selectedSession.student?.name || 'l\'élève' 
            : selectedSession.tutor?.name || 'le tuteur'
          }
          bookingId={String(selectedSession.reviewId || selectedSession.id)}
          targetUserId={isTutor 
            ? selectedSession.student?.id || selectedSession.student?.userId || '' 
            : selectedSession.tutor?.id || selectedSession.tutor?.userId || ''
          }
        />
      )}
    </div>
  );
};

// Composants séparés pour chaque rôle
export const TutorSessionsPage: FC = () => <SessionsPage userRole="tutor" />;
export const StudentSessionsPage: FC = () => <SessionsPage userRole="student" />;

export default SessionsPage;