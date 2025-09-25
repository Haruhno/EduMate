import React from "react";
import logo from "../assets/images/logo.png";

const Navbar: React.FC = () => {
  return (
    <nav className="w-full bg-white shadow-sm px-8 py-4 flex items-center justify-between">
      {/* Logo + Nom */}
      <div className="flex items-center gap-3">
        <img src={logo} alt="Logo" className="h-8 w-8" />
        <span className="font-semibold text-sm tracking-wide">HOPE RISE</span>
      </div>

      {/* Liens */}
      <ul className="hidden md:flex gap-10 text-sm font-medium text-gray-700">
        <li className="cursor-pointer hover:text-black">WHO WE ARE</li>
        <li className="cursor-pointmais er hover:text-black">WHAT WE DO</li>
        <li className="cursor-pointer hover:text-black">NEWS & EVENTS</li>
        <li className="cursor-pointer hover:text-black">GET INVOLVED</li>
      </ul>

      {/* Boutons */}
      <div className="flex items-center gap-4">
        <button
          aria-label="Call"
          className="p-2 border rounded-full hover:bg-gray-100"
        >
          📞
        </button>
        <button className="px-5 py-2 rounded-full border font-medium hover:bg-black hover:text-white transition">
          DONATE
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
