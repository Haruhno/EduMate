const jwt = require('jsonwebtoken');
const { User, ProfileTutor, ProfileStudent } = require('../models/associations');

const { isTokenBlacklisted, addToken } = require('./tokenBlacklist');

class AuthService {
  async register(userData) {
    try {
      const existingUser = await User.findOne({ where: { email: userData.email } });
      if (existingUser) {
        throw new Error('Un utilisateur avec cet email existe déjà');
      }

      const user = await User.create(userData);
      
      // Générer le token
      const token = jwt.sign(
        { 
          id: user.id, 
          email: user.email, 
          role: user.role 
        },
        process.env.JWT_SECRET || 'votre_secret_jwt',
        { expiresIn: '24h' }
      );

      const { password, ...userWithoutPassword } = user.toJSON();

      return {
        user: userWithoutPassword,
        token
      };
    } catch (error) {
      throw new Error(`Erreur lors de l'inscription: ${error.message}`);
    }
  }

  async login(email, password) {
    try {
      const user = await User.findOne({ where: { email } });
      if (!user) {
        throw new Error('Email ou mot de passe incorrect');
      }

      const isValidPassword = await user.validatePassword(password);
      if (!isValidPassword) {
        throw new Error('Email ou mot de passe incorrect');
      }

      const token = jwt.sign(
        { 
          id: user.id, 
          email: user.email, 
          role: user.role 
        },
        process.env.JWT_SECRET || 'votre_secret_jwt',
        { expiresIn: '24h' }
      );

      const { password: _, ...userWithoutPassword } = user.toJSON();

      return {
        user: userWithoutPassword,
        token
      };
    } catch (error) {
      throw new Error(`Erreur lors de la connexion: ${error.message}`);
    }
  }

  async validateToken(token) {
    try {
      if (isTokenBlacklisted(token)) throw new Error('Token invalide');

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'votre_secret_jwt');
      const user = await User.findByPk(decoded.id, { attributes: { exclude: ['password'] } });

      if (!user) throw new Error('Utilisateur non trouvé');
      return user;
    } catch (error) {
      throw new Error('Token invalide');
    }
  }

  async getAllUsers() {
    try {
      const users = await User.findAll({ attributes: { exclude: ['password'] } });
      return users;
    } catch (error) {
      console.error('Erreur getAllUsers:', error);
      throw new Error(`Impossible de récupérer tous les utilisateurs: ${error.message}`);
    }
  }


  async logout(token) {
    addToken(token);
    return true;
  }
  
  // Vérifier l'email
  async verifyEmail(userId) {
    try {
      await User.update({ isVerified: true }, { where: { id: userId } });
      return true;
    } catch (error) {
      throw new Error(`Erreur lors de la vérification de l'email: ${error.message}`);
    }
  }

  async migrateToTutor(userId, tutorData) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }

      // Vérifier que c'est un étudiant
      if (user.role !== 'student') {
        throw new Error('Seuls les étudiants peuvent devenir tuteurs');
      }

      // Mettre à jour le rôle
      await user.update({ role: 'tutor' });

      // Créer ou mettre à jour le profil tuteur
      let tutorProfile = await ProfileTutor.findOne({ where: { userId } });
      
      if (tutorProfile) {
        // Mettre à jour le profil existant
        await tutorProfile.update({
          specialties: tutorData.specialties,
          hourlyRate: tutorData.hourlyRate,
          availability: tutorData.availability,
          isCompleted: true,
          completionPercentage: 100
        });
      } else {
        // Créer un nouveau profil tuteur
        tutorProfile = await ProfileTutor.create({
          userId,
          specialties: tutorData.specialties,
          hourlyRate: tutorData.hourlyRate,
          availability: tutorData.availability,
          isCompleted: true,
          completionPercentage: 100
        });
      }

      // Récupérer l'utilisateur mis à jour
      const updatedUser = await User.findByPk(userId);

      return {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          role: updatedUser.role,
          isVerified: updatedUser.isVerified
        },
        tutorProfile
      };
    } catch (error) {
      console.error('Erreur migration tuteur:', error);
      throw new Error(`Erreur lors de la migration vers tuteur: ${error.message}`);
    }
  }
}

module.exports = new AuthService();