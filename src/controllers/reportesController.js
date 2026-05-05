const Venta = require('../models/Venta');
const DetalleVenta = require('../models/DetalleVenta');
const Producto = require('../models/Producto');

/**
 * GET /api/reportes/ventas-dia?fecha=YYYY-MM-DD
 * Reporte de ventas completadas en una fecha específica (default: hoy).
 */
exports.ventasDia = async (req, res) => {
  try {
    let fecha;
    if (req.query.fecha) {
      fecha = new Date(req.query.fecha);
    } else {
      fecha = new Date();
    }

    const inicioDia = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), 0, 0, 0, 0);
    const finDia = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), 23, 59, 59, 999);

    const ventas = await Venta.find({
      estado: 'completada',
      fecha_venta: { $gte: inicioDia, $lte: finDia },
    });

    const total_ventas = ventas.length;
    const monto_total = parseFloat(ventas.reduce((s, v) => s + (v.total || 0), 0).toFixed(2));

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

    res.json({ total_ventas, monto_total, desglose_metodo_pago });
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
    const mes = req.query.mes ? parseInt(req.query.mes, 10) - 1 : ahora.getMonth(); // 0-indexed
    const anio = req.query.anio ? parseInt(req.query.anio, 10) : ahora.getFullYear();

    const inicioMes = new Date(anio, mes, 1, 0, 0, 0, 0);
    const finMes = new Date(anio, mes + 1, 0, 23, 59, 59, 999); // último día del mes

    const ventas = await Venta.find({
      estado: 'completada',
      fecha_venta: { $gte: inicioMes, $lte: finMes },
    }).sort({ fecha_venta: 1 });

    const total_ventas = ventas.length;
    const monto_total = parseFloat(ventas.reduce((s, v) => s + (v.total || 0), 0).toFixed(2));

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
    }));

    res.json({ total_ventas, monto_total, desglose_diario });
  } catch (error) {
    console.error('Error en reporte ventas-mes:', error);
    res.status(500).json({ error: 'Error al generar reporte de ventas del mes' });
  }
};

/**
 * GET /api/reportes/productos-mas-vendidos?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
 * Top 10 productos más vendidos en el período indicado.
 */
exports.productosMasVendidos = async (req, res) => {
  try {
    const { desde, hasta } = req.query;

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

    // Obtener IDs de ventas completadas en el período
    const ventasIds = await Venta.find(filtroVenta).distinct('_id');

    // Agregar DetalleVenta por producto
    const resultado = await DetalleVenta.aggregate([
      { $match: { venta_id: { $in: ventasIds } } },
      {
        $group: {
          _id: '$producto_id',
          cantidad_total: { $sum: '$cantidad' },
        },
      },
      { $sort: { cantidad_total: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'productos',
          localField: '_id',
          foreignField: '_id',
          as: 'producto',
        },
      },
      { $unwind: { path: '$producto', preserveNullAndEmpty: false } },
      {
        $project: {
          _id: 0,
          producto_id: '$_id',
          nombre: '$producto.nombre',
          cantidad_total: 1,
        },
      },
    ]);

    res.json(resultado);
  } catch (error) {
    console.error('Error en reporte productos-mas-vendidos:', error);
    res.status(500).json({ error: 'Error al generar reporte de productos más vendidos' });
  }
};

/**
 * GET /api/reportes/stock-valorizado
 * Lista de productos activos con su valor de inventario (stock_actual × precio_compra).
 */
exports.stockValorizado = async (req, res) => {
  try {
    const productos = await Producto.find({ eliminado: false }).select(
      'nombre stock_actual precio_compra estado'
    );

    let total_inventario = 0;
    const lista = productos.map((p) => {
      const valor_total = parseFloat((p.stock_actual * p.precio_compra).toFixed(2));
      total_inventario += valor_total;
      return {
        nombre: p.nombre,
        stock_actual: p.stock_actual,
        precio_compra: p.precio_compra,
        valor_total,
        estado: p.estado,
      };
    });

    res.json({
      productos: lista,
      total_inventario: parseFloat(total_inventario.toFixed(2)),
    });
  } catch (error) {
    console.error('Error en reporte stock-valorizado:', error);
    res.status(500).json({ error: 'Error al generar reporte de stock valorizado' });
  }
};
