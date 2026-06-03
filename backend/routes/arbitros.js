const router = require('express').Router();
const pool = require('../database');
const { authMiddleware, adminOnly } = require('../middleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configurar almacenamiento de fotos
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `arb_${Date.now()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB máx

// GET árbitros de un evento
router.get('/evento/:eventoId', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM arbitros WHERE evento_id=$1 ORDER BY nombre',
      [req.params.eventoId]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST agregar árbitro individual
router.post('/', authMiddleware, adminOnly, upload.single('foto'), async (req, res) => {
  try {
    const { evento_id, nombre, provincia, club, fepaka_id, licencia } = req.body;
    const foto_url = req.file ? `/uploads/${req.file.filename}` : null;
    const result = await pool.query(
      'INSERT INTO arbitros (evento_id, nombre, provincia, club, fepaka_id, licencia, foto_url) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [evento_id, nombre, provincia, club, fepaka_id, licencia, foto_url]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST importar CSV masivo
router.post('/csv', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { evento_id, arbitros } = req.body; // array de árbitros
    const inserted = [];
    for (const a of arbitros) {
      const r = await pool.query(
        'INSERT INTO arbitros (evento_id, nombre, provincia, club, fepaka_id, licencia) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (fepaka_id) DO NOTHING RETURNING *',
        [evento_id, a.nombre, a.provincia, a.club, a.fepaka_id, a.licencia]
      );
      if (r.rows.length) inserted.push(r.rows[0]);
    }
    res.json({ insertados: inserted.length, arbitros: inserted });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE árbitro
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await pool.query('DELETE FROM arbitros WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
