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
          <Route 
            path="/completer-profil" 
            element={
              <PrivateRoute>
                <ProfileCompletion />
              </PrivateRoute>
            } 
          />
        </Routes>
      </div>
    </Router>
  );
};

export default App;