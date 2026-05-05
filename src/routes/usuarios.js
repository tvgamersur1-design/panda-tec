const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const usuariosController = require('../controllers/usuariosController');

// GET /api/usuarios — listar usuarios
router.get('/', auth, roles(['admin']), usuariosController.listar);

// POST /api/usuarios — crear usuario
router.post('/', auth, roles(['admin']), usuariosController.crear);

// PUT /api/usuarios/:id — editar usuario
router.put('/:id', auth, roles(['admin']), usuariosController.editar);

// PATCH /api/usuarios/:id/estado — activar/desactivar usuario
router.patch('/:id/estado', auth, roles(['admin']), usuariosController.cambiarEstado);

// DELETE /api/usuarios/:id — eliminar usuario (soft delete)
router.delete('/:id', auth, roles(['admin']), usuariosController.eliminar);

module.exports = router;
