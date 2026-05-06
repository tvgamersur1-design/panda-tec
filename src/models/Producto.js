const mongoose = require('mongoose');

const productoSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true },
    descripcion: { type: String },
    precio_venta: { type: Number, required: true, min: 0 },
    precio_compra: { type: Number, required: true, min: 0 },
    stock_actual: { type: Number, required: true, min: 0, default: 0 },
    stock_minimo: { type: Number, default: 0, min: 0 },
    categoria_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Categoria',
      required: true,
    },
    imagen: { type: String }, // URL Cloudinary
    estado: {
      type: String,
      enum: ['activo', 'inactivo', 'agotado'],
      default: 'activo',
    },
    eliminado: { type: Boolean, default: false },
    fecha_creacion: { type: Date, default: Date.now },
    fecha_actualizacion: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

// Actualizar fecha_actualizacion en cada update
productoSchema.pre('findOneAndUpdate', function (next) {
  this.set({ fecha_actualizacion: new Date() });
  next();
});

// Índices optimizados para búsqueda rápida
productoSchema.index({ nombre: 1 }); // Índice regular para búsquedas con regex
productoSchema.index({ categoria_id: 1 });
productoSchema.index({ estado: 1 });
productoSchema.index({ stock_actual: 1 });
productoSchema.index({ eliminado: 1, nombre: 1 }); // Índice compuesto para filtrar eliminados + buscar

module.exports = mongoose.model('Producto', productoSchema);
