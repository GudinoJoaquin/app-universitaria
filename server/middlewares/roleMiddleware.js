// Verifica que el usuario tenga el rol requerido
export const roleMiddleware = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Acceso denegado. Permisos insuficientes." });
    }
    next();
  };
};

// Alias por compatibilidad
export const checkRole = roleMiddleware;
