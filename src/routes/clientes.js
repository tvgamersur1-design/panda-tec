const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const { writeRateLimiter } = require('../config/rateLimiter');
const clientesController = require('../controllers/clientesController');

// IMPORTANTE: /dni/:dni debe ir ANTES de /:id para evitar conflictos de rutas
router.get('/dni/:dni', auth, roles(['admin', 'vendedor']), clientesController.consultarDNI);

router.get('/', auth, roles(['admin', 'vendedor']), clientesController.listar);
router.post('/', auth, roles(['admin', 'vendedor']), writeRateLimiter, clientesController.crear);
router.get('/:id', auth, roles(['admin', 'vendedor']), clientesController.detalle);
router.put('/:id', auth, roles(['admin', 'vendedor']), writeRateLimiter, clientesController.editar);
router.delete('/:id', auth, roles(['admin']), writeRateLimiter, clientesController.eliminar);

module.exports = router;
