const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const proveedoresController = require('../controllers/proveedoresController');

// GET /api/proveedores — listar proveedores activos
router.get('/', auth, roles(['admin', 'almacen']), proveedoresController.listar);

// POST /api/proveedores — crear proveedor
router.post('/', auth, roles(['admin', 'almacen']), proveedoresController.crear);

// PUT /api/proveedores/:id — editar proveedor
router.put('/:id', auth, roles(['admin', 'almacen']), proveedoresController.editar);

module.exports = router;
