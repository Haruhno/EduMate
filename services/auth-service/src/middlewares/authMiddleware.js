const authService = require('../services/authService');

async function authMiddleware(req, res, next) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Token manquant' });

    const user = await authService.validateToken(token);
    req.user = user; // utilisateur validé pour les controllers
    next();
  } catch (error) {
    console.error('Token invalide, déconnexion automatique');

    const token = req.headers.authorization?.split(' ')[1];
    if (token) await authService.logout(token); // invalider le token

    return res.status(401).json({ success: false, message: 'Token invalide, vous avez été déconnecté' });
  }
}

module.exports = authMiddleware;
