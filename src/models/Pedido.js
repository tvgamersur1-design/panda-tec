const mongoose = require('mongoose');

const pedidoSchema = new mongoose.Schema(
  {
    proveedor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Proveedor',
      required: true,
    },
    items: [
      {
        producto_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Producto',
          required: true,
        },
        cantidad: { type: Number, required: true, min: 1 },
      },
    ],
    estado: {
      type: String,
      enum: ['pendiente', 'recibido'],
      default: 'pendiente',
    },
    usuario_creacion_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
    },
    usuario_recepcion_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      default: null,
    },
    fecha_creacion: { type: Date, default: Date.now },
    fecha_recepcion: { type: Date },
  },
  { timestamps: false }
);

// Índices
pedidoSchema.index({ proveedor_id: 1 });
pedidoSchema.index({ estado: 1 });

module.exports = mongoose.model('Pedido', pedidoSchema);
