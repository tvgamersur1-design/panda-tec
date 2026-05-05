const Usuario = require('../models/Usuario');

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
    const { nombre_completo, usuario, correo, clave, rol } = req.body;

    if (!nombre_completo || !usuario || !correo || !clave || !rol) {
      return res.status(400).json({
        error: 'Los campos nombre_completo, usuario, correo, clave y rol son obligatorios',
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

    const nuevoUsuario = await Usuario.create({ nombre_completo, usuario, correo, clave, rol });

    // Retornar sin clave
    const resultado = nuevoUsuario.toObject();
    delete resultado.clave;

    res.status(201).json(resultado);
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
