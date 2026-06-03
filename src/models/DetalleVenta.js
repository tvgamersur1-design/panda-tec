const mongoose = require('mongoose');

const detalleVentaSchema = new mongoose.Schema(
  {
    venta_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Venta',
      required: true,
    },
    producto_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Producto',
      required: true,
    },
    cantidad: { type: Number, required: true, min: 1 },
    precio_unitario: { type: Number, required: true, min: 0 },
    precio_compra: { type: Number, required: true, min: 0 },
    descuento_item: { type: Number, default: 0, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
  },
  { timestamps: false }
);

// Índices
detalleVentaSchema.index({ venta_id: 1 });
detalleVentaSchema.index({ producto_id: 1 });

module.exports = mongoose.model('DetalleVenta', detalleVentaSchema);
