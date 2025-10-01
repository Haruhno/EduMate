import React from 'react';

const NavbarBanner: React.FC = () => {
  return (
    <div className="w-full bg-primary py-3 border-b border-yellow-400">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-center">      
          <p className="text-black text-sm font-medium text-center leading-tight">
            Êtes-vous un professeur particulier ou un étudiant intéressé par un programme de tutorat en ligne ? {' '}
            <a 
              href="/partnership" 
              className="font-semibold underline hover:no-underline transition-all hover:text-gray-900"
            >
              Talk to us
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default NavbarBanner;