const router = require('express').Router();
const { authMiddleware, adminOnly } = require('../middleware');

// En producción esto se guardaría en BD, por ahora en memoria
let appConfig = { fed_nombre: 'FEPAKA' };

router.get('/', authMiddleware, async (req, res) => {
  res.json(appConfig);
});

router.post('/', authMiddleware, adminOnly, async (req, res) => {
  const { fed_nombre } = req.body;
  if (fed_nombre) appConfig.fed_nombre = fed_nombre;
  res.json(appConfig);
});

module.exports = router;
