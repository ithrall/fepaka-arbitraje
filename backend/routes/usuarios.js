const router = require('express').Router();
const pool = require('../database');
const bcrypt = require('bcryptjs');
const { authMiddleware, adminOnly } = require('../middleware');

// GET todos los usuarios
router.get('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, nombre, username, rol, activo, created_at FROM usuarios ORDER BY nombre');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST crear usuario
router.post('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { nombre, username, password, rol } = req.body;
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO usuarios (nombre, username, password_hash, rol) VALUES ($1,$2,$3,$4) RETURNING id, nombre, username, rol',
      [nombre, username, hash, rol || 'evaluador']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'El usuario ya existe' });
    res.status(500).json({ error: err.message });
  }
});

// POST importar CSV
router.post('/csv', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { usuarios } = req.body;
    const insertados = [];
    for (const u of usuarios) {
      const hash = await bcrypt.hash(u.password, 10);
      try {
        const r = await pool.query(
          'INSERT INTO usuarios (nombre, username, password_hash, rol) VALUES ($1,$2,$3,$4) RETURNING id, nombre, username, rol',
          [u.nombre, u.username, hash, u.rol || 'evaluador']
        );
        insertados.push(r.rows[0]);
      } catch { /* duplicado, se omite */ }
    }
    res.json({ insertados: insertados.length, usuarios: insertados });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT cambiar password (solo admin)
router.put('/:id/password', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 4) return res.status(400).json({ error: 'El password debe tener al menos 4 caracteres' });
    const hash = await bcrypt.hash(password, 10);
    await pool.query('UPDATE usuarios SET password_hash=$1 WHERE id=$2', [hash, req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT activar/desactivar
router.put('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { activo } = req.body;
    const result = await pool.query(
      'UPDATE usuarios SET activo=$1 WHERE id=$2 RETURNING id, nombre, username, rol, activo',
      [activo, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
