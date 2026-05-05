const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const ventasController = require('../controllers/ventasController');

router.get('/', auth, roles(['admin', 'vendedor']), ventasController.listar);
router.post('/', auth, roles(['admin', 'vendedor']), ventasController.crear);
router.get('/:id', auth, roles(['admin', 'vendedor']), ventasController.detalle);
router.put('/:id/anular', auth, roles(['admin']), ventasController.anular);

module.exports = router;
