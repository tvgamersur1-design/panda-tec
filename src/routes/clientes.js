const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const clientesController = require('../controllers/clientesController');

// IMPORTANTE: /dni/:dni debe ir ANTES de /:id para evitar conflictos de rutas
router.get('/dni/:dni', auth, clientesController.consultarDNI);

router.get('/', auth, roles(['admin', 'vendedor']), clientesController.listar);
router.post('/', auth, roles(['admin', 'vendedor']), clientesController.crear);
router.get('/:id', auth, roles(['admin', 'vendedor']), clientesController.detalle);
router.put('/:id', auth, roles(['admin', 'vendedor']), clientesController.editar);
router.delete('/:id', auth, roles(['admin']), clientesController.eliminar);

module.exports = router;
