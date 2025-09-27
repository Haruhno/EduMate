import React from "react";
import Navbar from "./components/Navbar/Navbar";
import NavbarBanner from "./components/NavbarBanner/NavbarBanner";
import Hero from "./components/Hero/Hero";
import Statistics from "./components/Statistics/Statistics";
import WhyChooseUs from "./components/WhyChooseUs/WhyChooseUs";

const App: React.FC = () => {
  return (
    <div>
      <Navbar />
      <NavbarBanner />
      <Hero />
      <Statistics />
      <WhyChooseUs />
    </div>
  );
};

export default App;
