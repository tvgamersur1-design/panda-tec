const mongoose = require('mongoose');
const Venta = require('../models/Venta');
const DetalleVenta = require('../models/DetalleVenta');
const Producto = require('../models/Producto');
const MovimientoInventario = require('../models/MovimientoInventario');
const Cliente = require('../models/Cliente');

/**
 * GET /api/ventas?desde=&hasta=&estado=&metodo_pago=
 * Listar ventas con filtros opcionales, populando cliente y vendedor.
 */
exports.listar = async (req, res) => {
  try {
    const { desde, hasta, estado, metodo_pago, page = 1, limit = 20 } = req.query;

    const filtro = {};

    if (desde || hasta) {
      filtro.fecha_venta = {};
      if (desde) filtro.fecha_venta.$gte = new Date(desde);
      if (hasta) {
        const hastaFin = new Date(hasta);
        hastaFin.setHours(23, 59, 59, 999);
        filtro.fecha_venta.$lte = hastaFin;
      }
    }

    if (estado) filtro.estado = estado;
    if (metodo_pago) filtro.metodo_pago = metodo_pago;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [ventas, total] = await Promise.all([
      Venta.find(filtro)
        .populate('cliente_id', 'nombre apellido_paterno dni')
        .populate('vendedor_id', 'nombre_completo usuario')
        .sort({ fecha_venta: -1 })
        .skip(skip)
        .limit(limitNum),
      Venta.countDocuments(filtro),
    ]);

    res.json({
      ventas,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    console.error('Error al listar ventas:', error);
    res.status(500).json({ error: 'Error al listar ventas' });
  }
};

/**
 * POST /api/ventas
 * Registrar una venta nueva con operación atómica (transacción MongoDB).
 *
 * Body: {
 *   items: [{ producto_id, cantidad, descuento_item? }],
 *   metodo_pago,
 *   cliente_id?,
 *   descuento_tipo?,
 *   descuento_valor?,
 *   monto_recibido?,
 *   notas?
 * }
 */
exports.crear = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      items,
      metodo_pago,
      cliente_id = null,
      cliente_nuevo = null,   // { dni, nombre, apellido_paterno, apellido_materno, telefono? }
      descuento_tipo = null,
      descuento_valor = 0,
      monto_recibido,
      notas,
    } = req.body;

    // Validaciones básicas
    if (!items || !Array.isArray(items) || items.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: 'Debe incluir al menos un ítem en la venta' });
    }

    if (!metodo_pago) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: 'El método de pago es obligatorio' });
    }

    // Verificar stock de cada producto y recopilar datos
    const productosData = [];
    for (const item of items) {
      // Validar que cantidad sea un entero positivo
      if (!item.producto_id || !Number.isInteger(item.cantidad) || item.cantidad < 1) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          error: `Ítem inválido: cantidad debe ser un entero positivo para el producto ${item.producto_id || 'desconocido'}`,
        });
      }

      const producto = await Producto.findOne({
        _id: item.producto_id,
        eliminado: false,
      }).session(session);

      if (!producto) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ error: `Producto no encontrado: ${item.producto_id}` });
      }

      if (producto.stock_actual < item.cantidad) {
        await session.abortTransaction();
        session.endSession();
        return res.status(409).json({
          error: `Stock insuficiente para: ${producto.nombre}`,
        });
      }

      productosData.push({ producto, cantidad: item.cantidad, descuento_item: item.descuento_item || 0 });
    }

    // Calcular subtotal
    let subtotal = 0;
    for (const { producto, cantidad, descuento_item } of productosData) {
      const subtotalItem = parseFloat(
        (producto.precio_venta * cantidad - descuento_item).toFixed(2)
      );
      subtotal += subtotalItem;
    }
    subtotal = parseFloat(subtotal.toFixed(2));

    // Calcular descuento total
    let descuento_total = 0;
    if (descuento_tipo === 'porcentaje') {
      descuento_total = parseFloat((subtotal * (descuento_valor / 100)).toFixed(2));
    } else if (descuento_tipo === 'monto_fijo') {
      descuento_total = parseFloat(Math.min(descuento_valor, subtotal).toFixed(2));
    }

    const total = parseFloat((subtotal - descuento_total).toFixed(2));

    // Calcular vuelto si aplica
    let vuelto = null;
    if (metodo_pago === 'efectivo' && monto_recibido != null) {
      vuelto = parseFloat((monto_recibido - total).toFixed(2));
    }

    // Generar numero_venta: V-YYYY-NNN
    const anioActual = new Date().getFullYear();
    const prefijo = `V-${anioActual}-`;
    const ultimaVenta = await Venta.findOne({
      numero_venta: { $regex: `^${prefijo}` },
    })
      .sort({ numero_venta: -1 })
      .session(session);

    let secuencia = 1;
    if (ultimaVenta && ultimaVenta.numero_venta) {
      const partes = ultimaVenta.numero_venta.split('-');
      const ultimoNum = parseInt(partes[partes.length - 1], 10);
      if (!isNaN(ultimoNum)) secuencia = ultimoNum + 1;
    }
    const numero_venta = `${prefijo}${String(secuencia).padStart(3, '0')}`;

    // Si viene cliente_nuevo, crearlo dentro de la transacción
    let clienteIdFinal = cliente_id || null;
    if (!clienteIdFinal && cliente_nuevo && cliente_nuevo.dni) {
      // Verificar si ya existe (puede haberse creado en otra venta simultánea)
      const existente = await Cliente.findOne({ dni: cliente_nuevo.dni }).session(session);
      if (existente) {
        clienteIdFinal = existente._id;
      } else {
        const [nuevoCliente] = await Cliente.create(
          [{ 
            dni: cliente_nuevo.dni,
            nombre: cliente_nuevo.nombre || '',
            apellido_paterno: cliente_nuevo.apellido_paterno || '',
            apellido_materno: cliente_nuevo.apellido_materno || '',
            telefono: cliente_nuevo.telefono || '000000000',
          }],
          { session }
        );
        clienteIdFinal = nuevoCliente._id;
      }
    }

    // Crear documento Venta
    const [venta] = await Venta.create(
      [
        {
          numero_venta,
          cliente_id: clienteIdFinal,
          vendedor_id: req.user.id,
          metodo_pago,
          subtotal,
          descuento_tipo,
          descuento_valor,
          descuento_total,
          total,
          monto_recibido: monto_recibido != null ? monto_recibido : undefined,
          vuelto: vuelto != null ? vuelto : undefined,
          notas,
          estado: 'completada',
        },
      ],
      { session }
    );

    // Crear DetalleVenta y actualizar stock por cada ítem
    const detalles = [];
    for (const { producto, cantidad, descuento_item } of productosData) {
      const precio_unitario = producto.precio_venta;
      const precio_compra = producto.precio_compra; // Guardar precio_compra histórico
      const subtotalItem = parseFloat((precio_unitario * cantidad - descuento_item).toFixed(2));

      const [detalle] = await DetalleVenta.create(
        [
          {
            venta_id: venta._id,
            producto_id: producto._id,
            cantidad,
            precio_unitario,
            precio_compra, // Agregar precio_compra al detalle
            descuento_item,
            subtotal: subtotalItem,
          },
        ],
        { session }
      );
      detalles.push(detalle);

      // Decrementar stock
      const stockAnterior = producto.stock_actual;
      const stockNuevo = stockAnterior - cantidad;
      const nuevoEstado = stockNuevo === 0 ? 'agotado' : producto.estado === 'agotado' ? 'activo' : producto.estado;

      await Producto.findByIdAndUpdate(
        producto._id,
        { stock_actual: stockNuevo, estado: nuevoEstado },
        { session }
      );

      // Crear MovimientoInventario tipo 'salida'
      await MovimientoInventario.create(
        [
          {
            producto_id: producto._id,
            tipo: 'salida',
            cantidad,
            stock_anterior: stockAnterior,
            stock_nuevo: stockNuevo,
            referencia_id: venta._id,
            referencia_tipo: 'venta',
            usuario_id: req.user.id,
            notas: `Venta ${numero_venta}`,
          },
        ],
        { session }
      );
    }

    await session.commitTransaction();
    session.endSession();

    // Enriquecer detalles con nombre del producto para el ticket
    const detallesConNombre = detalles.map((d, i) => ({
      ...d.toObject(),
      nombre: productosData[i]?.producto?.nombre || '',
    }));

    res.status(201).json({ venta, detalles: detallesConNombre });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error al crear venta:', error);
    res.status(500).json({ error: 'Error al registrar la venta' });
  }
};

/**
 * GET /api/ventas/:id
 * Detalle de una venta con sus DetalleVenta populados.
 */
exports.detalle = async (req, res) => {
  try {
    const { id } = req.params;

    const venta = await Venta.findById(id)
      .populate('cliente_id', 'nombre apellido_paterno dni telefono')
      .populate('vendedor_id', 'nombre_completo usuario');

    if (!venta) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }

    const detalles = await DetalleVenta.find({ venta_id: venta._id }).populate(
      'producto_id',
      'nombre precio_venta'
    );

    res.json({ venta, detalles });
  } catch (error) {
    console.error('Error al obtener detalle de venta:', error);
    res.status(500).json({ error: 'Error al obtener detalle de venta' });
  }
};

/**
 * PUT /api/ventas/:id/anular
 * Anular una venta (solo admin). Restaura stock y crea movimientos de devolución.
 */
exports.anular = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { motivo } = req.body;

    if (!motivo || !motivo.trim()) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: 'El motivo de anulación es obligatorio' });
    }

    const venta = await Venta.findById(id).session(session);

    if (!venta) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: 'Venta no encontrada' });
    }

    if (venta.estado === 'anulada') {
      await session.abortTransaction();
      session.endSession();
      return res.status(409).json({ error: 'La venta ya fue anulada' });
    }

    if (venta.estado !== 'completada') {
      await session.abortTransaction();
      session.endSession();
      return res.status(409).json({ error: 'Solo se pueden anular ventas con estado completada' });
    }

    // Actualizar estado de la venta
    venta.estado = 'anulada';
    venta.motivo_anulacion = motivo.trim();
    venta.fecha_anulacion = new Date();
    await venta.save({ session });

    // Restaurar stock de cada producto
    const detalles = await DetalleVenta.find({ venta_id: venta._id }).session(session);

    for (const detalle of detalles) {
      const producto = await Producto.findById(detalle.producto_id).session(session);
      if (!producto) continue;

      const stockAnterior = producto.stock_actual;
      const stockNuevo = stockAnterior + detalle.cantidad;
      // Si el producto estaba agotado y ahora tiene stock, volver a activo
      const nuevoEstado = producto.estado === 'agotado' && stockNuevo > 0 ? 'activo' : producto.estado;

      await Producto.findByIdAndUpdate(
        producto._id,
        { stock_actual: stockNuevo, estado: nuevoEstado },
        { session }
      );

      // Crear MovimientoInventario tipo 'devolucion'
      await MovimientoInventario.create(
        [
          {
            producto_id: producto._id,
            tipo: 'devolucion',
            cantidad: detalle.cantidad,
            stock_anterior: stockAnterior,
            stock_nuevo: stockNuevo,
            referencia_id: venta._id,
            referencia_tipo: 'venta',
            usuario_id: req.user.id,
            notas: `Anulación venta ${venta.numero_venta}: ${motivo.trim()}`,
          },
        ],
        { session }
      );
    }

    await session.commitTransaction();
    session.endSession();

    // Retornar venta actualizada con populate
    const ventaActualizada = await Venta.findById(id)
      .populate('cliente_id', 'nombre apellido_paterno dni')
      .populate('vendedor_id', 'nombre_completo usuario');

    res.json(ventaActualizada);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error al anular venta:', error);
    res.status(500).json({ error: 'Error al anular la venta' });
  }
};
