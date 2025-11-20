// services/userService.js - VERSION CORRIGÉE
const axios = require('axios');

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';

class UserService {
  async getUserById(userId) {
    try {
      console.log(`[userService] getUserById appelé avec userId: ${userId}`);
      
      // Essayer d'abord le profil tuteur
      try {
        const tutorResponse = await axios.get(`${AUTH_SERVICE_URL}/api/profile/tutor/byUser/${userId}`);
        console.log(`[userService] Tutor réponse status:`, tutorResponse.status);
        
        if (tutorResponse.data.success && tutorResponse.data.data) {
          const profile = tutorResponse.data.data;
          const user = profile.user;
          
          console.log(`[userService] Tutor trouvé:`, `${user.firstName} ${user.lastName}`);
          return {
            userId: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            profilePicture: profile.profilePicture || null,
            userType: user.role
          };
        }
      } catch (tutorError) {
        console.log(`[userService] Tutor non trouvé: ${tutorError.message}`);
      }

      // Essayer le profil étudiant
      try {
        const studentResponse = await axios.get(`${AUTH_SERVICE_URL}/api/profile/student/byUser/${userId}`);
        console.log(`[userService] Student réponse status:`, studentResponse.status);
        
        if (studentResponse.data.success && studentResponse.data.data) {
          const profile = studentResponse.data.data;
          const user = profile.user;
          
          console.log(`[userService] Student trouvé:`, `${user.firstName} ${user.lastName}`);
          return {
            userId: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            profilePicture: profile.profilePicture || null,
            userType: user.role
          };
        }
      } catch (studentError) {
        console.log(`[userService] Student non trouvé: ${studentError.message}`);
      }

      // Si aucun profil spécifique, récupérer les infos de base de l'utilisateur
      try {
        console.log(`[userService] Essai récupération infos utilisateur de base...`);
        const userResponse = await axios.get(`${AUTH_SERVICE_URL}/api/auth/user/${userId}`);
        
        if (userResponse.data.success && userResponse.data.data) {
          const user = userResponse.data.data;
          console.log(`[userService] Utilisateur de base trouvé:`, `${user.firstName} ${user.lastName}`);
          
          return {
            userId: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            profilePicture: null,
            userType: user.role
          };
        }
      } catch (userError) {
        console.log(`[userService] Utilisateur de base non trouvé: ${userError.message}`);
      }

      console.warn(`[userService] Aucune information trouvée pour l'utilisateur ${userId}`);
      
      // Fallback - NE PAS retourner "Utilisateur Inconnu"
      return null;

    } catch (error) {
      console.error(`[userService] Erreur critique getUserById:`, error.message);
      return null;
    }
  }

  async searchUsers(query, currentUserId) {
    try {
      const response = await axios.get(`${AUTH_SERVICE_URL}/api/users/search`, {
        params: { query, excludeId: currentUserId }
      });
      
      if (response.data.success) {
        return response.data.data.map(user => ({
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          profilePicture: user.profilePicture || null
        }));
      }
      
      throw new Error('Erreur lors de la recherche d\'utilisateurs');
    } catch (error) {
      console.error('[userService] Erreur searchUsers:', error.message);
      
      // Fallback avec des utilisateurs mock
      return this.getMockUsers(currentUserId);
    }
  }

  async getMockUsers(currentUserId) {
    return [
      { 
        id: 'user1', 
        firstName: 'Jean', 
        lastName: 'Dupont', 
        email: 'jean.dupont@example.com', 
        role: 'tutor', 
        profilePicture: null 
      },
      { 
        id: 'user2', 
        firstName: 'Marie', 
        lastName: 'Martin', 
        email: 'marie.martin@example.com', 
        role: 'student', 
        profilePicture: null 
      }
    ].filter(user => user.id !== currentUserId);
  }
}

module.exports = new UserService();