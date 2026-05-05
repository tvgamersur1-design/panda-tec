const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const pedidosController = require('../controllers/pedidosController');

// GET /api/pedidos — listar pedidos con filtros
router.get('/', auth, roles(['admin', 'almacen']), pedidosController.listar);

// POST /api/pedidos — crear pedido
router.post('/', auth, roles(['admin', 'almacen']), pedidosController.crear);

// PUT /api/pedidos/:id/recibir — marcar pedido como recibido
router.put('/:id/recibir', auth, roles(['admin', 'almacen']), pedidosController.recibir);

module.exports = router;
