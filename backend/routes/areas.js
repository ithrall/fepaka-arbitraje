const router = require('express').Router();
const pool = require('../database');
const { authMiddleware, adminOnly } = require('../middleware');

// GET áreas de un evento con su jefe y árbitros
router.get('/evento/:eventoId', authMiddleware, async (req, res) => {
  try {
    const areas = await pool.query(
      `SELECT a.*, u.nombre as jefe_nombre, u.username as jefe_username
       FROM areas a
       LEFT JOIN usuarios u ON u.id = a.jefe_id
       WHERE a.evento_id = $1
       ORDER BY a.nombre`,
      [req.params.eventoId]
    );

    // Para cada área, obtener sus árbitros
    for (const area of areas.rows) {
      const arbs = await pool.query(
        `SELECT ar.id, ar.nombre, ar.apellido,
           CASE WHEN ar.apellido IS NOT NULL AND ar.apellido != ''
                THEN ar.nombre || ' ' || ar.apellido
                ELSE ar.nombre END as nombre_completo,
           ar.provincia, ar.licencia, ar.fepaka_id, ar.foto_url
         FROM arbitros ar
         JOIN area_arbitros aa ON aa.arbitro_id = ar.id
         WHERE aa.area_id = $1
         ORDER BY ar.nombre`,
        [area.id]
      );
      area.arbitros = arbs.rows;
    }

    res.json(areas.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST crear área
router.post('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { evento_id, nombre, jefe_id } = req.body;
    const result = await pool.query(
      'INSERT INTO areas (evento_id, nombre, jefe_id) VALUES ($1,$2,$3) RETURNING *',
      [evento_id, nombre, jefe_id || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT actualizar área (nombre, jefe)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { nombre, jefe_id } = req.body;
    const result = await pool.query(
      'UPDATE areas SET nombre=$1, jefe_id=$2 WHERE id=$3 RETURNING *',
      [nombre, jefe_id || null, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE área
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await pool.query('DELETE FROM areas WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST asignar árbitro a área (mueve si estaba en otra)
router.post('/:id/arbitros', authMiddleware, async (req, res) => {
  try {
    const { arbitro_id, evento_id } = req.body;

    // Quitar de cualquier área previa en el mismo evento
    await pool.query(
      `DELETE FROM area_arbitros
       WHERE arbitro_id = $1
       AND area_id IN (SELECT id FROM areas WHERE evento_id = $2)`,
      [arbitro_id, evento_id]
    );

    // Asignar a la nueva área
    await pool.query(
      'INSERT INTO area_arbitros (area_id, arbitro_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
      [req.params.id, arbitro_id]
    );

    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE quitar árbitro de área
router.delete('/:id/arbitros/:arbId', authMiddleware, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM area_arbitros WHERE area_id=$1 AND arbitro_id=$2',
      [req.params.id, req.params.arbId]
    );
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
