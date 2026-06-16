const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY,
      nombre VARCHAR(100) NOT NULL,
      username VARCHAR(50) UNIQUE NOT NULL,
      password_hash VARCHAR(200) NOT NULL,
      rol VARCHAR(20) DEFAULT 'evaluador',
      activo BOOLEAN DEFAULT true,
      eliminado BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS eventos (
      id SERIAL PRIMARY KEY,
      nombre VARCHAR(150) NOT NULL,
      fecha DATE,
      fecha_fin DATE,
      sede VARCHAR(100),
      estado VARCHAR(20) DEFAULT 'activo',
      estado_manual BOOLEAN DEFAULT false,
      num_evaluadores INT DEFAULT 4,
      eliminado BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS arbitros (
      id SERIAL PRIMARY KEY,
      evento_id INT REFERENCES eventos(id) ON DELETE SET NULL,
      nombre VARCHAR(100) NOT NULL,
      apellido VARCHAR(80),
      provincia VARCHAR(80),
      club VARCHAR(100),
      fepaka_id VARCHAR(30) UNIQUE,
      licencia VARCHAR(50),
      foto_url VARCHAR(255),
      eliminado BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    );

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

    CREATE TABLE IF NOT EXISTS areas (
      id SERIAL PRIMARY KEY,
      evento_id INT REFERENCES eventos(id) ON DELETE CASCADE,
      nombre VARCHAR(80) NOT NULL,
      jefe_id INT REFERENCES usuarios(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS area_arbitros (
      area_id INT REFERENCES areas(id) ON DELETE CASCADE,
      arbitro_id INT REFERENCES arbitros(id) ON DELETE CASCADE,
      PRIMARY KEY (area_id, arbitro_id)
    );

    CREATE TABLE IF NOT EXISTS evaluaciones (
      id SERIAL PRIMARY KEY,
      evento_id INT REFERENCES eventos(id) ON DELETE CASCADE,
      arbitro_id INT REFERENCES arbitros(id) ON DELETE CASCADE,
      usuario_id INT REFERENCES usuarios(id) ON DELETE CASCADE,
      area_id INT REFERENCES areas(id) ON DELETE SET NULL,
      modalidad VARCHAR(10) NOT NULL DEFAULT 'kumite',
      voz_mando DECIMAL(3,1),
      movilidad DECIMAL(3,1),
      gestos_senalizaciones DECIMAL(3,1),
      aplicacion_reglamento DECIMAL(3,1),
      performance_presencia DECIMAL(3,1),
      procedimiento DECIMAL(3,1),
      dominio_criterios DECIMAL(3,1),
      focalizacion DECIMAL(3,1),
      comentario TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS auditoria (
      id SERIAL PRIMARY KEY,
      usuario_id INT REFERENCES usuarios(id) ON DELETE SET NULL,
      usuario_nombre VARCHAR(100),
      accion VARCHAR(20) NOT NULL,
      entidad VARCHAR(20) NOT NULL,
      entidad_id INT NOT NULL,
      entidad_nombre VARCHAR(150),
      detalle JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  const migraciones = [
    `ALTER TABLE eventos ADD COLUMN IF NOT EXISTS fecha_fin DATE`,
    `ALTER TABLE eventos ADD COLUMN IF NOT EXISTS estado_manual BOOLEAN DEFAULT false`,
    `ALTER TABLE eventos ADD COLUMN IF NOT EXISTS eliminado BOOLEAN DEFAULT false`,
    `ALTER TABLE eventos DROP COLUMN IF EXISTS modalidad`,
    `ALTER TABLE arbitros ADD COLUMN IF NOT EXISTS apellido VARCHAR(80)`,
    `ALTER TABLE arbitros ADD COLUMN IF NOT EXISTS eliminado BOOLEAN DEFAULT false`,
    `ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS eliminado BOOLEAN DEFAULT false`,
    `ALTER TABLE evaluaciones ADD COLUMN IF NOT EXISTS modalidad VARCHAR(10) NOT NULL DEFAULT 'kumite'`,
    `ALTER TABLE evaluaciones ADD COLUMN IF NOT EXISTS area_id INT`,
    `ALTER TABLE evaluaciones ADD COLUMN IF NOT EXISTS voz_mando DECIMAL(3,1)`,
    `ALTER TABLE evaluaciones ADD COLUMN IF NOT EXISTS movilidad DECIMAL(3,1)`,
    `ALTER TABLE evaluaciones ADD COLUMN IF NOT EXISTS gestos_senalizaciones DECIMAL(3,1)`,
    `ALTER TABLE evaluaciones ADD COLUMN IF NOT EXISTS performance_presencia DECIMAL(3,1)`,
    `ALTER TABLE evaluaciones ADD COLUMN IF NOT EXISTS procedimiento DECIMAL(3,1)`,
    `ALTER TABLE evaluaciones ADD COLUMN IF NOT EXISTS dominio_criterios DECIMAL(3,1)`,
    `ALTER TABLE evaluaciones ADD COLUMN IF NOT EXISTS focalizacion DECIMAL(3,1)`,
    `ALTER TABLE evaluaciones ADD COLUMN IF NOT EXISTS comentario TEXT`,
    `CREATE TABLE IF NOT EXISTS areas (
      id SERIAL PRIMARY KEY,
      evento_id INT REFERENCES eventos(id) ON DELETE CASCADE,
      nombre VARCHAR(80) NOT NULL,
      jefe_id INT REFERENCES usuarios(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS area_arbitros (
      area_id INT REFERENCES areas(id) ON DELETE CASCADE,
      arbitro_id INT REFERENCES arbitros(id) ON DELETE CASCADE,
      PRIMARY KEY (area_id, arbitro_id)
    )`,
    `CREATE TABLE IF NOT EXISTS auditoria (
      id SERIAL PRIMARY KEY,
      usuario_id INT REFERENCES usuarios(id) ON DELETE SET NULL,
      usuario_nombre VARCHAR(100),
      accion VARCHAR(20) NOT NULL,
      entidad VARCHAR(20) NOT NULL,
      entidad_id INT NOT NULL,
      entidad_nombre VARCHAR(150),
      detalle JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
  ];

  for (const sql of migraciones) {
    await pool.query(sql).catch(err => console.log('Migración omitida:', err.message));
  }

  await pool.query(`
    DELETE FROM evaluaciones a USING evaluaciones b
    WHERE a.id < b.id AND a.evento_id = b.evento_id AND a.arbitro_id = b.arbitro_id
      AND a.usuario_id = b.usuario_id AND a.modalidad = b.modalidad
  `).catch(() => {});

  await pool.query(`ALTER TABLE evaluaciones DROP CONSTRAINT IF EXISTS evaluaciones_evento_id_arbitro_id_usuario_id_key`).catch(() => {});
  await pool.query(`
    ALTER TABLE evaluaciones ADD CONSTRAINT evaluaciones_unica
    UNIQUE (evento_id, arbitro_id, usuario_id, modalidad)
  `).catch(err => { if (!err.message.includes('already exists')) console.log('Constraint:', err.message) });

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

  const bcrypt = require('bcryptjs');
  const exists = await pool.query("SELECT id FROM usuarios WHERE username = 'admin'");
  if (exists.rows.length === 0) {
    const hash = await bcrypt.hash('admin123', 10);
    await pool.query(
      "INSERT INTO usuarios (nombre, username, password_hash, rol) VALUES ($1,$2,$3,$4)",
      ['Administrador', 'admin', hash, 'admin']
    );
  }

  await pool.query(`
    INSERT INTO evento_arbitros (evento_id, arbitro_id)
    SELECT evento_id, id FROM arbitros WHERE evento_id IS NOT NULL
    ON CONFLICT DO NOTHING
  `).catch(() => {});

  console.log('Base de datos lista ✓');
}

initDB().catch(console.error);
module.exports = pool;
