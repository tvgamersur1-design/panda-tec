const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const uploadImagen = require('../middlewares/upload');
const { writeRateLimiter } = require('../config/rateLimiter');
const productosController = require('../controllers/productosController');

// GET /api/productos/publico — SIN auth para el catálogo
router.get('/publico', productosController.listarPublico);

// GET /api/productos/stock-bajo — DEBE IR ANTES de /:id
router.get('/stock-bajo', auth, productosController.stockBajo);

// GET /api/productos — autenticado, con filtros opcionales
router.get('/', auth, productosController.listar);

// POST /api/productos — admin o almacen, con subida de imagen
router.post('/', auth, roles(['admin', 'almacen']), writeRateLimiter, uploadImagen, productosController.crear);

// GET /api/productos/:id — autenticado
router.get('/:id', auth, productosController.detalle);

// PUT /api/productos/:id — admin o almacen, con subida de imagen
router.put('/:id', auth, roles(['admin', 'almacen']), writeRateLimiter, uploadImagen, productosController.editar);

// DELETE /api/productos/:id — admin o almacen
router.delete('/:id', auth, roles(['admin', 'almacen']), writeRateLimiter, productosController.eliminar);

module.exports = router;
