const pool = require('./database');

// Registra una acción en la tabla de auditoría
async function log(req, accion, entidad, entidadId, entidadNombre, detalle = null) {
  try {
    await pool.query(
      `INSERT INTO auditoria (usuario_id, usuario_nombre, accion, entidad, entidad_id, entidad_nombre, detalle)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [req.user?.id || null, req.user?.nombre || 'Sistema', accion, entidad, entidadId, entidadNombre, detalle ? JSON.stringify(detalle) : null]
    );
  } catch (err) {
    console.error('Error al registrar auditoría:', err.message);
  }
}

module.exports = { log };
