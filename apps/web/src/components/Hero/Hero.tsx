import React, { useState, useEffect } from 'react';
import annonceService from '../../services/annonceService';
import type { AnnonceFromDB } from '../../services/annonceService';
import defaultImage from '../../assets/images/image_accueil.png'; 

const Hero: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [tutors, setTutors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasAnnonces, setHasAnnonces] = useState(false);

  const gradientClasses = [
    "from-blue-500 to-indigo-500",
    "from-green-500 to-emerald-600",
    "from-purple-500 to-pink-600",
    "from-orange-500 to-red-400",
    "from-cyan-400 to-sky-400",
    "from-yellow-500 to-amber-600",
    "from-pink-500 to-rose-600",
    "from-teal-500 to-cyan-600",
  ];

  // Récupérer les annonces pour afficher les tuteurs
  useEffect(() => {
    const fetchAnnonces = async () => {
      try {
        setIsLoading(true);
        
        // Rechercher toutes les annonces (sans filtre)
        const response = await annonceService.searchAnnonces({
          limit: 5, // Limite à 5 annonces max
        });
        if (response.success && response.data.annonces.length > 0) {
          
          // Transformer les annonces en tuteurs pour le carrousel
          const tutorsFromAnnonces = response.data.annonces.map((annonce: AnnonceFromDB, index: number) => {
            // Récupérer le tuteur depuis l'annonce
            const tutor = annonce.tutor;
            
            return {
              id: annonce.id,
              tutorId: tutor?.id,
              name: `${tutor?.user?.firstName || 'Tuteur'} ${tutor?.user?.lastName || ''}`.trim() || 'Tuteur',
              subject: annonce.subject || annonce.subjects?.[0] || 'Tutorat',
              rating: tutor?.rating || 5,
              reviews: tutor?.reviewsCount || 0,
              price: `€${annonce.hourlyRate || 50}/heure`,
              emoji: getSubjectEmoji(annonce.subject || annonce.subjects?.[0]),
              status: "Disponible", // Par défaut
              badge: getBadgeFromTutor(tutor),
              gradient: gradientClasses[index % gradientClasses.length],
              profilePicture: tutor?.profilePicture,
              annonce: annonce // Garder référence à l'annonce
            };
          });
                    
          setTutors(tutorsFromAnnonces);
          setHasAnnonces(true);
        } else {
          console.log('⚠️ Aucune annonce trouvée');
          
          // Tuteurs de démo pour tester le carrousel
          const demoTutors = [
            {
              id: 'demo-1',
              tutorId: 'demo-tutor-1',
              name: "Prof. Mathématiques",
              subject: "Mathématiques",
              rating: 4.8,
              reviews: 24,
              price: "€45/heure",
              emoji: "🧮",
              status: "En ligne",
              badge: "Populaire",
              gradient: gradientClasses[0],
              profilePicture: null
            },
            {
              id: 'demo-2',
              tutorId: 'demo-tutor-2',
              name: "Expert Informatique",
              subject: "Programmation Web",
              rating: 4.9,
              reviews: 36,
              price: "€60/heure",
              emoji: "💻",
              status: "Disponible",
              badge: "⭐ Premium",
              gradient: gradientClasses[1],
              profilePicture: null
            },
            {
              id: 'demo-3',
              tutorId: 'demo-tutor-3',
              name: "Coach Langues",
              subject: "Anglais & Espagnol",
              rating: 4.7,
              reviews: 18,
              price: "€35/heure",
              emoji: "🇬🇧",
              status: "Disponible",
              badge: "Économique",
              gradient: gradientClasses[2],
              profilePicture: null
            }
          ];
          
          console.log('🎭 Affichage tuteurs de démo');
          setTutors(demoTutors);
          setHasAnnonces(false); // Pour afficher l'image d'accueil
        }
      } catch (error) {
        console.error('💥 Erreur lors de la récupération des annonces:', error);
        
        // En cas d'erreur, afficher des tuteurs de démo pour tester
        const demoTutors = [
          {
            id: 'error-1',
            tutorId: 'error-tutor-1',
            name: "Tuteur Test",
            subject: "Matière test",
            rating: 5,
            reviews: 10,
            price: "€50/heure",
            emoji: "👨‍🏫",
            status: "Disponible",
            badge: "Test",
            gradient: gradientClasses[0],
            profilePicture: null
          }
        ];
        
        setTutors(demoTutors);
        setHasAnnonces(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnnonces();
  }, []);

  const nextTutor = () => {
    if (tutors.length === 0) return;
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % tutors.length);
      setIsAnimating(false);
    }, 300);
  };

  useEffect(() => {
    if (tutors.length > 0) {
      const interval = setInterval(nextTutor, 3000);
      return () => clearInterval(interval);
    }
  }, [tutors.length]);

  // Fonction pour obtenir l'emoji correspondant à la matière
  const getSubjectEmoji = (subject?: string): string => {
    const emojiMap: Record<string, string> = {
      'Mathématiques': '🧮',
      'Informatique': '💻',
      'Physique': '⚛️',
      'Chimie': '🧪',
      'Biologie': '🧬',
      'Français': '📚',
      'Anglais': '🇬🇧',
      'Histoire': '🏛️',
      'Philosophie': '🤔',
      'Économie': '📈',
      'Droit': '⚖️',
      'Médecine': '⚕️',
      'Musique': '🎵',
      'Arts': '🎨',
      'Sport': '⚽',
    };
    return emojiMap[subject || ''] || '👨‍🏫';
  };

  // Fonction pour obtenir le badge selon le tuteur
  const getBadgeFromTutor = (tutor: any): string => {
    if (!tutor) return 'Nouveau';
    if (tutor.reviewsCount > 20) return 'Populaire';
    if (tutor.rating >= 4.8) return '⭐ Premium';
    return 'Nouveau';
  };

  // Statistiques
  const stats = {
    tutorsCount: hasAnnonces ? `${tutors.length}+` : '500+',
    studentsHelped: hasAnnonces ? `${tutors.length * 10}+` : '2K+',
    averageRating: tutors.length > 0 
      ? `${(tutors.reduce((acc, tutor) => acc + tutor.rating, 0) / tutors.length).toFixed(1)}★`
      : '4.9★'
  };

  if (isLoading) {
    return (
      <section className="relative py-10 lg:py-16 bg-white">
        <div className="container relative z-10 flex justify-center items-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </section>
    );
  }

  const currentTutor = tutors[currentIndex] || tutors[0];

  return (
    <section className="relative py-10 lg:py-16 bg-white">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-20"></div>
      
      <div className="container relative z-10">
        {/* Main Hero Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="space-y-4 flex flex-col items-start">
              <h1 className="text-5xl lg:text-7xl font-bold text-gray-900 leading-tight font-poppins">
                <span className="block mb-6 tracking-tight">Trouvez Votre</span>
                <span className="text-primary block mb-4 bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">              
                  Tuteur Idéal
                </span>
              </h1>

              <p className="text-lg lg:text-xl text-gray-600 leading-relaxed max-w-lg">
                La plateforme nouvelle génération qui connecte lycéens et étudiants avec des tuteurs fiables, sécurisés et accessibles.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={() => window.location.href = '/recherche-tuteur'} 
                className="bg-secondary hover:bg-yellow-400 text-white font-semibold py-4 px-8 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                Je cherche un tuteur
              </button>
              
              <button 
                onClick={() => window.location.href = '/devenir-tuteur'}
                className="border-2 border-gray-300 hover:border-primary text-gray-700 hover:text-primary font-semibold py-4 px-8 rounded-full transition-all duration-300 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Devenir tuteur
              </button>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-8 pt-4">
              <div className="text-center">
                <div className="text-2xl lg:text-3xl font-bold text-gray-900">500</div>
                <div className="text-sm text-gray-600">Tuteurs Experts</div>
              </div>
              <div className="text-center">
                <div className="text-2xl lg:text-3xl font-bold text-gray-900">2000</div>
                <div className="text-sm text-gray-600">Élèves Aidés</div>
              </div>
              <div className="text-center">
                <div className="text-2xl lg:text-3xl font-bold text-gray-900">4.9</div>
                <div className="text-sm text-gray-600">Note Moyenne</div>
              </div>
            </div>
          </div>

          {/* Right Content - Carrousel de profs OU Image par défaut */}
          <div className="relative">
            {hasAnnonces && tutors.length > 0 ? (
              // Afficher le carrousel de tuteurs
              <>
                {/* Carte principale avec effet de slide */}
                <div className="relative bg-white rounded-3xl p-8 shadow-2xl transform rotate-2 hover:rotate-0 transition-transform duration-300 overflow-hidden">
                  <div className={`transition-all duration-300 transform ${
                    isAnimating ? '-translate-x-full opacity-0' : 'translate-x-0 opacity-100'
                  }`}>
                    {/* Tutor Card */}
                    <div className={`bg-gradient-to-br ${currentTutor?.gradient} rounded-2xl p-6 text-white`}>
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border-2 border-white/30 overflow-hidden">
                          {currentTutor?.profilePicture ? (
                            <img 
                              src={currentTutor.profilePicture} 
                              alt={currentTutor.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-2xl font-bold">{currentTutor?.emoji}</span>
                          )}
                        </div>
                        <div>
                          <h3 className="font-bold text-lg">{currentTutor?.name}</h3>
                          <p className="text-white/80">{currentTutor?.subject}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-yellow-300">
                            {'★'.repeat(Math.floor(currentTutor?.rating || 5))}
                            {'☆'.repeat(5 - Math.floor(currentTutor?.rating || 5))}
                          </span>
                          <span className="text-sm text-white/80">({currentTutor?.reviews} avis)</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-semibold">{currentTutor?.price}</span>
                          <button 
                            onClick={() => window.location.href = `/booking/${currentTutor?.tutorId || ''}`}
                            className="bg-yellow-400 hover:bg-yellow-300 text-black px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-200"
                          >
                            Réservez maintenant
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Floating Elements */}
                    <div className="absolute -top-4 -right-4 bg-green-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                      {currentTutor?.status}
                    </div>
                    
                    <div className="absolute -bottom-4 -left-4 bg-primary text-black px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                      {currentTutor?.badge}
                    </div>
                  </div>
                </div>

                {/* Indicateurs de carrousel */}
                {tutors.length > 1 && (
                  <div className="flex justify-center mt-4 space-x-2">
                    {tutors.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setIsAnimating(true);
                          setTimeout(() => {
                            setCurrentIndex(index);
                            setIsAnimating(false);
                          }, 300);
                        }}
                        className={`w-2 h-2 rounded-full transition-all duration-300 ${
                          index === currentIndex
                            ? 'bg-primary scale-125'
                            : 'bg-gray-300 hover:bg-gray-400'
                        }`}
                      />
                    ))}
                  </div>
                )}

                {/* Éléments décoratifs */}
                <div className="absolute -top-6 -right-6 animate-pulse duration-2000">
                  <div className="w-8 h-8 bg-yellow-300 rounded-full opacity-70 flex items-center justify-center">
                    <span className="text-xs">⭐</span>
                  </div>
                </div>
                
                <div className="absolute -top-10 -left-6 rotate-6 animate-bounce duration-3000">
                  <div className="w-10 h-12 bg-yellow-100 rounded-full opacity-80 flex items-center justify-center -rotate-12">
                    <span className="text-lg">💡</span>
                  </div>
                </div>
                
                <div className="absolute top-1/4 -left-12 animate-pulse duration-2500">
                  <div className="w-12 h-10 bg-blue-100 rounded-lg opacity-70 flex items-center justify-center rotate-12">
                    <span className="text-sm">📚</span>
                  </div>
                </div>
              </>
            ) : (
              // Afficher l'image d'accueil par défaut - SANS BORDER ET PLUS HAUTE
              <div className="relative -mt-8">
                <img 
                  src={defaultImage} 
                  alt="Trouvez votre tuteur idéal" 
                  className="w-full h-auto object-contain max-h-[500px]"
                  style={{ maxWidth: '100%', height: 'auto' }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <div className="animate-bounce">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </div>
    </section>
  );
};

export default Hero;