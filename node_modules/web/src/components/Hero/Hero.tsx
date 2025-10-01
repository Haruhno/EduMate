import React from 'react';

const Hero: React.FC = () => {
  return (
    <section className="relative py-20 lg:py-28">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-20"></div>
      
      <div className="container relative z-10">
        {/* Main Hero Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 leading-tight">
                Trouvez Votre<br />
                <span className="text-primary">Tuter Idéal</span>
              </h1>
              
              <p className="text-lg lg:text-xl text-gray-600 leading-relaxed max-w-lg">
                La plateforme nouvelle génération qui connecte lycéens et étudiants avec des tuteurs fiables, sécurisés et accessibles.              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button className="bg-secondary hover:bg-yellow-400 text-white font-semibold py-4 px-8 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl">
                Je cherche un tuteur
              </button>
              
              <button className="border-2 border-gray-300 hover:border-primary text-gray-700 hover:text-primary font-semibold py-4 px-8 rounded-full transition-all duration-300 flex items-center justify-center gap-2">
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
                <div className="text-sm text-gray-600">Expert Tutors</div>
              </div>
              <div className="text-center">
                <div className="text-2xl lg:text-3xl font-bold text-gray-900">2K+</div>
                <div className="text-sm text-gray-600">Students Helped</div>
              </div>
              <div className="text-center">
                <div className="text-2xl lg:text-3xl font-bold text-gray-900">4.9★</div>
                <div className="text-sm text-gray-600">Average Rating</div>
              </div>
            </div>
          </div>

          {/* Right Content - Illustration */}
          <div className="relative">
            <div className="relative bg-white rounded-3xl p-8 shadow-2xl transform rotate-2 hover:rotate-0 transition-transform duration-300">
              {/* Tutor Card Illustration */}
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 text-white">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center">
                    <span className="text-2xl font-bold">👨‍🏫</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Mr. Chibani</h3>
                    <p className="text-blue-200">Professeur en informatique</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-300">★★★★★</span>
                    <span className="text-sm">(128 reviews)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">€100/hour</span>
                    <button className="bg-yellow-400 text-black px-4 py-2 rounded-full text-sm font-semibold">
                      Réservez maintenant
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Floating Elements */}
              <div className="absolute -top-4 -right-4 bg-green-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                Disponible maintenant
              </div>
              
              <div className="absolute -bottom-4 -left-4 bg-primary text-black px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                Free Trial
              </div>
            </div>
            
            {/* Background Decorative Elements */}
            <div className="absolute -z-10 top-4 -right-4 w-32 h-32 bg-primary rounded-full opacity-20"></div>
            <div className="absolute -z-10 bottom-4 -left-4 w-24 h-24 bg-indigo-300 rounded-full opacity-30"></div>
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