const router = require('express').Router();
const pool = require('../database');
const { authMiddleware, adminOnly } = require('../middleware');

// Crear tabla de configuración si no existe (una sola fila, id=1)
pool.query(`
  CREATE TABLE IF NOT EXISTS app_config (
    id INT PRIMARY KEY DEFAULT 1,
    escudo TEXT,
    fed_nombre VARCHAR(150) DEFAULT 'FEPAKA',
    titulo_app VARCHAR(150) DEFAULT 'Gestión de Arbitraje',
    updated_at TIMESTAMP DEFAULT NOW(),
    CHECK (id = 1)
  );
  INSERT INTO app_config (id, fed_nombre, titulo_app)
  VALUES (1, 'FEPAKA', 'Gestión de Arbitraje')
  ON CONFLICT (id) DO NOTHING;
`).catch(console.error);

// GET configuración actual — pública (la necesita el login, sin autenticación)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT escudo, fed_nombre, titulo_app FROM app_config WHERE id = 1');
    const row = result.rows[0] || {};
    res.json({
      escudo: row.escudo || null,
      fedNombre: row.fed_nombre || 'FEPAKA',
      tituloApp: row.titulo_app || 'Gestión de Arbitraje',
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT actualizar configuración — requiere ser admin
router.put('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { escudo, fedNombre, tituloApp } = req.body;
    const current = await pool.query('SELECT * FROM app_config WHERE id = 1');
    const prev = current.rows[0] || {};

    const result = await pool.query(
      `UPDATE app_config SET
         escudo = COALESCE($1, escudo),
         fed_nombre = COALESCE($2, fed_nombre),
         titulo_app = COALESCE($3, titulo_app),
         updated_at = NOW()
       WHERE id = 1
       RETURNING escudo, fed_nombre, titulo_app`,
      [escudo !== undefined ? escudo : prev.escudo,
       fedNombre || prev.fed_nombre,
       tituloApp || prev.titulo_app]
    );
    const row = result.rows[0];
    res.json({
      escudo: row.escudo || null,
      fedNombre: row.fed_nombre,
      tituloApp: row.titulo_app,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE quitar el escudo específicamente
router.delete('/escudo', authMiddleware, adminOnly, async (req, res) => {
  try {
    await pool.query('UPDATE app_config SET escudo = NULL, updated_at = NOW() WHERE id = 1');
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
