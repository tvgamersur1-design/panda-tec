const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const reportesController = require('../controllers/reportesController');

// GET /api/reportes/ventas-dia — reporte ventas del día
router.get('/ventas-dia', auth, roles(['admin']), reportesController.ventasDia);

// GET /api/reportes/ventas-mes — reporte ventas del mes
router.get('/ventas-mes', auth, roles(['admin']), reportesController.ventasMes);

// GET /api/reportes/productos-mas-vendidos — top 10 productos
router.get('/productos-mas-vendidos', auth, roles(['admin']), reportesController.productosMasVendidos);

// GET /api/reportes/stock-valorizado — stock valorizado
router.get('/stock-valorizado', auth, roles(['admin']), reportesController.stockValorizado);

module.exports = router;
