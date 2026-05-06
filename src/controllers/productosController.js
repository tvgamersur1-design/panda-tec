const Producto = require('../models/Producto');
const MovimientoInventario = require('../models/MovimientoInventario');

/**
 * GET /api/productos
 * Lista productos con filtros opcionales: ?categoria=<id>&search=<texto>&estado=<estado>
 * Excluye eliminado: true. Popula categoria_id con nombre.
 */
exports.listar = async (req, res) => {
  try {
    const { categoria, search, estado, page = 1, limit = 10 } = req.query;

    const filtro = { eliminado: false };
    if (categoria) filtro.categoria_id = categoria;
    if (estado)    filtro.estado = estado;
    if (search)    filtro.$text = { $search: search };

    const pageNum  = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip     = (pageNum - 1) * limitNum;

    const [productos, total] = await Promise.all([
      Producto.find(filtro)
        .populate('categoria_id', 'nombre')
        .sort({ nombre: 1 })
        .skip(skip)
        .limit(limitNum),
      Producto.countDocuments(filtro),
    ]);

    res.json({
      productos,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    console.error('Error en productosController.listar:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * POST /api/productos
 * Crea un nuevo producto.
 * Campos requeridos: nombre, precio_venta, precio_compra, categoria_id.
 * Si viene req.cloudinaryUrl: asignar a imagen.
 * Si stock_actual > 0: crear MovimientoInventario tipo ajuste.
 * Estado agotado si stock_actual === 0.
 */
exports.crear = async (req, res) => {
  try {
    const {
      nombre,
      descripcion,
      precio_venta,
      precio_compra,
      stock_actual,
      stock_minimo,
      categoria_id,
      estado,
    } = req.body;

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }
    if (precio_venta === undefined || precio_venta === null || precio_venta === '') {
      return res.status(400).json({ error: 'El precio de venta es requerido' });
    }
    if (precio_compra === undefined || precio_compra === null || precio_compra === '') {
      return res.status(400).json({ error: 'El precio de compra es requerido' });
    }
    if (!categoria_id) {
      return res.status(400).json({ error: 'La categoria es requerida' });
    }

    const stockInicial = parseInt(stock_actual) || 0;

    let estadoFinal = estado || 'activo';
    if (stockInicial === 0 && estadoFinal !== 'inactivo') {
      estadoFinal = 'agotado';
    }

    const datosProducto = {
      nombre: nombre.trim(),
      descripcion: descripcion ? descripcion.trim() : undefined,
      precio_venta: parseFloat(precio_venta),
      precio_compra: parseFloat(precio_compra),
      stock_actual: stockInicial,
      stock_minimo: parseInt(stock_minimo) || 0,
      categoria_id,
      estado: estadoFinal,
    };

    if (req.cloudinaryUrl) {
      datosProducto.imagen = req.cloudinaryUrl;
    }

    const producto = await Producto.create(datosProducto);

    if (stockInicial > 0) {
      await MovimientoInventario.create({
        producto_id: producto._id,
        tipo: 'ajuste',
        cantidad: stockInicial,
        stock_anterior: 0,
        stock_nuevo: stockInicial,
        referencia_tipo: 'ajuste',
        usuario_id: req.user.id,
        notas: 'Stock inicial al crear producto',
      });
    }

    const productoPopulado = await Producto.findById(producto._id).populate('categoria_id', 'nombre');
    res.status(201).json(productoPopulado);
  } catch (error) {
    console.error('Error en productosController.crear:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * GET /api/productos/:id
 * Retorna el detalle de un producto con categoria populada.
 * HTTP 404 si no existe o esta eliminado.
 */
exports.detalle = async (req, res) => {
  try {
    const { id } = req.params;

    const producto = await Producto.findOne({ _id: id, eliminado: false }).populate(
      'categoria_id',
      'nombre'
    );

    if (!producto) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json(producto);
  } catch (error) {
    console.error('Error en productosController.detalle:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * PUT /api/productos/:id
 * Actualiza campos del producto.
 * Si viene req.cloudinaryUrl: reemplaza imagen.
 * Si cambia stock_actual: crea MovimientoInventario tipo ajuste.
 * Recalcula estado: agotado si stock=0, activo si stock>0 (salvo inactivo explicito).
 */
exports.editar = async (req, res) => {
  try {
    const { id } = req.params;

    const producto = await Producto.findOne({ _id: id, eliminado: false });
    if (!producto) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const {
      nombre,
      descripcion,
      precio_venta,
      precio_compra,
      stock_actual,
      stock_minimo,
      categoria_id,
      estado,
    } = req.body;

    if (nombre !== undefined) producto.nombre = nombre.trim();
    if (descripcion !== undefined) producto.descripcion = descripcion;
    if (precio_venta !== undefined) producto.precio_venta = parseFloat(precio_venta);
    if (precio_compra !== undefined) producto.precio_compra = parseFloat(precio_compra);
    if (stock_minimo !== undefined) producto.stock_minimo = parseInt(stock_minimo);
    if (categoria_id !== undefined) producto.categoria_id = categoria_id;

    if (req.cloudinaryUrl) {
      producto.imagen = req.cloudinaryUrl;
    }

    if (stock_actual !== undefined) {
      const stockNuevo = parseInt(stock_actual);
      const stockAnterior = producto.stock_actual;

      if (stockNuevo !== stockAnterior) {
        await MovimientoInventario.create({
          producto_id: producto._id,
          tipo: 'ajuste',
          cantidad: Math.abs(stockNuevo - stockAnterior),
          stock_anterior: stockAnterior,
          stock_nuevo: stockNuevo,
          referencia_tipo: 'ajuste',
          usuario_id: req.user.id,
          notas: 'Ajuste de stock manual',
        });
      }

      producto.stock_actual = stockNuevo;
    }

    if (estado !== undefined) {
      producto.estado = estado;
    } else {
      if (producto.stock_actual === 0) {
        producto.estado = 'agotado';
      } else if (producto.stock_actual > 0 && producto.estado !== 'inactivo') {
        producto.estado = 'activo';
      }
    }

    producto.fecha_actualizacion = new Date();
    await producto.save();

    const productoActualizado = await Producto.findById(id).populate('categoria_id', 'nombre');
    res.json(productoActualizado);
  } catch (error) {
    console.error('Error en productosController.editar:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * DELETE /api/productos/:id
 * Soft delete: marca eliminado: true.
 */
exports.eliminar = async (req, res) => {
  try {
    const { id } = req.params;

    const producto = await Producto.findOne({ _id: id, eliminado: false });
    if (!producto) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    await Producto.findByIdAndUpdate(id, { eliminado: true, fecha_actualizacion: new Date() });
    res.json({ mensaje: 'Producto eliminado correctamente' });
  } catch (error) {
    console.error('Error en productosController.eliminar:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * GET /api/productos/stock-bajo
 * Retorna productos donde stock_actual <= stock_minimo y eliminado: false.
 */
exports.stockBajo = async (req, res) => {
  try {
    const productos = await Producto.find({
      eliminado: false,
      $expr: { $lte: ['$stock_actual', '$stock_minimo'] },
    })
      .populate('categoria_id', 'nombre')
      .sort({ stock_actual: 1 });

    res.json(productos);
  } catch (error) {
    console.error('Error en productosController.stockBajo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};
