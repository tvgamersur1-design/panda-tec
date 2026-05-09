const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const Usuario = require('../models/Usuario');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * POST /api/auth/google
 * Autentica con token de Google. Si el usuario tiene google_id vinculado, inicia sesión.
 * Body: { credential } — el ID token de Google
 */
exports.loginConGoogle = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ error: 'Token de Google no proporcionado' });
    }

    // Verificar el token con Google
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name } = payload;

    // Buscar usuario vinculado por google_id o por correo
    let usuario = await Usuario.findOne({
      $or: [{ google_id: googleId }, { correo: email }],
      eliminado: false,
    });

    if (!usuario) {
      return res.status(404).json({
        error: 'No hay una cuenta vinculada a este correo de Google. Contacta al administrador.',
      });
    }

    if (!usuario.activo) {
      return res.status(401).json({ error: 'Cuenta inactiva. Contacta al administrador.' });
    }

    // Vincular google_id si aún no lo tiene
    if (!usuario.google_id) {
      usuario.google_id = googleId;
      usuario.email_verificado = true;
      await usuario.save();
    }

    // Generar JWT
    const tokenPayload = {
      id: usuario._id,
      usuario: usuario.usuario,
      rol: usuario.rol,
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '8h' });

    res.json({
      token,
      usuario: {
        id: usuario._id,
        nombre_completo: usuario.nombre_completo,
        usuario: usuario.usuario,
        rol: usuario.rol,
      },
    });
  } catch (error) {
    console.error('Error en login con Google:', error);
    if (error.message?.includes('Token used too late') || error.message?.includes('Invalid token')) {
      return res.status(401).json({ error: 'Token de Google inválido o expirado' });
    }
    res.status(500).json({ error: 'Error al autenticar con Google' });
  }
};

/**
 * POST /api/auth/google/vincular
 * Vincula la cuenta Google al usuario autenticado.
 * Body: { credential } — el ID token de Google
 * Requiere auth middleware.
 */
exports.vincularGoogle = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ error: 'Token de Google no proporcionado' });
    }

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email } = payload;

    // Verificar que el google_id no esté vinculado a otro usuario
    const yaVinculado = await Usuario.findOne({
      google_id: googleId,
      _id: { $ne: req.user.id },
      eliminado: false,
    });

    if (yaVinculado) {
      return res.status(409).json({ error: 'Esta cuenta de Google ya está vinculada a otro usuario' });
    }

    const usuario = await Usuario.findByIdAndUpdate(
      req.user.id,
      { google_id: googleId, email_verificado: true },
      { new: true }
    ).select('-clave');

    res.json({ mensaje: 'Cuenta de Google vinculada correctamente', usuario });
  } catch (error) {
    console.error('Error al vincular Google:', error);
    res.status(500).json({ error: 'Error al vincular cuenta de Google' });
  }
};
