const crypto = require('crypto');
const Usuario = require('../models/Usuario');
const { enviarEmail } = require('../config/mailer');

/**
 * GET /api/usuarios
 * Listar usuarios no eliminados, sin exponer el campo clave.
 */
exports.listar = async (req, res) => {
  try {
    const usuarios = await Usuario.find({ eliminado: false }).select('-clave');
    res.json(usuarios);
  } catch (error) {
    console.error('Error al listar usuarios:', error);
    res.status(500).json({ error: 'Error al listar usuarios' });
  }
};

/**
 * POST /api/usuarios
 * Crear un nuevo usuario. La clave se hashea automáticamente por el pre-save hook.
 * Body: { nombre_completo, usuario, correo, clave, rol }
 */
exports.crear = async (req, res) => {
  try {
    const { nombre_completo, usuario, correo, rol } = req.body;

    if (!nombre_completo || !usuario || !correo || !rol) {
      return res.status(400).json({
        error: 'Los campos nombre_completo, usuario, correo y rol son obligatorios',
      });
    }

    // Verificar duplicados
    const existente = await Usuario.findOne({
      $or: [{ usuario }, { correo }],
      eliminado: false,
    });

    if (existente) {
      return res.status(409).json({ error: 'El usuario o correo ya está en uso' });
    }

    // Generar contraseña temporal de 8 caracteres
    const claveTemporal = crypto.randomBytes(4).toString('hex'); // ej: "a3f1b2c9"

    const nuevoUsuario = await Usuario.create({
      nombre_completo, usuario, correo, clave: claveTemporal, rol,
    });

    // Enviar credenciales por email
    let emailEnviado = false;
    let errorEmail = null;

    try {
      await enviarEmail(
        correo,
        'Tu cuenta ha sido creada — Panta Tec',
        `
          <div style="font-family:'Inter',Arial,sans-serif;max-width:480px;margin:0 auto;padding:2rem;">
            <div style="text-align:center;margin-bottom:1.5rem;">
              <h1 style="font-size:1.5rem;color:#0a0a0a;margin:0;">Panta Tec</h1>
              <p style="color:#64748B;font-size:0.875rem;margin-top:0.25rem;">Sistema de Gestión</p>
            </div>
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:1.5rem;">
              <p style="color:#374151;margin:0 0 0.75rem;">Hola <strong>${nombre_completo}</strong>,</p>
              <p style="color:#64748B;font-size:0.875rem;margin:0 0 1.25rem;">Se ha creado tu cuenta en el sistema. Aquí están tus credenciales de acceso:</p>
              <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:1rem;margin-bottom:1rem;">
                <p style="margin:0 0 0.5rem;font-size:0.875rem;"><strong style="color:#64748B;">Usuario:</strong> <code style="background:#f1f5f9;padding:0.15rem 0.5rem;border-radius:4px;font-weight:600;">${usuario}</code></p>
                <p style="margin:0;font-size:0.875rem;"><strong style="color:#64748B;">Contraseña temporal:</strong> <code style="background:#fef3c7;padding:0.15rem 0.5rem;border-radius:4px;font-weight:600;color:#D97706;">${claveTemporal}</code></p>
              </div>
              <p style="color:#D97706;font-size:0.8125rem;margin:0;"><i>⚠️ Te recomendamos cambiar tu contraseña después del primer inicio de sesión.</i></p>
            </div>
            <p style="color:#CBD5E1;font-size:0.75rem;text-align:center;margin-top:1.5rem;">© ${new Date().getFullYear()} Panta Tec</p>
          </div>
        `
      );
      emailEnviado = true;
      console.log(`✓ Credenciales enviadas a ${correo} (Usuario: ${nombre_completo})`);
    } catch (emailError) {
      console.error('❌ Error al enviar email de bienvenida:', emailError.message);
      errorEmail = emailError.message;
      // No fallar la creación si el email no se envía
    }

    // Retornar sin clave (excepto si el email falló)
    const resultado = nuevoUsuario.toObject();
    delete resultado.clave;

    // Si el email no se envió, incluir la contraseña temporal en la respuesta
    // para que el admin pueda dársela manualmente al usuario
    if (!emailEnviado) {
      resultado.clave_temporal = claveTemporal;
      resultado.advertencia = 'No se pudo enviar el email. Proporciona estas credenciales manualmente al usuario.';
    }

    res.status(201).json({
      ...resultado,
      email_enviado: emailEnviado,
      ...(errorEmail && { error_email: errorEmail })
    });
  } catch (error) {
    console.error('Error al crear usuario:', error);
    res.status(500).json({ error: 'Error al crear usuario' });
  }
};

/**
 * PUT /api/usuarios/:id
 * Editar nombre_completo, correo y rol de un usuario.
 */
exports.editar = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre_completo, correo, rol } = req.body;

    const usuario = await Usuario.findOne({ _id: id, eliminado: false });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Verificar que el nuevo correo no esté en uso por otro usuario
    if (correo && correo !== usuario.correo) {
      const duplicado = await Usuario.findOne({
        correo,
        _id: { $ne: id },
        eliminado: false,
      });
      if (duplicado) {
        return res.status(409).json({ error: 'El correo ya está en uso por otro usuario' });
      }
    }

    const actualizado = await Usuario.findByIdAndUpdate(
      id,
      { nombre_completo, correo, rol },
      { new: true, runValidators: true }
    ).select('-clave');

    res.json(actualizado);
  } catch (error) {
    console.error('Error al editar usuario:', error);
    res.status(500).json({ error: 'Error al editar usuario' });
  }
};

/**
 * PATCH /api/usuarios/:id/estado
 * Activar o desactivar un usuario.
 * Body: { activo: true/false }
 */
exports.cambiarEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const { activo } = req.body;

    if (typeof activo !== 'boolean') {
      return res.status(400).json({ error: 'El campo activo debe ser true o false' });
    }

    const usuario = await Usuario.findOne({ _id: id, eliminado: false });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Si se intenta desactivar, verificar que no sea el último admin activo
    if (!activo && usuario.rol === 'admin') {
      const adminsActivos = await Usuario.countDocuments({
        rol: 'admin',
        activo: true,
        eliminado: false,
      });
      if (adminsActivos <= 1) {
        return res.status(409).json({
          error: 'No se puede desactivar al último administrador activo',
        });
      }
    }

    const actualizado = await Usuario.findByIdAndUpdate(
      id,
      { activo },
      { new: true }
    ).select('-clave');

    res.json(actualizado);
  } catch (error) {
    console.error('Error al cambiar estado de usuario:', error);
    res.status(500).json({ error: 'Error al cambiar estado del usuario' });
  }
};

/**
 * DELETE /api/usuarios/:id
 * Soft delete de un usuario.
 */
exports.eliminar = async (req, res) => {
  try {
    const { id } = req.params;

    const usuario = await Usuario.findOne({ _id: id, eliminado: false });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Verificar que no sea el último admin activo
    if (usuario.rol === 'admin' && usuario.activo) {
      const adminsActivos = await Usuario.countDocuments({
        rol: 'admin',
        activo: true,
        eliminado: false,
      });
      if (adminsActivos <= 1) {
        return res.status(409).json({
          error: 'No se puede eliminar al último administrador activo',
        });
      }
    }

    await Usuario.findByIdAndUpdate(id, { eliminado: true });

    res.json({ mensaje: 'Usuario eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
};
