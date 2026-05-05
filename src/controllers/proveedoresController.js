const Proveedor = require('../models/Proveedor');

/**
 * GET /api/proveedores
 * Listar todos los proveedores activos, ordenados por nombre.
 */
exports.listar = async (req, res) => {
  try {
    const proveedores = await Proveedor.find({ activo: true }).sort({ nombre: 1 });
    res.json(proveedores);
  } catch (error) {
    console.error('Error al listar proveedores:', error);
    res.status(500).json({ error: 'Error al listar proveedores' });
  }
};

/**
 * POST /api/proveedores
 * Crear un nuevo proveedor.
 * Body: { nombre, telefono, correo }
 */
exports.crear = async (req, res) => {
  try {
    const { nombre, telefono, correo } = req.body;

    if (!nombre || !telefono || !correo) {
      return res.status(400).json({ error: 'Los campos nombre, telefono y correo son obligatorios' });
    }

    const proveedor = await Proveedor.create({ nombre, telefono, correo });
    res.status(201).json(proveedor);
  } catch (error) {
    console.error('Error al crear proveedor:', error);
    res.status(500).json({ error: 'Error al crear proveedor' });
  }
};

/**
 * PUT /api/proveedores/:id
 * Editar nombre, telefono y correo de un proveedor.
 */
exports.editar = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, telefono, correo } = req.body;

    const proveedor = await Proveedor.findByIdAndUpdate(
      id,
      { nombre, telefono, correo },
      { new: true, runValidators: true }
    );

    if (!proveedor) {
      return res.status(404).json({ error: 'Proveedor no encontrado' });
    }

    res.json(proveedor);
  } catch (error) {
    console.error('Error al editar proveedor:', error);
    res.status(500).json({ error: 'Error al editar proveedor' });
  }
};
