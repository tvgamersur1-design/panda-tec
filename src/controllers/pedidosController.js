const mongoose = require('mongoose');
const Pedido = require('../models/Pedido');
const Producto = require('../models/Producto');
const MovimientoInventario = require('../models/MovimientoInventario');

/**
 * GET /api/pedidos?estado=&proveedor_id=
 * Listar pedidos con filtros opcionales, populando proveedor e items.
 */
exports.listar = async (req, res) => {
  try {
    const { estado, proveedor_id, page = 1, limit = 20 } = req.query;

    const filtro = {};
    if (estado) filtro.estado = estado;
    if (proveedor_id) filtro.proveedor_id = proveedor_id;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [pedidos, total] = await Promise.all([
      Pedido.find(filtro)
        .populate('proveedor_id', 'nombre')
        .populate('items.producto_id', 'nombre precio_venta')
        .sort({ fecha_creacion: -1 })
        .skip(skip)
        .limit(limitNum),
      Pedido.countDocuments(filtro),
    ]);

    res.json({
      pedidos,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    console.error('Error al listar pedidos:', error);
    res.status(500).json({ error: 'Error al listar pedidos' });
  }
};

/**
 * POST /api/pedidos
 * Crear un nuevo pedido.
 * Body: { proveedor_id, items: [{ producto_id, cantidad }] }
 */
exports.crear = async (req, res) => {
  try {
    const { proveedor_id, items } = req.body;

    if (!proveedor_id) {
      return res.status(400).json({ error: 'El campo proveedor_id es obligatorio' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Debe incluir al menos un ítem en el pedido' });
    }

    const pedido = await Pedido.create({
      proveedor_id,
      items,
      estado: 'pendiente',
      fecha_creacion: new Date(),
      usuario_creacion_id: req.user.id,
    });

    res.status(201).json(pedido);
  } catch (error) {
    console.error('Error al crear pedido:', error);
    res.status(500).json({ error: 'Error al crear pedido' });
  }
};

/**
 * PUT /api/pedidos/:id/recibir
 * Marcar un pedido como recibido (operación atómica con sesión MongoDB).
 * Incrementa stock de cada producto y crea MovimientoInventario tipo 'entrada'.
 */
exports.recibir = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { id } = req.params;

    // Iniciar transacción ANTES de cualquier validación (fix TOCTOU)
    session.startTransaction();

    // Recargar el pedido DENTRO de la transacción con lock
    const pedido = await Pedido.findById(id).session(session);

    if (!pedido) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    if (pedido.estado === 'recibido') {
      await session.abortTransaction();
      session.endSession();
      return res.status(409).json({ error: 'El pedido ya fue recibido' });
    }

    // Procesar cada ítem: incrementar stock y crear movimiento
    const productosNoEncontrados = [];
    for (const item of pedido.items) {
      const producto = await Producto.findById(item.producto_id).session(session);

      if (!producto) {
        productosNoEncontrados.push(item.producto_id);
        continue;
      }

      const stockAnterior = producto.stock_actual;
      const stockNuevo = stockAnterior + item.cantidad;

      // Si estaba agotado y ahora tiene stock → cambiar a activo
      const nuevoEstado =
        producto.estado === 'agotado' && stockNuevo > 0 ? 'activo' : producto.estado;

      await Producto.findByIdAndUpdate(
        producto._id,
        { stock_actual: stockNuevo, estado: nuevoEstado },
        { session }
      );

      // Crear MovimientoInventario tipo 'entrada'
      await MovimientoInventario.create(
        [
          {
            producto_id: producto._id,
            tipo: 'entrada',
            cantidad: item.cantidad,
            stock_anterior: stockAnterior,
            stock_nuevo: stockNuevo,
            referencia_id: pedido._id,
            referencia_tipo: 'pedido',
            usuario_id: req.user.id,
            notas: `Recepción de pedido ${pedido._id}`,
          },
        ],
        { session }
      );
    }

    // Si hubo productos no encontrados, abortar la transacción
    if (productosNoEncontrados.length > 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        error: `Productos no encontrados: ${productosNoEncontrados.join(', ')}`,
      });
    }

    // Actualizar pedido: estado='recibido', fecha_recepcion, usuario_recepcion_id
    const pedidoActualizado = await Pedido.findByIdAndUpdate(
      id,
      {
        estado: 'recibido',
        fecha_recepcion: new Date(),
        usuario_recepcion_id: req.user.id,
      },
      { new: true, session }
    )
      .populate('proveedor_id', 'nombre')
      .populate('items.producto_id', 'nombre precio_venta');

    await session.commitTransaction();
    session.endSession();

    res.json(pedidoActualizado);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error al recibir pedido:', error);
    res.status(500).json({ error: 'Error al recibir pedido' });
  }
};
