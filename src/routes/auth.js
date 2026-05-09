const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const recoveryController = require('../controllers/recoveryController');
const googleAuthController = require('../controllers/googleAuthController');
const auth = require('../middlewares/auth');
const loginRateLimiter = require('../config/rateLimiter');

// POST /api/auth/login — Público, con rate limiting
router.post('/login', loginRateLimiter, authController.login);

// GET /api/auth/verificar — Requiere token válido
router.get('/verificar', auth, authController.verificar);

// ── Recuperación de contraseña ───────────────────────────────────────────────
router.post('/recuperar', loginRateLimiter, recoveryController.solicitarCodigo);
router.post('/verificar-codigo', loginRateLimiter, recoveryController.verificarCodigo);
router.post('/restablecer', loginRateLimiter, recoveryController.restablecerClave);

// ── Google OAuth ─────────────────────────────────────────────────────────────
router.post('/google', googleAuthController.loginConGoogle);
router.post('/google/vincular', auth, googleAuthController.vincularGoogle);

module.exports = router;
