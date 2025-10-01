const jwt = require('jsonwebtoken');
const User = require('../models/User');

class AuthService {
  async register(userData) {
    try {
      const existingUser = await User.findOne({ where: { email: userData.email } });
      if (existingUser) {
        throw new Error('Un utilisateur avec cet email existe déjà');
      }

      const user = await User.create(userData);
      
      // Retourner l'utilisateur sans le mot de passe
      const { password, ...userWithoutPassword } = user.toJSON();
      return userWithoutPassword;
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
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'votre_secret_jwt');
      const user = await User.findByPk(decoded.id, {
        attributes: { exclude: ['password'] }
      });
      
      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }

      return user;
    } catch (error) {
      throw new Error('Token invalide');
    }
  }
}

module.exports = new AuthService();