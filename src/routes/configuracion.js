const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const configuracionController = require('../controllers/configuracionController');

// GET /api/configuracion/publica — datos básicos (sin auth) — DEBE IR PRIMERO
router.get('/publica', configuracionController.publica);

// GET /api/configuracion — configuración completa (solo admin)
router.get('/', auth, roles(['admin']), configuracionController.obtener);

// PUT /api/configuracion — guardar configuración (solo admin)
router.put('/', auth, roles(['admin']), configuracionController.guardar);

module.exports = router;
