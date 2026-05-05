const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const categoriasController = require('../controllers/categoriasController');

// GET /api/categorias — autenticado
router.get('/', auth, categoriasController.listar);

// POST /api/categorias — solo admin
router.post('/', auth, roles(['admin']), categoriasController.crear);

// PUT /api/categorias/:id — solo admin
router.put('/:id', auth, roles(['admin']), categoriasController.editar);

// DELETE /api/categorias/:id — solo admin
router.delete('/:id', auth, roles(['admin']), categoriasController.eliminar);

module.exports = router;
