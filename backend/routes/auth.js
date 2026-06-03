const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../database');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await pool.query('SELECT * FROM usuarios WHERE username=$1 AND activo=true', [username]);
    if (!result.rows.length) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });

    const token = jwt.sign(
      { id: user.id, username: user.username, nombre: user.nombre, rol: user.rol },
      process.env.JWT_SECRET || 'fepaka_secret_2025',
      { expiresIn: '12h' }
    );
    res.json({ token, user: { id: user.id, nombre: user.nombre, username: user.username, rol: user.rol } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
