const express = require('express');
const router = express.Router();
const ventasController = require('../controllers/ventasController');

router.post('/', ventasController.registrarVenta);
router.get('/', ventasController.listarVentas);
router.get('/:id', ventasController.obtenerVenta);
router.put('/:id/anular', ventasController.anularVenta);

module.exports = router;
