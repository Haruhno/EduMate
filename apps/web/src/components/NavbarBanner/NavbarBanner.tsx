import React, { useState } from 'react';

const NavbarBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => setIsVisible(false), 300);
  };

  if (!isVisible) return null;

  return (
    <div className={`w-full bg-gradient-to-r from-yellow-400 to-orange-400 py-3 border-b border-third relative transition-all duration-300 ${
      isClosing ? 'opacity-0 -translate-y-full' : 'opacity-100 translate-y-0'
    }`}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-center">      
          <p className="text-black text-sm font-medium text-center leading-tight">
            Êtes-vous un professeur particulier ou un étudiant intéressé par un programme de tutorat en ligne ? {' '}
            <a 
              href="/partnership" 
              className="font-semibold text-white hover:text-gray-100 transition-colors"
            >
              Parlez-en nous
            </a>
          </p>
        </div>
      </div>
      
      {/* Bouton de fermeture */}
      <button
        onClick={handleClose}
        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-black hover:text-gray-700 transition-colors"
        aria-label="Fermer la bannière"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

export default NavbarBanner;