const mongoose = require('mongoose');

const ventaSchema = new mongoose.Schema(
  {
    numero_venta: { type: String, unique: true }, // 'V-2026-001'
    cliente_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente', default: null }, // null = Público general
    vendedor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
    },
    metodo_pago: {
      type: String,
      enum: ['efectivo', 'tarjeta', 'yape', 'plin', 'transferencia'],
      required: true,
    },
    subtotal: { type: Number, required: true },
    descuento_tipo: {
      type: String,
      enum: ['porcentaje', 'monto_fijo', null],
      default: null,
    },
    descuento_valor: { type: Number, default: 0 },
    descuento_total: { type: Number, default: 0 },
    total: { type: Number, required: true },
    monto_recibido: { type: Number },
    vuelto: { type: Number },
    estado: {
      type: String,
      enum: ['completada', 'anulada'],
      default: 'completada',
    },
    motivo_anulacion: { type: String },
    fecha_anulacion: { type: Date },
    notas: { type: String },
    fecha_venta: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

// Índices
// numero_venta ya tiene índice único por unique:true en el schema
ventaSchema.index({ cliente_id: 1 });
ventaSchema.index({ vendedor_id: 1 });
ventaSchema.index({ fecha_venta: -1 });
ventaSchema.index({ estado: 1 });

module.exports = mongoose.model('Venta', ventaSchema);
