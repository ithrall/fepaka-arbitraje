const router = require('express').Router();
const pool = require('../database');
const { authMiddleware, adminOnly } = require('../middleware');

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

// POST crear evento (solo admin)
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

module.exports = router;
