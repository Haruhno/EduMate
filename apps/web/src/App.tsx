import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar/Navbar";
import authService from "./services/authService";
import "./App.css";

// Pages
import HomePage from "./pages/Home";
import LoginPage from "./pages/LoginPage/LoginPage";
import SignupPage from "./pages/SignupPage/SignupPage";
import RoleSelectionPage from "./pages/RoleSelectionPage/RoleSelectionPage";
import TutorSearchPage from "./pages/TutorSearchPage/TutorSearchPage";
import TutorProfilePage from "./pages/TutorProfilePage/TutorProfilePage";
import BookingPage from "./pages/Booking/BookingPage";
import AnnoncesPage from "./pages/Annonces/AnnoncesPage";
import DevenirTuteur from "./pages/DevenirTuteur/DevenirTuteur";

import ProfilePage from "./pages/Profile/ProfilePage";
import DashboardPage from "./pages/Dashboard/DashboardPage";
import MessageTestPage from "./pages/Messages/MessagePage";
import Blockchain from "./pages/Blockchain/Blockchain";
import MesCours from "./pages/HistoriqueCours/HistoriqueCours";
import ReservationsPage from "./pages/Reservations/ReservationsPage";
import ProfileCompletion from "./components/ProfileCompletion/ProfileCompletion";
import AvailabilityPage from "./pages/AvailabilityPage/AvailabilityPage";
import ContactPage from "./pages/Contact/ContactPage";
import SkillExchangePage from "./pages/SkillExchange/SkillExchangePage";
import CreateSkillExchange from "./pages/SkillExchange/CreateSkillExchange";
import ChatbotWidget from "./components/ChatbotWidget/ChatbotWidget";
import AdminPage from "./pages/Admin/AdminPage";

// Routes accessibles UNIQUEMENT si NON connecté
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = authService.isAuthenticated();
  return isAuthenticated ? <Navigate to="/" replace /> : <>{children}</>;
};

// Routes accessibles UNIQUEMENT si connecté
const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = authService.isAuthenticated();
  return isAuthenticated ? <>{children}</> : <Navigate to="/connexion" replace />;
};

const App: React.FC = () => {
  return (
    <Router>
      <div className="App">
        <Navbar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route 
            path="/choix-role" 
            element={
              <PublicRoute>
                <RoleSelectionPage />
              </PublicRoute>
            } 
          />
          <Route 
            path="/connexion" 
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            } 
          />
          <Route 
            path="/inscription" 
            element={
              <PublicRoute>
                <SignupPage />
              </PublicRoute>
            } 
          />
          <Route path="/recherche-tuteur" element={<TutorSearchPage />} />
          <Route 
            path="/completer-profil" 
            element={
              <PrivateRoute>
                <ProfileCompletion />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/mon-profil" 
            element={
              <PrivateRoute>
                <ProfilePage />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/dashboard" 
            element={
              <PrivateRoute>
                <DashboardPage />
              </PrivateRoute>
            } 
          />
          <Route path="/tuteur/:id" element={<TutorProfilePage />} />
          <Route path="/devenir-tuteur" element={<DevenirTuteur />} />
          <Route 
            path="/annonces" 
            element={
              <PrivateRoute>
                <AnnoncesPage />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/mes-disponibilites" 
            element={AvailabilityPage ? (
              <PrivateRoute>
                <AvailabilityPage />
              </PrivateRoute>
            ) : null}
          />
          <Route 
            path="/messages" 
            element={
              <PrivateRoute>
                <MessageTestPage />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/blockchain" 
            element={
              <PrivateRoute>
                <Blockchain />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/booking/:tutorId" 
            element={<BookingPage />} 
          />
          <Route 
            path="/reservations" 
            element={<ReservationsPage />} 
          />
          <Route 
            path="/cours" 
            element={
              <PrivateRoute>
                <MesCours />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/skill-exchange" 
            element={
              <PrivateRoute>
                <SkillExchangePage />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/skill-exchange/create" 
            element={
              <PrivateRoute>
                <CreateSkillExchange />
              </PrivateRoute>
            } 
          />
          <Route path="/contact" element={<ContactPage />} />
          <Route 
            path="/admin" 
            element={
              <PrivateRoute>
                <AdminPage />
              </PrivateRoute>
            } 
          />
          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <ChatbotWidget />
      </div>
    </Router>
  );
};

export default App;