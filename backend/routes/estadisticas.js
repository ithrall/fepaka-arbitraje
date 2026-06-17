const router = require('express').Router();
const pool = require('../database');
const { authMiddleware } = require('../middleware');

const CRITERIOS = {
  kumite: ['voz_mando','movilidad','gestos_senalizaciones','aplicacion_reglamento','performance_presencia'],
  kata:   ['aplicacion_reglamento','procedimiento','performance_presencia','dominio_criterios','focalizacion'],
}

function nombreCompletoSQL(alias = '') {
  const a = alias ? alias + '.' : ''
  return `CASE WHEN ${a}apellido IS NOT NULL AND ${a}apellido != ''
          THEN ${a}nombre || ' ' || ${a}apellido ELSE ${a}nombre END`
}

// GET lista de árbitros con al menos una evaluación (para selectores)
router.get('/arbitros-evaluados', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT a.id, ${nombreCompletoSQL('a')} as nombre_completo,
        a.provincia, a.licencia, a.fepaka_id, a.foto_url
      FROM arbitros a
      JOIN evaluaciones e ON e.arbitro_id = a.id
      WHERE a.eliminado = false
      ORDER BY nombre_completo
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET estadísticas globales de UN árbitro, para una modalidad
router.get('/arbitro/:arbitroId', authMiddleware, async (req, res) => {
  try {
    const modalidad = req.query.modalidad || 'kumite';
    const crits = CRITERIOS[modalidad] || CRITERIOS.kumite;
    const avgCols = crits.map(c => `ROUND(AVG(e.${c})::numeric,2) as ${c}`).join(',\n');
    const sumCols = crits.map(c => `AVG(e.${c})`).join('+');

    const porEvento = await pool.query(
      `SELECT ev.id as evento_id, ev.nombre as evento_nombre, ev.fecha,
         COUNT(e.id) as num_evaluaciones, ${avgCols},
         ROUND(((${sumCols})/${crits.length})::numeric,2) as promedio_total
       FROM evaluaciones e
       JOIN eventos ev ON ev.id = e.evento_id
       WHERE e.arbitro_id = $1 AND e.modalidad = $2
       GROUP BY ev.id, ev.nombre, ev.fecha
       ORDER BY ev.fecha ASC NULLS LAST`,
      [req.params.arbitroId, modalidad]
    );

    const globalRow = await pool.query(
      `SELECT ${avgCols}, ROUND(((${sumCols})/${crits.length})::numeric,2) as promedio_total,
              COUNT(DISTINCT e.evento_id) as num_eventos, COUNT(e.id) as num_evaluaciones
       FROM evaluaciones e WHERE e.arbitro_id = $1 AND e.modalidad = $2`,
      [req.params.arbitroId, modalidad]
    );

    const arbInfo = await pool.query(
      `SELECT id, nombre, apellido, ${nombreCompletoSQL()} as nombre_completo,
         provincia, licencia, club, fepaka_id, foto_url
       FROM arbitros WHERE id = $1`,
      [req.params.arbitroId]
    );

    res.json({
      arbitro: arbInfo.rows[0] || null, modalidad, criterios: crits,
      porEvento: porEvento.rows, global: globalRow.rows[0] || null,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET promedio global de TODOS los árbitros evaluados (para comparar contra el promedio general)
router.get('/promedio-global', authMiddleware, async (req, res) => {
  try {
    const modalidad = req.query.modalidad || 'kumite';
    const crits = CRITERIOS[modalidad] || CRITERIOS.kumite;
    const avgCols = crits.map(c => `ROUND(AVG(e.${c})::numeric,2) as ${c}`).join(',\n');
    const sumCols = crits.map(c => `AVG(e.${c})`).join('+');

    const result = await pool.query(
      `SELECT ${avgCols}, ROUND(((${sumCols})/${crits.length})::numeric,2) as promedio_total,
              COUNT(DISTINCT e.arbitro_id) as num_arbitros, COUNT(e.id) as num_evaluaciones
       FROM evaluaciones e WHERE e.modalidad = $1`,
      [modalidad]
    );

    res.json({ modalidad, criterios: crits, global: result.rows[0] || null });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST comparar varios árbitros (2-4), para una modalidad
// Devuelve, para cada árbitro: su promedio global por criterio + su historial por evento
router.post('/comparar', authMiddleware, async (req, res) => {
  try {
    const { arbitro_ids, modalidad } = req.body;
    const mod = modalidad || 'kumite';
    const crits = CRITERIOS[mod] || CRITERIOS.kumite;
    const avgCols = crits.map(c => `ROUND(AVG(e.${c})::numeric,2) as ${c}`).join(',\n');
    const sumCols = crits.map(c => `AVG(e.${c})`).join('+');

    const resultados = [];
    for (const id of arbitro_ids) {
      const arbInfo = await pool.query(
        `SELECT id, nombre, apellido, ${nombreCompletoSQL()} as nombre_completo, licencia, provincia
         FROM arbitros WHERE id = $1`, [id]
      );
      if (!arbInfo.rows.length) continue;

      const globalRow = await pool.query(
        `SELECT ${avgCols}, ROUND(((${sumCols})/${crits.length})::numeric,2) as promedio_total,
                COUNT(DISTINCT e.evento_id) as num_eventos, COUNT(e.id) as num_evaluaciones
         FROM evaluaciones e WHERE e.arbitro_id = $1 AND e.modalidad = $2`,
        [id, mod]
      );

      const porEvento = await pool.query(
        `SELECT ev.id as evento_id, ev.nombre as evento_nombre, ev.fecha,
           ${avgCols}, ROUND(((${sumCols})/${crits.length})::numeric,2) as promedio_total
         FROM evaluaciones e
         JOIN eventos ev ON ev.id = e.evento_id
         WHERE e.arbitro_id = $1 AND e.modalidad = $2
         GROUP BY ev.id, ev.nombre, ev.fecha
         ORDER BY ev.fecha ASC NULLS LAST`,
        [id, mod]
      );

      resultados.push({
        arbitro: arbInfo.rows[0],
        global: globalRow.rows[0] || null,
        porEvento: porEvento.rows,
      });
    }

    res.json({ modalidad: mod, criterios: crits, arbitros: resultados });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
