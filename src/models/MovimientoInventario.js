const mongoose = require('mongoose');

const movimientoInventarioSchema = new mongoose.Schema(
  {
    producto_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Producto',
      required: true,
    },
    tipo: {
      type: String,
      enum: ['entrada', 'salida', 'ajuste', 'devolucion'],
      required: true,
    },
    cantidad: { type: Number, required: true },
    stock_anterior: { type: Number, required: true },
    stock_nuevo: { type: Number, required: true },
    referencia_id: { type: mongoose.Schema.Types.ObjectId, default: null }, // venta_id o pedido_id
    referencia_tipo: {
      type: String,
      enum: ['venta', 'pedido', 'ajuste', null],
      default: null,
    },
    usuario_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
    },
    notas: { type: String },
    fecha: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

// Índices
movimientoInventarioSchema.index({ producto_id: 1, fecha: -1 });
movimientoInventarioSchema.index({ referencia_id: 1 });

module.exports = mongoose.model('MovimientoInventario', movimientoInventarioSchema);
