const router = require('express').Router();
const pool = require('../database');
const { authMiddleware, adminOnly } = require('../middleware');
const { log } = require('../auditoria');

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

async function actualizarEstados() {
  await pool.query(`
    UPDATE eventos SET estado = CASE
      WHEN estado_manual = true THEN estado
      WHEN fecha IS NULL THEN 'activo'
      WHEN CURRENT_DATE > COALESCE(fecha_fin, fecha) THEN 'finalizado'
      WHEN CURRENT_DATE < fecha THEN 'proximo'
      ELSE 'activo'
    END
    WHERE estado_manual = false
  `).catch(() => {});
}

// GET todos los eventos activos (no eliminados)
router.get('/', authMiddleware, async (req, res) => {
  try {
    await actualizarEstados();
    const result = await pool.query(
      `SELECT e.*,
         (SELECT COUNT(*) FROM evento_arbitros ea WHERE ea.evento_id = e.id) as num_arbitros,
         (SELECT COUNT(*) FROM evento_evaluadores ee WHERE ee.evento_id = e.id) as num_evaluadores,
         (SELECT COUNT(*) FROM areas a WHERE a.evento_id = e.id) as num_areas
       FROM eventos e WHERE e.eliminado = false ORDER BY e.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET eventos eliminados (papelera)
router.get('/eliminados', authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM eventos WHERE eliminado = true ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM eventos WHERE id=$1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Evento no encontrado' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { nombre, fecha, fecha_fin, sede, num_evaluadores } = req.body;
    const result = await pool.query(
      `INSERT INTO eventos (nombre, fecha, fecha_fin, sede, num_evaluadores)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [nombre, fecha||null, fecha_fin||null, sede||null, num_evaluadores||4]
    );
    const ev = result.rows[0];
    await log(req, 'crear', 'evento', ev.id, ev.nombre);
    res.status(201).json(ev);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT editar evento existente
router.put('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { nombre, fecha, fecha_fin, sede, num_evaluadores, estado, estado_manual } = req.body;
    const before = await pool.query('SELECT * FROM eventos WHERE id=$1', [req.params.id]);
    if (!before.rows.length) return res.status(404).json({ error: 'Evento no encontrado' });

    const result = await pool.query(
      `UPDATE eventos SET
         nombre=$1, fecha=$2, fecha_fin=$3, sede=$4,
         num_evaluadores=$5, estado=$6, estado_manual=$7
       WHERE id=$8 RETURNING *`,
      [nombre, fecha, fecha_fin, sede, num_evaluadores, estado, estado_manual ?? false, req.params.id]
    );
    const ev = result.rows[0];
    await log(req, 'editar', 'evento', ev.id, ev.nombre, { antes: before.rows[0], despues: ev });
    res.json(ev);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/:id/estado', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { estado } = req.body;
    const result = await pool.query(
      `UPDATE eventos SET estado=$1, estado_manual=true WHERE id=$2 RETURNING *`,
      [estado, req.params.id]
    );
    const ev = result.rows[0];
    await log(req, 'cambiar_estado', 'evento', ev.id, ev.nombre, { nuevo_estado: estado });
    res.json(ev);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE lógico — cambia estatus, no borra físicamente
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const before = await pool.query('SELECT * FROM eventos WHERE id=$1', [req.params.id]);
    if (!before.rows.length) return res.status(404).json({ error: 'Evento no encontrado' });

    await pool.query('UPDATE eventos SET eliminado = true WHERE id=$1', [req.params.id]);
    await log(req, 'eliminar', 'evento', before.rows[0].id, before.rows[0].nombre);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST restaurar evento eliminado
router.post('/:id/restaurar', authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE eventos SET eliminado = false WHERE id=$1 RETURNING *',
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Evento no encontrado' });
    await log(req, 'restaurar', 'evento', result.rows[0].id, result.rows[0].nombre);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id/arbitros', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*,
         CASE WHEN a.apellido IS NOT NULL AND a.apellido != ''
              THEN a.nombre || ' ' || a.apellido ELSE a.nombre END as nombre_completo,
         ar.id as area_id, ar.nombre as area_nombre
       FROM arbitros a
       JOIN evento_arbitros ea ON ea.arbitro_id = a.id AND ea.evento_id = $1
       LEFT JOIN area_arbitros aa ON aa.arbitro_id = a.id
       LEFT JOIN areas ar ON ar.id = aa.area_id AND ar.evento_id = $1
       WHERE a.eliminado = false
       ORDER BY a.nombre`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

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

router.delete('/:id/arbitros/:arbId', authMiddleware, adminOnly, async (req, res) => {
  try {
    await pool.query('DELETE FROM evento_arbitros WHERE evento_id=$1 AND arbitro_id=$2', [req.params.id, req.params.arbId]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id/evaluadores', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.nombre, u.username, u.rol
       FROM usuarios u
       JOIN evento_evaluadores ee ON ee.usuario_id = u.id
       WHERE ee.evento_id = $1 AND u.eliminado = false ORDER BY u.nombre`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

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

router.delete('/:id/evaluadores/:usrId', authMiddleware, adminOnly, async (req, res) => {
  try {
    await pool.query('DELETE FROM evento_evaluadores WHERE evento_id=$1 AND usuario_id=$2', [req.params.id, req.params.usrId]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
