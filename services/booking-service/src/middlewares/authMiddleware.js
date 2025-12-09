// booking-service/middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');

module.exports = async (req, res, next) => {
  try {
    // Récupération du token dans l'en-tête Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Token d'authentification manquant"
      });
    }

    // Format: "Bearer <token>"
    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Format du token invalide"
      });
    }

    // Vérification locale du token avec JWT_SECRET
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // On ajoute les infos utilisateur à req.user
    req.user = decoded;

    // Tout va bien → continuer
    next();

  } catch (err) {
    console.error("Erreur vérification token:", err.message);

    return res.status(401).json({
      success: false,
      message: "Token invalide ou expiré"
    });
  }
};
