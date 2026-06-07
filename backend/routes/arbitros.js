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

// GET todos los árbitros (base global)
router.get('/todos', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM arbitros WHERE evento_id IS NULL ORDER BY nombre');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET árbitros asignados a un evento (via evento_arbitros)
router.get('/evento/:eventoId', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.* FROM arbitros a
       JOIN evento_arbitros ea ON ea.arbitro_id = a.id
       WHERE ea.evento_id = $1 ORDER BY a.nombre`,
      [req.params.eventoId]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST agregar árbitro a la base global (sin evento_id)
router.post('/', authMiddleware, adminOnly, upload.single('foto'), async (req, res) => {
  try {
    const { nombre, apellido, provincia, club, fepaka_id, licencia } = req.body;
    const nombreCompleto = apellido ? `${nombre} ${apellido}` : nombre;
    const foto_url = req.file ? `/uploads/${req.file.filename}` : null;
    const result = await pool.query(
      'INSERT INTO arbitros (nombre, provincia, club, fepaka_id, licencia, foto_url) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [nombreCompleto, provincia, club, fepaka_id, licencia, foto_url]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST importar CSV masivo a base global
router.post('/csv', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { arbitros } = req.body;
    const inserted = [];
    for (const a of arbitros) {
      try {
        const r = await pool.query(
          'INSERT INTO arbitros (nombre, provincia, club, fepaka_id, licencia) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (fepaka_id) DO NOTHING RETURNING *',
          [a.nombre, a.provincia, a.club, a.fepaka_id, a.licencia]
        );
        if (r.rows.length) inserted.push(r.rows[0]);
      } catch { /* omitir duplicados */ }
    }
    res.json({ insertados: inserted.length, arbitros: inserted });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
