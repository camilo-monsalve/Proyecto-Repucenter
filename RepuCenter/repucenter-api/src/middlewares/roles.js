// src/middlewares/roles.js
function requireRole(role) {
  return (req, res, next) => {
    try {
      const user = req.user; // viene del authRequired (JWT)
      if (!user) return res.status(401).json({ error: 'no autenticado' });

      if (user.role !== role) {
        return res.status(403).json({ error: 'permiso denegado (rol insuficiente)' });
      }
      next();
    } catch (err) {
      return res.status(401).json({ error: 'no autenticado' });
    }
  };
}

module.exports = { requireRole };