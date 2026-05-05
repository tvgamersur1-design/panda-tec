/**
 * Fábrica de middleware para control de acceso por rol.
 *
 * @param {string[]} rolesPermitidos - Array de roles que tienen acceso al endpoint.
 * @returns {Function} Middleware de Express.
 *
 * Ejemplo de uso:
 *   router.post('/productos', auth, roles(['admin', 'almacen']), controller.crear)
 */
function roles(rolesPermitidos) {
  return function (req, res, next) {
    if (!req.user || !rolesPermitidos.includes(req.user.rol)) {
      return res.status(403).json({ error: 'No tienes permisos para realizar esta acción' });
    }
    next();
  };
}

module.exports = roles;
