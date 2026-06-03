const Venta = require('../models/Venta');
const DetalleVenta = require('../models/DetalleVenta');
const Producto = require('../models/Producto');
const { rangoDiaPeru, rangoMesPeru } = require('../utils/dateUtils');

/**
 * GET /api/reportes/ventas-dia?fecha=YYYY-MM-DD
 * Reporte de ventas completadas en una fecha específica (default: hoy).
 */
exports.ventasDia = async (req, res) => {
  try {
    const fechaInput = req.query.fecha ? new Date(req.query.fecha + 'T12:00:00') : null;
    const { inicio: inicioDia, fin: finDia } = rangoDiaPeru(fechaInput);

    const ventas = await Venta.find({
      estado: 'completada',
      fecha_venta: { $gte: inicioDia, $lte: finDia },
    });

    const total_ventas = ventas.length;
    const monto_total = parseFloat(ventas.reduce((s, v) => s + (v.total || 0), 0).toFixed(2));

    // Calcular ganancia y productos vendidos
    let costo_total = 0;
    let productos_vendidos = 0;

    const ventasIds = ventas.map(v => v._id);
    const detalles = await DetalleVenta.find({ venta_id: { $in: ventasIds } }).populate('producto_id');
    
    for (const detalle of detalles) {
      if (detalle.producto_id) {
        // Usar precio_compra del detalle si existe, sino usar el actual del producto
        const precioCompra = detalle.precio_compra ?? detalle.producto_id.precio_compra;
        costo_total += detalle.cantidad * precioCompra;
        productos_vendidos += detalle.cantidad;
      }
    }

    const ganancia_dia = parseFloat((monto_total - costo_total).toFixed(2));
    const ticket_promedio = total_ventas > 0 ? parseFloat((monto_total / total_ventas).toFixed(2)) : 0;

    // Desglose por método de pago
    const metodos = ['efectivo', 'tarjeta', 'yape', 'plin', 'transferencia'];
    const desglose_metodo_pago = {};
    for (const metodo of metodos) {
      const ventasMetodo = ventas.filter((v) => v.metodo_pago === metodo);
      desglose_metodo_pago[metodo] = {
        total_ventas: ventasMetodo.length,
        monto: parseFloat(ventasMetodo.reduce((s, v) => s + (v.total || 0), 0).toFixed(2)),
      };
    }

    // Alias para compatibilidad con el frontend
    const por_metodo_pago = {};
    for (const [metodo, datos] of Object.entries(desglose_metodo_pago)) {
      por_metodo_pago[metodo] = { count: datos.total_ventas, total: datos.monto };
    }

    res.json({ 
      total_ventas, 
      monto_total, 
      ganancia_dia,
      ticket_promedio,
      productos_vendidos,
      por_metodo_pago, 
      desglose_metodo_pago 
    });
  } catch (error) {
    console.error('Error en reporte ventas-dia:', error);
    res.status(500).json({ error: 'Error al generar reporte de ventas del día' });
  }
};

/**
 * GET /api/reportes/ventas-mes?mes=MM&anio=YYYY
 * Reporte de ventas completadas en un mes/año (default: mes y año actuales).
 */
exports.ventasMes = async (req, res) => {
  try {
    const ahora = new Date();
    const mes  = req.query.mes  ? parseInt(req.query.mes,  10) - 1 : ahora.getMonth();
    const anio = req.query.anio ? parseInt(req.query.anio, 10)     : ahora.getFullYear();

    // Validar rango de mes (0-11)
    if (mes < 0 || mes > 11) {
      return res.status(400).json({ error: 'El mes debe estar entre 1 y 12' });
    }

    const { inicio: inicioMes, fin: finMes } = rangoMesPeru(mes, anio);

    const ventas = await Venta.find({
      estado: 'completada',
      fecha_venta: { $gte: inicioMes, $lte: finMes },
    }).sort({ fecha_venta: 1 });

    const total_ventas = ventas.length;
    const monto_total = parseFloat(ventas.reduce((s, v) => s + (v.total || 0), 0).toFixed(2));

    // Calcular ganancia y productos vendidos
    let costo_total = 0;
    let productos_vendidos = 0;

    const ventasIds = ventas.map(v => v._id);
    const detalles = await DetalleVenta.find({ venta_id: { $in: ventasIds } }).populate('producto_id');
    
    for (const detalle of detalles) {
      if (detalle.producto_id) {
        // Usar precio_compra del detalle si existe, sino usar el actual del producto
        const precioCompra = detalle.precio_compra ?? detalle.producto_id.precio_compra;
        costo_total += detalle.cantidad * precioCompra;
        productos_vendidos += detalle.cantidad;
      }
    }

    const ganancia_mes = parseFloat((monto_total - costo_total).toFixed(2));
    const ticket_promedio = total_ventas > 0 ? parseFloat((monto_total / total_ventas).toFixed(2)) : 0;

    // Desglose diario
    const diasMap = {};
    for (const venta of ventas) {
      const d = venta.fecha_venta;
      const clave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!diasMap[clave]) {
        diasMap[clave] = { fecha: clave, total_ventas: 0, monto: 0 };
      }
      diasMap[clave].total_ventas += 1;
      diasMap[clave].monto += venta.total || 0;
    }

    const desglose_diario = Object.values(diasMap).map((d) => ({
      ...d,
      monto: parseFloat(d.monto.toFixed(2)),
      // Alias para compatibilidad con el frontend
      count: d.total_ventas,
      total: parseFloat(d.monto.toFixed(2)),
    }));

    res.json({ 
      total_ventas, 
      monto_total, 
      ganancia_mes,
      ticket_promedio,
      productos_vendidos,
      desglose_diario 
    });
  } catch (error) {
    console.error('Error en reporte ventas-mes:', error);
    res.status(500).json({ error: 'Error al generar reporte de ventas del mes' });
  }
};

/**
 * GET /api/reportes/productos-mas-vendidos?desde=YYYY-MM-DD&hasta=YYYY-MM-DD&page=1&limit=10&orderBy=cantidad|ingresos
 * Productos más vendidos en el período indicado con paginación.
 */
exports.productosMasVendidos = async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const orderBy = req.query.orderBy || 'cantidad'; // 'cantidad' o 'ingresos'

    // Construir filtro de ventas completadas en el período
    const filtroVenta = { estado: 'completada' };
    if (desde || hasta) {
      filtroVenta.fecha_venta = {};
      if (desde) filtroVenta.fecha_venta.$gte = new Date(desde);
      if (hasta) {
        const hastaFin = new Date(hasta);
        hastaFin.setHours(23, 59, 59, 999);
        filtroVenta.fecha_venta.$lte = hastaFin;
      }
    }

    // Obtener ventas completadas en el período
    const ventas = await Venta.find(filtroVenta);
    const ventasIds = ventas.map(v => v._id);

    // Calcular total real de ingresos (suma de totales de ventas)
    const total_ingresos_real = parseFloat(ventas.reduce((sum, v) => sum + v.total, 0).toFixed(2));

    // Agregar DetalleVenta por producto
    const sortField = orderBy === 'ingresos' ? 'ingresos' : 'cantidad_total';
    
    const resultado = await DetalleVenta.aggregate([
      { $match: { venta_id: { $in: ventasIds } } },
      {
        $group: {
          _id: '$producto_id',
          cantidad_total: { $sum: '$cantidad' },
          ingresos_brutos: { $sum: '$subtotal' }, // Ingresos sin descuento global
          // Usar precio_compra del detalle si existe, sino 0 (lo corregiremos después)
          costo_total: { 
            $sum: { 
              $multiply: [
                '$cantidad', 
                { $ifNull: ['$precio_compra', 0] }
              ] 
            } 
          },
        },
      },
      { $sort: { [sortField === 'ingresos' ? 'ingresos_brutos' : sortField]: -1 } },
      {
        $lookup: {
          from: 'productos',
          localField: '_id',
          foreignField: '_id',
          as: 'producto',
        },
      },
      { $unwind: { path: '$producto', preserveNullAndEmptyArrays: false } },
      {
        $project: {
          _id: 0,
          producto_id: '$_id',
          nombre: '$producto.nombre',
          cantidad_total: 1,
          total_vendido: '$cantidad_total',
          ingresos: '$ingresos_brutos',
          precio_compra_actual: '$producto.precio_compra',
          costo_total_detalle: '$costo_total',
          // Si costo_total es 0, usar precio_compra actual del producto
          costo_total: {
            $cond: {
              if: { $eq: ['$costo_total', 0] },
              then: { $multiply: ['$cantidad_total', '$producto.precio_compra'] },
              else: '$costo_total'
            }
          },
        },
      },
    ]);

    // Calcular totales generales usando el total real de las ventas
    const total_ingresos = total_ingresos_real;
    const total_unidades = resultado.reduce((sum, p) => sum + p.cantidad_total, 0);
    const total_costos = parseFloat(resultado.reduce((sum, p) => sum + p.costo_total, 0).toFixed(2));
    const ganancia_total = parseFloat((total_ingresos - total_costos).toFixed(2));
    const productos_unicos = resultado.length;

    const total = resultado.length;
    const productos = resultado.slice(skip, skip + limit);

    res.json({ 
      productos,
      resumen: {
        total_ingresos,
        total_unidades,
        ganancia_total,
        productos_unicos
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error en reporte productos-mas-vendidos:', error);
    res.status(500).json({ error: 'Error al generar reporte de productos más vendidos' });
  }
};

/**
 * GET /api/reportes/stock-valorizado?page=1&limit=20
 * Lista de productos activos con su valor de inventario (stock_actual × precio_compra).
 */
exports.stockValorizado = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const total = await Producto.countDocuments({ eliminado: false });
    const productos = await Producto.find({ eliminado: false })
      .select('nombre stock_actual precio_compra precio_venta estado')
      .skip(skip)
      .limit(limit);

    let total_inventario = 0;
    let total_potencial = 0;
    const lista = productos.map((p) => {
      const valor_total = parseFloat((p.stock_actual * p.precio_compra).toFixed(2));
      const valor_potencial = parseFloat((p.stock_actual * p.precio_venta).toFixed(2));
      total_inventario += valor_total;
      total_potencial += valor_potencial;
      return {
        nombre: p.nombre,
        stock_actual: p.stock_actual,
        precio_compra: p.precio_compra,
        precio_venta: p.precio_venta,
        valor_total,
        valor_potencial,
        estado: p.estado,
      };
    });

    // Calcular totales generales de inventario
    const todosProductos = await Producto.find({ eliminado: false }).select('stock_actual precio_compra precio_venta');
    const total_inventario_general = parseFloat(
      todosProductos.reduce((sum, p) => sum + (p.stock_actual * p.precio_compra), 0).toFixed(2)
    );
    const total_potencial_general = parseFloat(
      todosProductos.reduce((sum, p) => sum + (p.stock_actual * p.precio_venta), 0).toFixed(2)
    );
    const ganancia_potencial = parseFloat((total_potencial_general - total_inventario_general).toFixed(2));

    res.json({
      productos: lista,
      total_inventario: parseFloat(total_inventario.toFixed(2)),
      total_potencial: parseFloat(total_potencial.toFixed(2)),
      total_inventario_general,
      total_potencial_general,
      ganancia_potencial,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error en reporte stock-valorizado:', error);
    res.status(500).json({ error: 'Error al generar reporte de stock valorizado' });
  }
};
