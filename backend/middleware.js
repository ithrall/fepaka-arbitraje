const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'Sin token' });
  const token = header.split(' ')[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'fepaka_secret_2025');
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
}

function adminOnly(req, res, next) {
  if (req.user.rol !== 'admin') return res.status(403).json({ error: 'Solo administradores' });
  next();
}

module.exports = { authMiddleware, adminOnly };
