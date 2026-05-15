const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const recoveryController = require('../controllers/recoveryController');
const googleAuthController = require('../controllers/googleAuthController');
const auth = require('../middlewares/auth');
const { loginRateLimiter, recoveryRateLimiter, verifyCodeRateLimiter } = require('../config/rateLimiter');

// POST /api/auth/login — Público, con rate limiting
router.post('/login', loginRateLimiter, authController.login);

// GET /api/auth/verificar — Requiere token válido
router.get('/verificar', auth, authController.verificar);

// ── Recuperación de contraseña ───────────────────────────────────────────────
// Rate limiting estricto para prevenir abuso y ataques de fuerza bruta
router.post('/recuperar', recoveryRateLimiter, recoveryController.solicitarCodigo);
router.post('/verificar-codigo', verifyCodeRateLimiter, recoveryController.verificarCodigo);
router.post('/restablecer', recoveryRateLimiter, recoveryController.restablecerClave);

// ── Google OAuth ─────────────────────────────────────────────────────────────
router.post('/google', googleAuthController.loginConGoogle);
router.post('/google/vincular', auth, googleAuthController.vincularGoogle);

module.exports = router;
