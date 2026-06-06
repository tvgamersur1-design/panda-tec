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
 * Para redes locales con múltiples usuarios, se aumenta el límite por IP
 * ya que todos comparten la misma IP pública.
 * El rate limiting por correo (en el controlador) previene abuso individual.
 */
const recoveryRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // 10 intentos por IP (suficiente para varios empleados)
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return res.status(429).json({
      error: 'Demasiadas solicitudes de recuperación. Intenta de nuevo en 15 minutos',
    });
  },
});

/**
 * Rate limiter para verificación de código.
 * Máximo 5 intentos por IP en 15 minutos.
 * Previene ataques de fuerza bruta contra códigos de recuperación.
 */
const verifyCodeRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Solo 5 intentos
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return res.status(429).json({
      error: 'Demasiados intentos de verificación. Intenta de nuevo en 15 minutos',
    });
  },
});

/**
 * Rate limiter general para endpoints de escritura (POST, PUT, PATCH, DELETE).
 * Previene abuso masivo: creación de registros, subida de archivos, etc.
 * Máximo 60 requests por IP en 15 minutos (4 por minuto).
 */
const writeRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return res.status(429).json({
      error: 'Demasiadas solicitudes. Intenta de nuevo en unos minutos',
    });
  },
});

/**
 * Rate limiter para endpoints de lectura intensiva (reportes, dashboards).
 * Máximo 30 requests por IP en 15 minutos.
 */
const readRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return res.status(429).json({
      error: 'Demasiadas consultas. Intenta de nuevo en unos minutos',
    });
  },
});

/**
 * Rate limiter global para TODAS las rutas API.
 * Protege contra abuso masivo, scraping y ataques de fuerza bruta.
 * Máximo 100 requests por IP en 15 minutos (~7 por minuto).
 * Los archivos estáticos (HTML, CSS, JS) NO se ven afectados.
 */
const apiGlobalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return res.status(429).json({
      error: 'Demasiadas solicitudes a la API. Intenta de nuevo en unos minutos',
    });
  },
});

module.exports = {
  loginRateLimiter,
  recoveryRateLimiter,
  verifyCodeRateLimiter,
  writeRateLimiter,
  readRateLimiter,
  apiGlobalRateLimiter,
};
