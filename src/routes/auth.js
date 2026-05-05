const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const auth = require('../middlewares/auth');
const loginRateLimiter = require('../config/rateLimiter');

// POST /api/auth/login — Público, con rate limiting
router.post('/login', loginRateLimiter, authController.login);

// GET /api/auth/verificar — Requiere token válido
router.get('/verificar', auth, authController.verificar);

module.exports = router;
