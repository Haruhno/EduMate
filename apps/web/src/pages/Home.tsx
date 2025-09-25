// apps/web/pages/Home.tsx
import React from 'react';

const Home: React.FC = () => {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <h1 className="text-5xl font-bold mb-4">Bienvenue sur TutorX</h1>
      <p className="text-lg text-gray-300 mb-8">
        Trouvez votre tuteur idéal ou partagez vos connaissances !
      </p>
      <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg">
        Commencer
      </button>
    </main>
  );
};

export default Home;
