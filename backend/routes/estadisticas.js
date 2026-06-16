const router = require('express').Router();
const pool = require('../database');
const { authMiddleware } = require('../middleware');

const CRITERIOS = {
  kumite: ['voz_mando','movilidad','gestos_senalizaciones','aplicacion_reglamento','performance_presencia'],
  kata:   ['aplicacion_reglamento','procedimiento','performance_presencia','dominio_criterios','focalizacion'],
}

// GET lista de árbitros con al menos una evaluación (para el selector)
router.get('/arbitros-evaluados', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT a.id,
        CASE WHEN a.apellido IS NOT NULL AND a.apellido != ''
             THEN a.nombre || ' ' || a.apellido
             ELSE a.nombre END as nombre_completo,
        a.provincia, a.licencia, a.fepaka_id, a.foto_url
      FROM arbitros a
      JOIN evaluaciones e ON e.arbitro_id = a.id
      ORDER BY nombre_completo
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET estadísticas globales de un árbitro, para una modalidad
router.get('/arbitro/:arbitroId', authMiddleware, async (req, res) => {
  try {
    const modalidad = req.query.modalidad || 'kumite';
    const crits = CRITERIOS[modalidad] || CRITERIOS.kumite;

    // Promedio por evento (para vista "por evento")
    const avgCols = crits.map(c => `ROUND(AVG(e.${c})::numeric,2) as ${c}`).join(',\n');
    const sumCols = crits.map(c => `AVG(e.${c})`).join('+');

    const porEvento = await pool.query(
      `SELECT
         ev.id as evento_id, ev.nombre as evento_nombre, ev.fecha,
         COUNT(e.id) as num_evaluaciones,
         ${avgCols},
         ROUND(((${sumCols})/${crits.length})::numeric,2) as promedio_total
       FROM evaluaciones e
       JOIN eventos ev ON ev.id = e.evento_id
       WHERE e.arbitro_id = $1 AND e.modalidad = $2
       GROUP BY ev.id, ev.nombre, ev.fecha
       ORDER BY ev.fecha ASC NULLS LAST`,
      [req.params.arbitroId, modalidad]
    );

    // Promedio global (todos los eventos juntos) por criterio
    const globalRow = await pool.query(
      `SELECT ${avgCols}, ROUND(((${sumCols})/${crits.length})::numeric,2) as promedio_total,
              COUNT(DISTINCT e.evento_id) as num_eventos, COUNT(e.id) as num_evaluaciones
       FROM evaluaciones e
       WHERE e.arbitro_id = $1 AND e.modalidad = $2`,
      [req.params.arbitroId, modalidad]
    );

    // Datos del árbitro
    const arbInfo = await pool.query(
      `SELECT id, nombre, apellido,
         CASE WHEN apellido IS NOT NULL AND apellido != ''
              THEN nombre || ' ' || apellido ELSE nombre END as nombre_completo,
         provincia, licencia, club, fepaka_id, foto_url
       FROM arbitros WHERE id = $1`,
      [req.params.arbitroId]
    );

    res.json({
      arbitro: arbInfo.rows[0] || null,
      modalidad,
      criterios: crits,
      porEvento: porEvento.rows,
      global: globalRow.rows[0] || null,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
