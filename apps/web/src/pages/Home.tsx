import React from 'react';
import Navbar from "../components/Navbar/Navbar";
import NavbarBanner from "../components/NavbarBanner/NavbarBanner";
import Hero from "../components/Hero/Hero";
import Statistics from "../components/Statistics/Statistics";
import WhyChooseUs from "../components/WhyChooseUs/WhyChooseUs";
import HowItWorks from "../components/HowItWorks/HowItWorks";
import Services from '../components/Services/Services';

const Home: React.FC = () => {
  return (
    <>
      <Navbar />
      <NavbarBanner />
      <Hero />
      <Statistics />
      <Services />
      <WhyChooseUs />
      <HowItWorks />
    </>
  );
};

export default Home;
