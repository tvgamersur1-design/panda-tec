const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cloudinary = require('../config/cloudinary');
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
        foto: usuarioDoc.foto || null,
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
async function verificar(req, res) {
  try {
    const usuario = await Usuario.findById(req.user.id).select('nombre_completo usuario rol foto');
    if (!usuario) {
      return res.status(401).json({ valido: false, error: 'Usuario no encontrado' });
    }
    return res.status(200).json({
      valido: true,
      usuario: {
        id: usuario._id,
        nombre_completo: usuario.nombre_completo,
        usuario: usuario.usuario,
        rol: usuario.rol,
        foto: usuario.foto || null,
      },
    });
  } catch (err) {
    return res.status(500).json({ valido: false, error: 'Error interno' });
  }
}

/**
 * PUT /api/auth/perfil
 * Cambia la contraseña del usuario autenticado.
 * Requiere: clave_actual, nueva_clave
 */
async function cambiarClave(req, res) {
  try {
    const { clave_actual, nueva_clave } = req.body;

    if (!clave_actual || !nueva_clave) {
      return res.status(400).json({ error: 'Debes proporcionar la contraseña actual y la nueva' });
    }

    if (nueva_clave.length < 6) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
    }

    if (clave_actual === nueva_clave) {
      return res.status(400).json({ error: 'La nueva contraseña no puede ser igual a la actual' });
    }

    const usuario = await Usuario.findById(req.user.id);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const valida = await bcrypt.compare(clave_actual, usuario.clave);
    if (!valida) {
      return res.status(400).json({ error: 'La contraseña actual no es correcta' });
    }

    usuario.clave = nueva_clave;
    await usuario.save();

    return res.status(200).json({ mensaje: 'Contraseña actualizada correctamente' });
  } catch (err) {
    console.error('Error al cambiar contraseña:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * POST /api/auth/perfil/foto
 * Sube/actualiza la foto de perfil del usuario autenticado.
 * Requiere middleware uploadAvatar (multipart, campo 'imagen')
 */
async function subirFoto(req, res) {
  try {
    const url = req.cloudinaryUrl;
    if (!url) {
      return res.status(400).json({ error: 'No se pudo procesar la imagen' });
    }

    const usuario = await Usuario.findById(req.user.id);

    // Eliminar foto anterior de Cloudinary si existe
    if (usuario.foto) {
      const publicId = extraerPublicId(usuario.foto);
      if (publicId) {
        cloudinary.uploader.destroy(publicId, err => {
          if (err) console.warn('No se pudo eliminar foto anterior:', err.message);
        });
      }
    }

    usuario.foto = url;
    await usuario.save();

    return res.status(200).json({
      mensaje: 'Foto actualizada correctamente',
      foto: usuario.foto,
    });
  } catch (err) {
    console.error('Error al subir foto:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * Extrae el public_id de Cloudinary desde una URL segura.
 * Ej: https://res.cloudinary.com/demo/image/upload/v1234/pantatec/avatars/a.jpg
 *     → pantatec/avatars/a
 */
function extraerPublicId(url) {
  try {
    const parts = url.split('/upload/');
    if (parts.length < 2) return null;
    return parts[1].replace(/^v\d+\//, '').replace(/\.[^.]+$/, '');
  } catch {
    return null;
  }
}

module.exports = { login, verificar, cambiarClave, subirFoto };
