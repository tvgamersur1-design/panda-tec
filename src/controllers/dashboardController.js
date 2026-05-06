const Venta = require('../models/Venta');
const Producto = require('../models/Producto');

/**
 * GET /api/dashboard
 * Retorna métricas del día actual: ventas completadas, ingresos, stock bajo y últimas ventas.
 */
/**
 * Retorna inicio y fin del día en hora de Perú (UTC-5)
 * para una fecha dada (o hoy si no se pasa).
 */
function rangoDiaPerú(fecha) {
  // Offset Perú: UTC-5 = -300 minutos
  const OFFSET_MS = 5 * 60 * 60 * 1000;
  const base = fecha ? new Date(fecha) : new Date();
  // Convertir a "fecha local Perú"
  const localMs  = base.getTime() - OFFSET_MS;
  const localDate = new Date(localMs);
  const y = localDate.getUTCFullYear();
  const m = localDate.getUTCMonth();
  const d = localDate.getUTCDate();
  // Inicio y fin del día en UTC equivalente a medianoche Perú
  const inicio = new Date(Date.UTC(y, m, d, 0, 0, 0, 0) + OFFSET_MS);
  const fin    = new Date(Date.UTC(y, m, d, 23, 59, 59, 999) + OFFSET_MS);
  return { inicio, fin };
}

exports.obtener = async (req, res) => {
  try {
    const { inicio: inicioDia, fin: finDia } = rangoDiaPerú();

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
