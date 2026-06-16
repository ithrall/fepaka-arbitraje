const router = require('express').Router();
const pool = require('../database');
const { authMiddleware, adminOnly } = require('../middleware');

// GET historial de auditoría (con filtros opcionales)
router.get('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { entidad, accion, limit } = req.query;
    let query = 'SELECT * FROM auditoria WHERE 1=1';
    const params = [];

    if (entidad) { params.push(entidad); query += ` AND entidad = $${params.length}`; }
    if (accion)  { params.push(accion);  query += ` AND accion = $${params.length}`; }

    query += ' ORDER BY created_at DESC';
    params.push(parseInt(limit) || 100);
    query += ` LIMIT $${params.length}`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET resumen de papelera (eventos + árbitros + evaluadores eliminados, todo junto)
router.get('/papelera', authMiddleware, adminOnly, async (req, res) => {
  try {
    const [eventos, arbitros, usuarios] = await Promise.all([
      pool.query('SELECT id, nombre, fecha, sede, created_at FROM eventos WHERE eliminado = true ORDER BY created_at DESC'),
      pool.query(`
        SELECT id, nombre, COALESCE(apellido,'') as apellido,
          CASE WHEN apellido IS NOT NULL AND apellido != '' THEN nombre || ' ' || apellido ELSE nombre END as nombre_completo,
          provincia, fepaka_id, created_at
        FROM arbitros WHERE eliminado = true ORDER BY created_at DESC
      `),
      pool.query('SELECT id, nombre, username, rol, created_at FROM usuarios WHERE eliminado = true ORDER BY created_at DESC'),
    ]);
    res.json({ eventos: eventos.rows, arbitros: arbitros.rows, usuarios: usuarios.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
