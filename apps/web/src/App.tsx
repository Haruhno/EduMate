import React from "react";
import Navbar from "./components/Navbar/Navbar";
import NavbarBanner from "./components/NavbarBanner/NavbarBanner";
import Hero from "./components/Hero/Hero";
import Statistics from "./components/Statistics/Statistics";
import WhyChooseUs from "./components/WhyChooseUs/WhyChooseUs";
import HowItWorks from "./components/HowItWorks/HowItWorks";

const App: React.FC = () => {
  return (
    <div>
      <Navbar />
      <NavbarBanner />
      <Hero />
      <Statistics />
      <WhyChooseUs />
      <HowItWorks />
    </div>
  );
};

export default App;
