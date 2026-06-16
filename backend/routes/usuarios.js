const router = require('express').Router();
const pool = require('../database');
const bcrypt = require('bcryptjs');
const { authMiddleware, adminOnly } = require('../middleware');
const { log } = require('../auditoria');

// GET todos los usuarios activos
router.get('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, nombre, username, rol, activo, created_at FROM usuarios WHERE eliminado = false ORDER BY nombre'
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET usuarios eliminados (papelera)
router.get('/eliminados', authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, nombre, username, rol, created_at FROM usuarios WHERE eliminado = true ORDER BY nombre'
    );
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
    const usr = result.rows[0];
    await log(req, 'crear', 'evaluador', usr.id, usr.nombre);
    res.status(201).json(usr);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'El usuario ya existe' });
    res.status(500).json({ error: err.message });
  }
});

// PUT editar usuario existente (nombre, username, rol — sin password aquí)
router.put('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { nombre, username, rol, activo } = req.body;
    const before = await pool.query('SELECT id, nombre, username, rol, activo FROM usuarios WHERE id=$1', [req.params.id]);
    if (!before.rows.length) return res.status(404).json({ error: 'Evaluador no encontrado' });

    const result = await pool.query(
      'UPDATE usuarios SET nombre=$1, username=$2, rol=$3, activo=$4 WHERE id=$5 RETURNING id, nombre, username, rol, activo',
      [nombre, username, rol, activo ?? before.rows[0].activo, req.params.id]
    );
    const usr = result.rows[0];
    await log(req, 'editar', 'evaluador', usr.id, usr.nombre, { antes: before.rows[0], despues: usr });
    res.json(usr);
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
    await log(req, 'importar_csv', 'evaluador', 0, `${insertados.length} evaluadores`, { count: insertados.length });
    res.json({ insertados: insertados.length, usuarios: insertados });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT cambiar password (solo admin)
router.put('/:id/password', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 4) return res.status(400).json({ error: 'El password debe tener al menos 4 caracteres' });
    const hash = await bcrypt.hash(password, 10);
    const usr = await pool.query('SELECT nombre FROM usuarios WHERE id=$1', [req.params.id]);
    await pool.query('UPDATE usuarios SET password_hash=$1 WHERE id=$2', [hash, req.params.id]);
    await log(req, 'cambiar_password', 'evaluador', parseInt(req.params.id), usr.rows[0]?.nombre || '');
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE lógico — cambia estatus, no borra físicamente
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const before = await pool.query('SELECT * FROM usuarios WHERE id=$1', [req.params.id]);
    if (!before.rows.length) return res.status(404).json({ error: 'Evaluador no encontrado' });
    if (before.rows[0].username === 'admin') return res.status(400).json({ error: 'No se puede eliminar al administrador principal' });

    await pool.query('UPDATE usuarios SET eliminado = true WHERE id=$1', [req.params.id]);
    await log(req, 'eliminar', 'evaluador', before.rows[0].id, before.rows[0].nombre);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST restaurar usuario eliminado
router.post('/:id/restaurar', authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE usuarios SET eliminado = false WHERE id=$1 RETURNING id, nombre, username, rol',
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Evaluador no encontrado' });
    await log(req, 'restaurar', 'evaluador', result.rows[0].id, result.rows[0].nombre);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
