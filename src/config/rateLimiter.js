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

/**
 * Rate limiter para recuperación de contraseña.
 * Más estricto: máximo 3 solicitudes por IP en 15 minutos.
 * Previene abuso del sistema de emails y enumeración de usuarios.
 */
const recoveryRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 3, // Solo 3 intentos
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return res.status(429).json({
      error: 'Demasiadas solicitudes de recuperación. Intenta de nuevo en 15 minutos',
    });
  },
});

module.exports = { loginRateLimiter, recoveryRateLimiter };
