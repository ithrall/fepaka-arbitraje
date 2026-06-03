require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Rutas
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/eventos',    require('./routes/eventos'));
app.use('/api/arbitros',   require('./routes/arbitros'));
app.use('/api/usuarios',   require('./routes/usuarios'));
app.use('/api/evaluaciones', require('./routes/evaluaciones'));

app.get('/', (req, res) => res.json({ status: 'FEPAKA API funcionando ✓' }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
