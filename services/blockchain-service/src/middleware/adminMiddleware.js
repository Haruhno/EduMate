const adminMiddleware = (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Accès réservé aux administrateurs'
      });
    }
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: 'Erreur de vérification des permissions'
    });
  }
};

module.exports = adminMiddleware;