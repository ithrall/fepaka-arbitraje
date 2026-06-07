const router = require('express').Router();
const pool = require('../database');
const { authMiddleware, adminOnly } = require('../middleware');

// Crear tablas de relación si no existen
pool.query(`
  CREATE TABLE IF NOT EXISTS evento_arbitros (
    evento_id INT REFERENCES eventos(id) ON DELETE CASCADE,
    arbitro_id INT REFERENCES arbitros(id) ON DELETE CASCADE,
    PRIMARY KEY (evento_id, arbitro_id)
  );
  CREATE TABLE IF NOT EXISTS evento_evaluadores (
    evento_id INT REFERENCES eventos(id) ON DELETE CASCADE,
    usuario_id INT REFERENCES usuarios(id) ON DELETE CASCADE,
    PRIMARY KEY (evento_id, usuario_id)
  );
`).catch(console.error);

// GET todos los eventos
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM eventos ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET evento por id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM eventos WHERE id=$1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Evento no encontrado' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST crear evento
router.post('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { nombre, fecha, sede, num_evaluadores } = req.body;
    const result = await pool.query(
      'INSERT INTO eventos (nombre, fecha, sede, num_evaluadores) VALUES ($1,$2,$3,$4) RETURNING *',
      [nombre, fecha || null, sede || null, num_evaluadores || 4]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT actualizar evento
router.put('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { nombre, fecha, sede, num_evaluadores, estado } = req.body;
    const result = await pool.query(
      'UPDATE eventos SET nombre=$1, fecha=$2, sede=$3, num_evaluadores=$4, estado=$5 WHERE id=$6 RETURNING *',
      [nombre, fecha, sede, num_evaluadores, estado, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── ÁRBITROS DEL EVENTO ──
// GET árbitros asignados a un evento
router.get('/:id/arbitros', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.* FROM arbitros a
       JOIN evento_arbitros ea ON ea.arbitro_id = a.id
       WHERE ea.evento_id = $1 ORDER BY a.nombre`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST asignar árbitro a evento
router.post('/:id/arbitros', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { arbitro_id } = req.body;
    await pool.query(
      'INSERT INTO evento_arbitros (evento_id, arbitro_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
      [req.params.id, arbitro_id]
    );
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE quitar árbitro de evento
router.delete('/:id/arbitros/:arbId', authMiddleware, adminOnly, async (req, res) => {
  try {
    await pool.query('DELETE FROM evento_arbitros WHERE evento_id=$1 AND arbitro_id=$2', [req.params.id, req.params.arbId]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── EVALUADORES DEL EVENTO ──
// GET evaluadores asignados a un evento
router.get('/:id/evaluadores', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.nombre, u.username, u.rol FROM usuarios u
       JOIN evento_evaluadores ee ON ee.usuario_id = u.id
       WHERE ee.evento_id = $1 ORDER BY u.nombre`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST asignar evaluador a evento
router.post('/:id/evaluadores', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { usuario_id } = req.body;
    await pool.query(
      'INSERT INTO evento_evaluadores (evento_id, usuario_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
      [req.params.id, usuario_id]
    );
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE quitar evaluador de evento
router.delete('/:id/evaluadores/:usrId', authMiddleware, adminOnly, async (req, res) => {
  try {
    await pool.query('DELETE FROM evento_evaluadores WHERE evento_id=$1 AND usuario_id=$2', [req.params.id, req.params.usrId]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
