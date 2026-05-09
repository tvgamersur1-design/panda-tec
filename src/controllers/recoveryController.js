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

    // Verificar configuración de email
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.error('❌ Variables GMAIL_USER o GMAIL_APP_PASSWORD no configuradas');
      return res.status(503).json({ 
        error: 'El servicio de recuperación de contraseña no está disponible. Contacta al administrador.' 
      });
    }

    const usuario = await Usuario.findOne({ correo, eliminado: false, activo: true });

    // ── Verificación de seguridad: solo usuarios registrados ────────────────
    // No revelar si el correo existe o no (previene enumeración de usuarios)
    // pero NO enviar email ni gastar recursos si no existe
    if (!usuario) {
      console.log(`⚠️ Intento de recuperación con correo no registrado: ${correo}`);
      // Respuesta genérica para no revelar si el usuario existe
      return res.json({ mensaje: 'Si el correo está registrado, recibirás un código de recuperación.' });
    }

    // ── Usuario válido: generar y enviar código ─────────────────────────────
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
      console.log(`✓ Código enviado a ${correo} (Usuario: ${usuario.nombre_completo})`);
    } catch (emailError) {
      console.error('❌ Error al enviar email:', emailError.message);
      console.error('Detalles:', emailError);
      
      // Revertir el código guardado si falla el envío
      usuario.codigo_recuperacion = null;
      usuario.codigo_expiracion = null;
      await usuario.save();
      
      // Mensaje más específico según el error
      let mensajeError = 'No se pudo enviar el email. ';
      if (emailError.message.includes('Timeout')) {
        mensajeError += 'El servidor de correo no responde. Intenta más tarde.';
      } else if (emailError.message.includes('ECONNREFUSED') || emailError.message.includes('ETIMEDOUT')) {
        mensajeError += 'No se puede conectar al servidor de correo. Contacta al administrador.';
      } else if (emailError.message.includes('Invalid login')) {
        mensajeError += 'Error de autenticación con el servidor de correo. Contacta al administrador.';
      } else {
        mensajeError += 'Error desconocido. Contacta al administrador.';
      }
      
      return res.status(503).json({ error: mensajeError });
    }

    res.json({ mensaje: 'Si el correo está registrado, recibirás un código de recuperación.' });
  } catch (error) {
    console.error('❌ Error al solicitar recuperación:', error);
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
