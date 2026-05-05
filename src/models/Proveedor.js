const mongoose = require('mongoose');

const proveedorSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true },
    telefono: { type: String, required: true },
    correo: { type: String, required: true },
    activo: { type: Boolean, default: true },
    fecha_creacion: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

module.exports = mongoose.model('Proveedor', proveedorSchema);
