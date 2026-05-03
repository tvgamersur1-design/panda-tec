const express = require('express');
const router = express.Router();
const categoriasController = require('../controllers/categoriasController');

router.get('/', categoriasController.listarCategorias);
router.post('/', categoriasController.crearCategoria);
router.put('/:id', categoriasController.actualizarCategoria);
router.delete('/:id', categoriasController.eliminarCategoria);

module.exports = router;
