const rateLimit = require('express-rate-limit');

/**
 * Rate limiter para el endpoint de login.
 * Máximo 10 requests por IP en una ventana de 15 minutos.
 */
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos en milisegundos (900000ms)
  max: 10,
  standardHeaders: true,  // Incluir headers RateLimit-* en la respuesta
  legacyHeaders: false,   // Deshabilitar headers X-RateLimit-* obsoletos
  handler: (req, res) => {
    return res.status(429).json({
      error: 'Demasiados intentos. Intenta de nuevo en 15 minutos',
    });
  },
});

module.exports = loginRateLimiter;
