const router = require('express').Router();
const pool = require('../database');
const { authMiddleware, adminOnly } = require('../middleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `arb_${Date.now()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// GET todos los árbitros — incluye apellido y nombre_completo SIEMPRE
router.get('/todos', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         id, nombre, COALESCE(apellido,'') as apellido,
         CASE WHEN apellido IS NOT NULL AND apellido != ''
              THEN nombre || ' ' || apellido
              ELSE nombre END as nombre_completo,
         provincia, club, fepaka_id, licencia, foto_url, created_at
       FROM arbitros
       ORDER BY nombre, apellido`
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET árbitros asignados a un evento, con su área si tienen una asignada
router.get('/evento/:eventoId', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         a.id, a.nombre, COALESCE(a.apellido,'') as apellido,
         CASE WHEN a.apellido IS NOT NULL AND a.apellido != ''
              THEN a.nombre || ' ' || a.apellido
              ELSE a.nombre END as nombre_completo,
         a.provincia, a.club, a.fepaka_id, a.licencia, a.foto_url,
         ar.id as area_id, ar.nombre as area_nombre
       FROM arbitros a
       JOIN evento_arbitros ea ON ea.arbitro_id = a.id
       LEFT JOIN area_arbitros aa ON aa.arbitro_id = a.id
       LEFT JOIN areas ar ON ar.id = aa.area_id AND ar.evento_id = $1
       WHERE ea.evento_id = $1
       ORDER BY a.nombre, a.apellido`,
      [req.params.eventoId]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST agregar árbitro a la base global
router.post('/', authMiddleware, adminOnly, upload.single('foto'), async (req, res) => {
  try {
    const { nombre, apellido, provincia, club, fepaka_id, licencia } = req.body;
    const foto_url = req.file ? `/uploads/${req.file.filename}` : null;

    if (fepaka_id && fepaka_id.trim()) {
      const exists = await pool.query(
        `SELECT id, nombre, COALESCE(apellido,'') as apellido FROM arbitros WHERE fepaka_id = $1`,
        [fepaka_id.trim()]
      );
      if (exists.rows.length > 0) {
        const arb = exists.rows[0];
        const nm = arb.apellido ? `${arb.nombre} ${arb.apellido}` : arb.nombre;
        return res.status(400).json({ error: `El FEPAKA ID "${fepaka_id}" ya está registrado para "${nm}"` });
      }
    }

    const result = await pool.query(
      `INSERT INTO arbitros (nombre, apellido, provincia, club, fepaka_id, licencia, foto_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [nombre?.trim(), apellido?.trim() || null, provincia, club, fepaka_id?.trim() || null, licencia, foto_url]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'El FEPAKA ID ya está registrado en el sistema' });
    res.status(500).json({ error: err.message });
  }
});

// POST importar CSV masivo
router.post('/csv', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { arbitros } = req.body;
    const inserted = [];
    const omitidos = [];
    for (const a of arbitros) {
      try {
        const partes = (a.nombre || '').trim().split(' ')
        const nombre = partes[0] || ''
        const apellido = partes.slice(1).join(' ') || null
        const r = await pool.query(
          `INSERT INTO arbitros (nombre, apellido, provincia, club, fepaka_id, licencia)
           VALUES ($1,$2,$3,$4,$5,$6)
           ON CONFLICT (fepaka_id) DO NOTHING RETURNING *`,
          [nombre, apellido, a.provincia, a.club, a.fepaka_id || null, a.licencia]
        );
        if (r.rows.length) inserted.push(r.rows[0]);
        else omitidos.push(a.nombre);
      } catch { omitidos.push(a.nombre) }
    }
    res.json({ insertados: inserted.length, omitidos: omitidos.length, arbitros: inserted });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
