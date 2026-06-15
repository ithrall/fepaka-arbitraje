const router = require('express').Router();
const pool = require('../database');
const { authMiddleware } = require('../middleware');

// Criterios por modalidad
const CRITERIOS = {
  kumite: ['voz_mando','movilidad','gestos_senalizaciones','aplicacion_reglamento','performance_presencia'],
  kata:   ['aplicacion_reglamento','procedimiento','performance_presencia','dominio_criterios','focalizacion'],
}

function calcPromedio(row, modalidad) {
  const crits = CRITERIOS[modalidad] || CRITERIOS.kumite
  const vals = crits.map(c => parseFloat(row[c])).filter(v => !isNaN(v) && v > 0)
  if (!vals.length) return null
  return (vals.reduce((a,b) => a+b, 0) / vals.length).toFixed(2)
}

// GET mi evaluación de un árbitro en un evento
router.get('/mia/arbitro/:arbitroId/evento/:eventoId', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM evaluaciones
       WHERE arbitro_id=$1 AND evento_id=$2 AND usuario_id=$3`,
      [req.params.arbitroId, req.params.eventoId, req.user.id]
    );
    res.json(result.rows[0] || null);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET resumen de promedios por árbitro en un evento
router.get('/resumen/evento/:eventoId', authMiddleware, async (req, res) => {
  try {
    const ev = await pool.query('SELECT modalidad FROM eventos WHERE id=$1', [req.params.eventoId]);
    const modalidad = ev.rows[0]?.modalidad || 'kumite';
    const crits = CRITERIOS[modalidad];

    const avgCols = crits.map(c =>
      `ROUND(AVG(e.${c})::numeric,1) as prom_${c}`
    ).join(',\n');

    const sumCols = crits.map(c => `AVG(e.${c})`).join('+');

    const result = await pool.query(
      `SELECT
         a.id,
         CASE WHEN a.apellido IS NOT NULL AND a.apellido != ''
              THEN a.nombre || ' ' || a.apellido
              ELSE a.nombre END as nombre_completo,
         a.nombre, a.apellido, a.provincia, a.licencia, a.fepaka_id, a.foto_url,
         ar.nombre as area_nombre,
         COUNT(e.id) as num_evaluaciones,
         ${avgCols},
         ROUND(((${sumCols})/${crits.length})::numeric,2) as promedio_total
       FROM arbitros a
       LEFT JOIN evaluaciones e ON e.arbitro_id = a.id AND e.evento_id = $1
       LEFT JOIN area_arbitros aa ON aa.arbitro_id = a.id
       LEFT JOIN areas ar ON ar.id = aa.area_id AND ar.evento_id = $1
       WHERE
         a.id IN (SELECT arbitro_id FROM evento_arbitros WHERE evento_id = $1)
         OR a.evento_id = $1
       GROUP BY a.id, ar.nombre
       ORDER BY promedio_total DESC NULLS LAST`,
      [req.params.eventoId]
    );

    res.json({ modalidad, criterios: crits, rows: result.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET detalle por evaluador
router.get('/detalle/evento/:eventoId', authMiddleware, async (req, res) => {
  try {
    const ev = await pool.query('SELECT modalidad FROM eventos WHERE id=$1', [req.params.eventoId]);
    const modalidad = ev.rows[0]?.modalidad || 'kumite';
    const crits = CRITERIOS[modalidad];

    const sumCols = crits.map(c => `e.${c}`).join('+');

    const result = await pool.query(
      `SELECT
         e.*,
         CASE WHEN a.apellido IS NOT NULL AND a.apellido != ''
              THEN a.nombre || ' ' || a.apellido
              ELSE a.nombre END as arbitro_nombre,
         a.licencia, a.fepaka_id, a.provincia,
         u.nombre as evaluador_nombre,
         ar.nombre as area_nombre,
         ROUND(((${sumCols})/${crits.length})::numeric,2) as promedio_evaluador
       FROM evaluaciones e
       JOIN arbitros a ON a.id = e.arbitro_id
       JOIN usuarios u ON u.id = e.usuario_id
       LEFT JOIN areas ar ON ar.id = e.area_id
       WHERE e.evento_id = $1
       ORDER BY a.nombre, u.nombre`,
      [req.params.eventoId]
    );

    res.json({ modalidad, criterios: crits, rows: result.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET historial de un árbitro (todos los eventos)
router.get('/historial/arbitro/:arbitroId', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT e.*, ev.nombre as evento_nombre, ev.fecha, ev.modalidad,
              u.nombre as evaluador_nombre, ar.nombre as area_nombre
       FROM evaluaciones e
       JOIN eventos ev ON ev.id = e.evento_id
       JOIN usuarios u ON u.id = e.usuario_id
       LEFT JOIN areas ar ON ar.id = e.area_id
       WHERE e.arbitro_id = $1
       ORDER BY ev.fecha DESC, u.nombre`,
      [req.params.arbitroId]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET estadísticas por criterio (para gráfica)
router.get('/grafica/evento/:eventoId', authMiddleware, async (req, res) => {
  try {
    const ev = await pool.query('SELECT modalidad FROM eventos WHERE id=$1', [req.params.eventoId]);
    const modalidad = ev.rows[0]?.modalidad || 'kumite';
    const crits = CRITERIOS[modalidad];

    const avgCols = crits.map(c =>
      `ROUND(AVG(e.${c})::numeric,2) as ${c}`
    ).join(',\n');

    const result = await pool.query(
      `SELECT ${avgCols}
       FROM evaluaciones e
       WHERE e.evento_id = $1`,
      [req.params.eventoId]
    );

    // También por área
    const porArea = await pool.query(
      `SELECT ar.nombre as area_nombre,
              ${crits.map(c => `ROUND(AVG(e.${c})::numeric,2) as ${c}`).join(',')}
       FROM evaluaciones e
       JOIN areas ar ON ar.id = e.area_id
       WHERE e.evento_id = $1
       GROUP BY ar.id, ar.nombre
       ORDER BY ar.nombre`,
      [req.params.eventoId]
    );

    res.json({ modalidad, criterios: crits, general: result.rows[0], porArea: porArea.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST guardar evaluación
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      evento_id, arbitro_id, area_id, modalidad,
      // Kumite
      voz_mando, movilidad, gestos_senalizaciones,
      aplicacion_reglamento, performance_presencia,
      // Kata
      procedimiento, dominio_criterios, focalizacion,
      // Compartido
      comentario
    } = req.body;

    const result = await pool.query(
      `INSERT INTO evaluaciones
         (evento_id, arbitro_id, usuario_id, area_id, modalidad,
          voz_mando, movilidad, gestos_senalizaciones, aplicacion_reglamento, performance_presencia,
          procedimiento, dominio_criterios, focalizacion, comentario)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       ON CONFLICT (evento_id, arbitro_id, usuario_id, modalidad)
       DO UPDATE SET
         area_id=$4, voz_mando=$6, movilidad=$7,
         gestos_senalizaciones=$8, aplicacion_reglamento=$9, performance_presencia=$10,
         procedimiento=$11, dominio_criterios=$12, focalizacion=$13,
         comentario=$14, created_at=NOW()
       RETURNING *`,
      [evento_id, arbitro_id, req.user.id, area_id || null, modalidad || 'kumite',
       voz_mando||null, movilidad||null, gestos_senalizaciones||null,
       aplicacion_reglamento||null, performance_presencia||null,
       procedimiento||null, dominio_criterios||null, focalizacion||null,
       comentario||null]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
module.exports.CRITERIOS = CRITERIOS;
