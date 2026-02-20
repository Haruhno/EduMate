const authService = require('../services/authService');

async function adminMiddleware(req, res, next) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Token manquant' });

    const user = await authService.validateToken(token);
    
    if (user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Accès refusé. Seuls les administrateurs peuvent accéder à cette ressource.' 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Erreur middleware admin:', error.message);
    return res.status(401).json({ success: false, message: 'Token invalide' });
  }
}

module.exports = adminMiddleware;