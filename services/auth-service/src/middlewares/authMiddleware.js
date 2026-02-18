const authService = require('../services/authService');

async function authMiddleware(req, res, next) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token manquant',
        code: 'MISSING_TOKEN'
      });
    }

    const user = await authService.validateToken(token);
    req.user = user; // utilisateur validé pour les controllers
    next();
  } catch (error) {
    console.error('[AUTH] ❌ Token invalide, déconnexion automatique:', error.message);

    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      try {
        await authService.logout(token); // invalider le token
      } catch (logoutError) {
        console.error('[AUTH] Erreur lors de la logout:', logoutError.message);
      }
    }

    return res.status(401).json({ 
      success: false, 
      message: 'Token invalide, vous avez été déconnecté',
      code: 'INVALID_TOKEN'
    });
  }
}

module.exports = authMiddleware;
