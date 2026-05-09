const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const Usuario = require('../models/Usuario');
const { enviarCodigoRecuperacion } = require('../config/mailer');

/**
 * POST /api/auth/recuperar
 * Envía un código de 6 dígitos al correo del usuario.
 * Body: { correo }
 */
exports.solicitarCodigo = async (req, res) => {
  try {
    const { correo } = req.body;

    if (!correo) {
      return res.status(400).json({ error: 'El correo es obligatorio' });
    }

    const usuario = await Usuario.findOne({ correo, eliminado: false, activo: true });

    // No revelar si el correo existe o no (seguridad)
    if (!usuario) {
      return res.json({ mensaje: 'Si el correo está registrado, recibirás un código de recuperación.' });
    }

    // Generar código de 6 dígitos
    const codigo = crypto.randomInt(100000, 999999).toString();
    const expiracion = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    // Guardar en BD
    usuario.codigo_recuperacion = codigo;
    usuario.codigo_expiracion = expiracion;
    await usuario.save();

    // Enviar email con timeout
    try {
      await Promise.race([
        enviarCodigoRecuperacion(correo, codigo, usuario.nombre_completo),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout al enviar email')), 30000)
        )
      ]);
      console.log(`✓ Código enviado a ${correo}`);
    } catch (emailError) {
      console.error('Error al enviar email:', emailError.message);
      // Revertir el código guardado si falla el envío
      usuario.codigo_recuperacion = null;
      usuario.codigo_expiracion = null;
      await usuario.save();
      
      return res.status(503).json({ 
        error: 'No se pudo enviar el email. Verifica tu conexión o intenta más tarde.' 
      });
    }

    res.json({ mensaje: 'Si el correo está registrado, recibirás un código de recuperación.' });
  } catch (error) {
    console.error('Error al solicitar recuperación:', error);
    res.status(500).json({ error: 'Error al procesar la solicitud' });
  }
};

/**
 * POST /api/auth/verificar-codigo
 * Verifica que el código sea válido y no haya expirado.
 * Body: { correo, codigo }
 */
exports.verificarCodigo = async (req, res) => {
  try {
    const { correo, codigo } = req.body;

    if (!correo || !codigo) {
      return res.status(400).json({ error: 'Correo y código son obligatorios' });
    }

    const usuario = await Usuario.findOne({
      correo,
      eliminado: false,
      codigo_recuperacion: codigo,
    });

    if (!usuario) {
      return res.status(400).json({ error: 'Código inválido' });
    }

    if (usuario.codigo_expiracion < new Date()) {
      return res.status(400).json({ error: 'El código ha expirado. Solicita uno nuevo.' });
    }

    res.json({ valido: true, mensaje: 'Código verificado correctamente' });
  } catch (error) {
    console.error('Error al verificar código:', error);
    res.status(500).json({ error: 'Error al verificar el código' });
  }
};

/**
 * POST /api/auth/restablecer
 * Cambia la contraseña tras verificar el código.
 * Body: { correo, codigo, nueva_clave }
 */
exports.restablecerClave = async (req, res) => {
  try {
    const { correo, codigo, nueva_clave } = req.body;

    if (!correo || !codigo || !nueva_clave) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    if (nueva_clave.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    const usuario = await Usuario.findOne({
      correo,
      eliminado: false,
      codigo_recuperacion: codigo,
    });

    if (!usuario) {
      return res.status(400).json({ error: 'Código inválido' });
    }

    if (usuario.codigo_expiracion < new Date()) {
      return res.status(400).json({ error: 'El código ha expirado. Solicita uno nuevo.' });
    }

    // Actualizar contraseña (el pre-save hook hashea automáticamente)
    usuario.clave = nueva_clave;
    usuario.codigo_recuperacion = null;
    usuario.codigo_expiracion = null;
    await usuario.save();

    res.json({ mensaje: 'Contraseña restablecida correctamente' });
  } catch (error) {
    console.error('Error al restablecer contraseña:', error);
    res.status(500).json({ error: 'Error al restablecer la contraseña' });
  }
};
