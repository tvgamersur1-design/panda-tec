const jwt = require('jsonwebtoken');

/**
 * Middleware de autenticación JWT.
 * Verifica el token del header Authorization: Bearer <token>.
 * Si es válido, adjunta req.user = { id, usuario, rol } y llama next().
 */
function auth(req, res, next) {
  const authHeader = req.headers['authorization'];

  // Verificar que el header exista y tenga el formato correcto
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: decoded.id,
      usuario: decoded.usuario,
      rol: decoded.rol,
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

module.exports = auth;
