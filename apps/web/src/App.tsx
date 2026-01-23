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
import CreerAnnoncesPage from "./pages/CreerAnnonces/CreerAnnoncesPage";
import BookingPage from "./pages/Booking/BookingPage";
import AnnoncesPage from "./pages/Annonces/AnnoncesPage";
import DevenirTuteur from "./pages/DevenirTuteur/DevenirTuteur";

// Pages privées
import ProfilePage from "./pages/Profile/ProfilePage";
import DashboardPage from "./pages/Dashboard/DashboardPage";
import CreerAnnoncePage from "./pages/CreerAnnonce/CreerAnnoncePage";
import MessageTestPage from "./pages/Messages/MessagePage";
import Blockchain from "./pages/Blockchain/Blockchain";
import MesCours from "./pages/HistoriqueCours/HistoriqueCours";
import ReservationsPage from "./pages/Reservations/ReservationsPage";
import ProfileCompletion from "./components/ProfileCompletion/ProfileCompletion";

// ======================
// ROUTES
// ======================

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
          <Route path="/creer-annonce" element={<CreerAnnoncesPage />} />
          <Route 
            path="/annonces" 
            element={
              <PrivateRoute>
                <AnnoncesPage />
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
        </Routes>
      </div>
      <Navbar />

      <Routes>
        {/* ======================
            ROUTES PUBLIQUES
        ====================== */}
        <Route path="/" element={<HomePage />} />
        <Route path="/annonces" element={<AnnoncesPage />} />
        <Route path="/recherche-tuteur" element={<TutorSearchPage />} />
        <Route path="/tuteur/:id" element={<TutorProfilePage />} />
        <Route path="/booking/:tutorId" element={<BookingPage />} />
        <Route path="/devenir-tuteur" element={<DevenirTuteur />} />

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

        <Route
          path="/choix-role"
          element={
            <PublicRoute>
              <RoleSelectionPage />
            </PublicRoute>
          }
        />

        {/* ======================
            ROUTES PRIVÉES
        ====================== */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <DashboardPage />
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
          path="/completer-profil"
          element={
            <PrivateRoute>
              <ProfileCompletion />
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

        <Route
          path="/reservations"
          element={
            <PrivateRoute>
              <ReservationsPage />
            </PrivateRoute>
          }
        />

        {/* ======================
            FALLBACK
        ====================== */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
