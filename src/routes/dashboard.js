const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const dashboardController = require('../controllers/dashboardController');

// GET /api/dashboard — métricas del día
router.get('/', auth, roles(['admin', 'vendedor']), dashboardController.obtener);

module.exports = router;
