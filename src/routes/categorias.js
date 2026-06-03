const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const { writeRateLimiter } = require('../config/rateLimiter');
const categoriasController = require('../controllers/categoriasController');

// GET /api/categorias/publico — SIN auth para el catálogo
router.get('/publico', categoriasController.listarPublico);

// GET /api/categorias — autenticado
router.get('/', auth, categoriasController.listar);

// POST /api/categorias — solo admin
router.post('/', auth, roles(['admin']), writeRateLimiter, categoriasController.crear);

// PUT /api/categorias/:id — solo admin
router.put('/:id', auth, roles(['admin']), writeRateLimiter, categoriasController.editar);

// DELETE /api/categorias/:id — solo admin
router.delete('/:id', auth, roles(['admin']), writeRateLimiter, categoriasController.eliminar);

module.exports = router;
