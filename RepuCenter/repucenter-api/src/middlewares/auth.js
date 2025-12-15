// src/middlewares/auth.js
const jwt = require('jsonwebtoken');

function authRequired(req, res, next) {
  const auth = req.headers.authorization || '';
  const [, token] = auth.split(' ');
  if (!token) return res.status(401).json({ error: 'token requerido' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { sub, username, role }
    next();
  } catch {
    return res.status(401).json({ error: 'token inválido' });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: 'no autorizado' });
    }
    next();
  };
}

module.exports = { authRequired, requireRole };