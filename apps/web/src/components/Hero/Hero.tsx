import React, { useState, useEffect } from 'react';

const Hero: React.FC = () => {
  const [currentTutor, setCurrentTutor] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const tutors = [
    {
      name: "Mr. Chibani",
      subject: "Professeur en informatique",
      rating: 5,
      reviews: 128,
      price: "€100/heure",
      emoji: "👨‍🏫",
      status: "Disponible maintenant",
      badge: "Free Trial",
      gradient: "from-blue-500 to-indigo-500"
    },
    {
      name: "Dr. Sarah Chen",
      subject: "Mathématiques avancées",
      rating: 5,
      reviews: 89,
      price: "€85/heure",
      emoji: "👩‍🔬",
      status: "En ligne",
      badge: "Populaire",
      gradient: "from-green-500 to-emerald-600"
    },
    {
      name: "Prof. Martinez",
      subject: "Physique & Chimie",
      rating: 5,
      reviews: 67,
      price: "€75/heure",
      emoji: "👨‍🔬",
      status: "Disponible",
      badge: "Nouveau",
      gradient: "from-purple-500 to-pink-600"
    },
    {
      name: "Mme. Dubois",
      subject: "Langues étrangères",
      rating: 5,
      reviews: 203,
      price: "€65/heure",
      emoji: "👩‍🏫",
      status: "Disponible",
      badge: "Économique",
      gradient: "from-orange-500 to-red-400"
    },
    {
      name: "Mr. Tanaka",
      subject: "Sciences économiques",
      rating: 5,
      reviews: 156,
      price: "€90/heure",
      emoji: "👨‍💼",
      status: "En ligne",
      badge: "Expert",
      gradient: "from-cyan-400 to-sky-400"
    }
  ];

  const nextTutor = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentTutor((prev) => (prev + 1) % tutors.length);
      setIsAnimating(false);
    }, 300);
  };

  useEffect(() => {
    const interval = setInterval(nextTutor, 3000);
    return () => clearInterval(interval);
  }, [tutors.length]);

  return (
    <section className="relative py-10 lg:py-16">
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
              <button onClick={() => window.location.href = '/recherche-tuteur'} className="bg-secondary hover:bg-yellow-400 text-white font-semibold py-4 px-8 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl">
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
                <div className="text-2xl lg:text-3xl font-bold text-gray-900">500+</div>
                <div className="text-sm text-gray-600">Tuteurs Experts</div>
              </div>
              <div className="text-center">
                <div className="text-2xl lg:text-3xl font-bold text-gray-900">2K+</div>
                <div className="text-sm text-gray-600">Élèves Aidés</div>
              </div>
              <div className="text-center">
                <div className="text-2xl lg:text-3xl font-bold text-gray-900">4.9★</div>
                <div className="text-sm text-gray-600">Note Moyenne</div>
              </div>
            </div>
          </div>

          {/* Right Content - Carrousel de profs */}
          <div className="relative">
            {/* Carte principale avec effet de slide */}
            <div className="relative bg-white rounded-3xl p-8 shadow-2xl transform rotate-2 hover:rotate-0 transition-transform duration-300 overflow-hidden">
              <div className={`transition-all duration-300 transform ${
                isAnimating ? '-translate-x-full opacity-0' : 'translate-x-0 opacity-100'
              }`}>
                {/* Tutor Card */}
                <div className={`bg-gradient-to-br ${tutors[currentTutor].gradient} rounded-2xl p-6 text-white`}>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border-2 border-white/30">
                      <span className="text-2xl font-bold">{tutors[currentTutor].emoji}</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{tutors[currentTutor].name}</h3>
                      <p className="text-white/80">{tutors[currentTutor].subject}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-300">★★★★★</span>
                      <span className="text-sm text-white/80">({tutors[currentTutor].reviews} reviews)</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">{tutors[currentTutor].price}</span>
                      <button className="bg-yellow-400 hover:bg-yellow-300 text-black px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-200">
                        Réservez maintenant
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Floating Elements */}
                <div className="absolute -top-4 -right-4 bg-green-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                  {tutors[currentTutor].status}
                </div>
                
                <div className="absolute -bottom-4 -left-4 bg-primary text-black px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                  {tutors[currentTutor].badge}
                </div>
              </div>
            </div>

            {/* Indicateurs de carrousel */}
            <div className="flex justify-center mt-4 space-x-2">
              {tutors.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setIsAnimating(true);
                    setTimeout(() => {
                      setCurrentTutor(index);
                      setIsAnimating(false);
                    }, 300);
                  }}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    index === currentTutor
                      ? 'bg-primary scale-125'
                      : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>

            {/* Étoiles scintillantes */}
            <div className="absolute -top-6 -right-6 animate-pulse duration-2000">
              <div className="w-8 h-8 bg-yellow-300 rounded-full opacity-70 flex items-center justify-center">
                <span className="text-xs">⭐</span>
              </div>
            </div>
            
            {/* Ampoule d'idée */}
            <div className="absolute -top-10 -left-6 rotate-6 animate-bounce duration-3000">
              <div className="w-10 h-12 bg-yellow-100 rounded-full opacity-80 flex items-center justify-center -rotate-12">
                <span className="text-lg">💡</span>
              </div>
            </div>
            
            {/* Livre ouvert */}
            <div className="absolute top-1/4 -left-12 animate-pulse duration-2500">
              <div className="w-12 h-10 bg-blue-100 rounded-lg opacity-70 flex items-center justify-center rotate-12">
                <span className="text-sm">📚</span>
              </div>
            </div>

            {/* Cercles décoratifs subtils */}
            <div className="absolute -top-4 left-1/4 w-16 h-16 border-2 border-primary/20 rounded-full animate-spin duration-10000"></div>
            <div className="absolute -bottom-4 right-1/3 w-12 h-12 border-2 border-blue-300/30 rounded-full animate-spin duration-8000 reverse"></div>

            {/* Éléments décoratifs animés */}
            <div className="absolute -z-10 top-4 -right-4 w-32 h-32 bg-primary rounded-full opacity-20 animate-pulse"></div>
            <div className="absolute -z-10 bottom-6 -left-8 w-24 h-24 bg-indigo-300 rounded-full opacity-30"></div>
            
            {/* Nouvelles illustrations */}
            <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-blue-200 rounded-lg rotate-45 opacity-40 animate-pulse delay-500"></div>
            <div className="absolute top-1/2 -right-12 w-12 h-12 bg-green-200 rounded-full opacity-50 animate-bounce delay-1500"></div>
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