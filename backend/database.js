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
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS eventos (
      id SERIAL PRIMARY KEY,
      nombre VARCHAR(150) NOT NULL,
      fecha DATE,
      sede VARCHAR(100),
      num_evaluadores INT DEFAULT 4,
      estado VARCHAR(20) DEFAULT 'activo',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS arbitros (
      id SERIAL PRIMARY KEY,
      evento_id INT REFERENCES eventos(id) ON DELETE SET NULL,
      nombre VARCHAR(100) NOT NULL,
      provincia VARCHAR(80),
      club VARCHAR(100),
      fepaka_id VARCHAR(30) UNIQUE,
      licencia VARCHAR(30),
      foto_url VARCHAR(255),
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

    CREATE TABLE IF NOT EXISTS evaluaciones (
      id SERIAL PRIMARY KEY,
      evento_id INT REFERENCES eventos(id) ON DELETE CASCADE,
      arbitro_id INT REFERENCES arbitros(id) ON DELETE CASCADE,
      usuario_id INT REFERENCES usuarios(id) ON DELETE CASCADE,
      conformidad DECIMAL(3,1) CHECK (conformidad BETWEEN 1.0 AND 5.0),
      manejo_tatami DECIMAL(3,1) CHECK (manejo_tatami BETWEEN 1.0 AND 5.0),
      instrucciones DECIMAL(3,1) CHECK (instrucciones BETWEEN 1.0 AND 5.0),
      aplicacion_reglamento DECIMAL(3,1) CHECK (aplicacion_reglamento BETWEEN 1.0 AND 5.0),
      presencia DECIMAL(3,1) CHECK (presencia BETWEEN 1.0 AND 5.0),
      comentario TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(evento_id, arbitro_id, usuario_id)
    );
  `);

  const bcrypt = require('bcryptjs');
  const exists = await pool.query("SELECT id FROM usuarios WHERE username = 'admin'");
  if (exists.rows.length === 0) {
    const hash = await bcrypt.hash('admin123', 10);
    await pool.query(
      "INSERT INTO usuarios (nombre, username, password_hash, rol) VALUES ($1,$2,$3,$4)",
      ['Administrador', 'admin', hash, 'admin']
    );
    console.log('Usuario admin creado: admin / admin123');
  }
  console.log('Base de datos lista ✓');
}

initDB().catch(console.error);
module.exports = pool;
