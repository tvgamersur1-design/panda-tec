const Categoria = require('../models/Categoria');
const Producto = require('../models/Producto');

/**
 * GET /api/categorias
 * Retorna todas las categorías con activo: true, ordenadas por nombre.
 */
exports.listar = async (req, res) => {
  try {
    const categorias = await Categoria.find({ activo: true }).sort({ nombre: 1 });
    res.json(categorias);
  } catch (error) {
    console.error('Error en categoriasController.listar:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * POST /api/categorias
 * Crea una nueva categoría.
 * Valida nombre requerido y unicidad (case-insensitive).
 */
exports.crear = async (req, res) => {
  try {
    const { nombre, descripcion } = req.body;

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }

    // Verificar duplicado (case-insensitive)
    const existe = await Categoria.findOne({
      nombre: { $regex: new RegExp(`^${nombre.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    });

    if (existe) {
      return res.status(409).json({ error: 'Ya existe una categoría con ese nombre' });
    }

    const categoria = await Categoria.create({
      nombre: nombre.trim(),
      descripcion: descripcion ? descripcion.trim() : undefined,
    });

    res.status(201).json(categoria);
  } catch (error) {
    console.error('Error en categoriasController.crear:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * PUT /api/categorias/:id
 * Actualiza nombre y/o descripción de una categoría.
 * Si el nuevo nombre ya existe en otra categoría retorna HTTP 409.
 */
exports.editar = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion } = req.body;

    const categoria = await Categoria.findById(id);
    if (!categoria) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    // Si se envía nombre, verificar que no exista en otra categoría
    if (nombre && nombre.trim()) {
      const existe = await Categoria.findOne({
        _id: { $ne: id },
        nombre: { $regex: new RegExp(`^${nombre.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      });

      if (existe) {
        return res.status(409).json({ error: 'Ya existe una categoría con ese nombre' });
      }

      categoria.nombre = nombre.trim();
    }

    if (descripcion !== undefined) {
      categoria.descripcion = descripcion ? descripcion.trim() : '';
    }

    await categoria.save();
    res.json(categoria);
  } catch (error) {
    console.error('Error en categoriasController.editar:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * DELETE /api/categorias/:id
 * Elimina una categoría (hard delete).
 * Verifica que no haya productos activos con esa categoria_id.
 */
exports.eliminar = async (req, res) => {
  try {
    const { id } = req.params;

    const categoria = await Categoria.findById(id);
    if (!categoria) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    // Verificar que no haya productos asociados (no eliminados)
    const productosAsociados = await Producto.countDocuments({
      categoria_id: id,
      eliminado: false,
    });

    if (productosAsociados > 0) {
      return res.status(409).json({
        error: 'No se puede eliminar: la categoría tiene productos asociados',
      });
    }

    await Categoria.findByIdAndDelete(id);
    res.json({ mensaje: 'Categoría eliminada correctamente' });
  } catch (error) {
    console.error('Error en categoriasController.eliminar:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};
