const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Usuario = require('../models/Usuario');

/**
 * POST /api/auth/login
 * Verifica credenciales y retorna JWT si son válidas.
 */
async function login(req, res) {
  try {
    const { usuario, clave } = req.body;

    if (!usuario || !clave) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Buscar usuario activo (no eliminado) por nombre de usuario
    const usuarioDoc = await Usuario.findOne({ usuario, eliminado: { $ne: true } });

    // No revelar si el usuario existe o no
    if (!usuarioDoc) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Verificar que la cuenta esté activa
    if (!usuarioDoc.activo) {
      return res.status(401).json({ error: 'Cuenta inactiva. Contacta al administrador' });
    }

    // Comparar contraseña con el hash almacenado
    const claveValida = await bcrypt.compare(clave, usuarioDoc.clave);
    if (!claveValida) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Generar JWT con duración de 8 horas
    const payload = {
      id: usuarioDoc._id,
      usuario: usuarioDoc.usuario,
      rol: usuarioDoc.rol,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

    return res.status(200).json({
      token,
      usuario: {
        id: usuarioDoc._id,
        nombre_completo: usuarioDoc.nombre_completo,
        usuario: usuarioDoc.usuario,
        rol: usuarioDoc.rol,
      },
    });
  } catch (err) {
    console.error('Error en login:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * GET /api/auth/verificar
 * Endpoint protegido que confirma que el token es válido.
 * Requiere middleware auth aplicado en la ruta.
 */
function verificar(req, res) {
  return res.status(200).json({ valido: true, usuario: req.user });
}

module.exports = { login, verificar };
