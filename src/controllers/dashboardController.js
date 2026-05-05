const Venta = require('../models/Venta');
const Producto = require('../models/Producto');

/**
 * GET /api/dashboard
 * Retorna métricas del día actual: ventas completadas, ingresos, stock bajo y últimas ventas.
 */
exports.obtener = async (req, res) => {
  try {
    // Calcular inicio y fin del día actual (medianoche a medianoche)
    const ahora = new Date();
    const inicioDia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 0, 0, 0, 0);
    const finDia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 23, 59, 59, 999);

    // Consultar ventas completadas del día
    const ventasHoy = await Venta.find({
      estado: 'completada',
      fecha_venta: { $gte: inicioDia, $lte: finDia },
    });

    const total_ventas_dia = ventasHoy.length;
    const ingresos_dia = ventasHoy.reduce((suma, v) => suma + (v.total || 0), 0);

    // Productos con stock bajo (stock_actual <= stock_minimo, no eliminados)
    const stock_bajo = await Producto.find({
      $expr: { $lte: ['$stock_actual', '$stock_minimo'] },
      eliminado: false,
    }).populate('categoria_id', 'nombre');

    // Últimas 5 ventas completadas
    const ultimas_ventas = await Venta.find({ estado: 'completada' })
      .sort({ fecha_venta: -1 })
      .limit(5)
      .populate('cliente_id', 'nombre apellido_paterno')
      .populate('vendedor_id', 'nombre_completo');

    res.json({
      total_ventas_dia,
      ingresos_dia: parseFloat(ingresos_dia.toFixed(2)),
      stock_bajo,
      ultimas_ventas,
    });
  } catch (error) {
    console.error('Error al obtener dashboard:', error);
    res.status(500).json({ error: 'Error al obtener datos del dashboard' });
  }
};
