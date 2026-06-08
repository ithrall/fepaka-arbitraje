const router = require('express').Router();
const pool = require('../database');
const { authMiddleware } = require('../middleware');

// Migración: agregar columna comentario si no existe
pool.query(`ALTER TABLE evaluaciones ADD COLUMN IF NOT EXISTS comentario TEXT`).catch(() => {});

// GET evaluaciones individuales de un árbitro en un evento
router.get('/arbitro/:arbitroId/evento/:eventoId', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT e.*, u.nombre as evaluador_nombre
       FROM evaluaciones e
       JOIN usuarios u ON u.id = e.usuario_id
       WHERE e.arbitro_id=$1 AND e.evento_id=$2
       ORDER BY u.nombre`,
      [req.params.arbitroId, req.params.eventoId]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET resumen de promedios por árbitro en un evento
// Funciona con ambas arquitecturas: evento_arbitros Y a.evento_id legacy
router.get('/resumen/evento/:eventoId', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         a.id,
         a.nombre,
         COALESCE(a.apellido, '') as apellido,
         CASE WHEN a.apellido IS NOT NULL AND a.apellido != ''
              THEN a.nombre || ' ' || a.apellido
              ELSE a.nombre END as nombre_completo,
         a.provincia, a.licencia, a.club, a.fepaka_id, a.foto_url,
         COUNT(e.id) as num_evaluaciones,
         ROUND(AVG(e.conformidad)::numeric, 1)           as prom_conformidad,
         ROUND(AVG(e.manejo_tatami)::numeric, 1)         as prom_tatami,
         ROUND(AVG(e.instrucciones)::numeric, 1)         as prom_instrucciones,
         ROUND(AVG(e.aplicacion_reglamento)::numeric, 1) as prom_reglamento,
         ROUND(AVG(e.presencia)::numeric, 1)             as prom_presencia,
         ROUND(
           ((AVG(e.conformidad)+AVG(e.manejo_tatami)+AVG(e.instrucciones)
             +AVG(e.aplicacion_reglamento)+AVG(e.presencia))/5)::numeric, 2
         ) as promedio_total
       FROM arbitros a
       LEFT JOIN evaluaciones e ON e.arbitro_id = a.id AND e.evento_id = $1
       WHERE
         a.id IN (SELECT arbitro_id FROM evento_arbitros WHERE evento_id = $1)
         OR a.evento_id = $1
       GROUP BY a.id
       ORDER BY promedio_total DESC NULLS LAST`,
      [req.params.eventoId]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET evaluaciones individuales por evaluador (vista detalle admin)
router.get('/detalle/evento/:eventoId', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         e.*,
         CASE WHEN a.apellido IS NOT NULL AND a.apellido != ''
              THEN a.nombre || ' ' || a.apellido
              ELSE a.nombre END as arbitro_nombre,
         a.provincia, a.licencia, a.fepaka_id,
         u.nombre as evaluador_nombre,
         ROUND(
           ((e.conformidad+e.manejo_tatami+e.instrucciones
             +e.aplicacion_reglamento+e.presencia)/5)::numeric, 2
         ) as promedio_evaluador
       FROM evaluaciones e
       JOIN arbitros  a ON a.id = e.arbitro_id
       JOIN usuarios  u ON u.id = e.usuario_id
       WHERE e.evento_id = $1
       ORDER BY a.nombre, u.nombre`,
      [req.params.eventoId]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET mi evaluación de un árbitro (del usuario autenticado)
router.get('/mia/arbitro/:arbitroId/evento/:eventoId', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM evaluaciones WHERE arbitro_id=$1 AND evento_id=$2 AND usuario_id=$3',
      [req.params.arbitroId, req.params.eventoId, req.user.id]
    );
    res.json(result.rows[0] || null);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST guardar evaluación (crea o actualiza)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      evento_id, arbitro_id,
      conformidad, manejo_tatami, instrucciones,
      aplicacion_reglamento, presencia, comentario
    } = req.body;

    const result = await pool.query(
      `INSERT INTO evaluaciones
         (evento_id, arbitro_id, usuario_id, conformidad, manejo_tatami,
          instrucciones, aplicacion_reglamento, presencia, comentario)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (evento_id, arbitro_id, usuario_id)
       DO UPDATE SET
         conformidad=$4, manejo_tatami=$5, instrucciones=$6,
         aplicacion_reglamento=$7, presencia=$8, comentario=$9,
         created_at=NOW()
       RETURNING *`,
      [evento_id, arbitro_id, req.user.id,
       conformidad, manejo_tatami, instrucciones,
       aplicacion_reglamento, presencia, comentario || null]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
