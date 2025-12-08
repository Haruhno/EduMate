import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar/Navbar";
import Home from "./pages/Home";
import LoginPage from './pages/LoginPage/LoginPage';
import SignupPage from './pages/SignupPage/SignupPage';
import authService from './services/authService';
import "./App.css";
import HomePage from './pages/Home';
import RoleSelectionPage from './pages/RoleSelectionPage/RoleSelectionPage';
import ProfileCompletion from './components/ProfileCompletion/ProfileCompletion';
import TutorSearchPage from './pages/TutorSearchPage/TutorSearchPage';
import ProfilePage from './pages/Profile/ProfilePage';
import AvailabilityPage from "./pages/AvailabilityPage/AvailabilityPage";
import DashboardPage from './pages/Dashboard/DashboardPage';
import DevenirTuteur from './pages/DevenirTuteur/DevenirTuteur';
import TutorProfilePage from "./pages/TutorProfilePage/TutorProfilePage";
import AnnoncesPage from "./pages/Annonces/AnnoncesPage";
import CreerAnnoncePage from "./pages/CreerAnnonce/CreerAnnoncePage";
import MessageTestPage from "./pages/Messages/MessagePage";
import Blockchain from "./pages/Blockchain/Blockchain";
import MesCours from "./pages/HistoriqueCours/HistoriqueCours";

// Composant pour protéger les routes d'authentification
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = authService.isAuthenticated();
  return !isAuthenticated ? <>{children}</> : <Navigate to="/" replace />;
};

// Composant pour protéger les routes privées
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
          <Route path="/" element={<Home />} />
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
          <Route path="/completer-profil" element={<ProfileCompletion />} />
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
          <Route path="/mes-disponibilites" element={<AvailabilityPage />} />
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
            path="/creer-annonce" 
            element={
              <PrivateRoute>
                <CreerAnnoncePage />
              </PrivateRoute>
            } 
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
            path="/cours" 
            element={
              <PrivateRoute>
                <MesCours />
              </PrivateRoute>
            } 
          />
        </Routes>
      </div>
    </Router>
  );
};

export default App;