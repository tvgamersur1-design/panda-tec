const mongoose = require('mongoose');

const clienteSchema = new mongoose.Schema(
  {
    dni: {
      type: String,
      required: true,
      unique: true,
      match: [/^\d{8}$/, 'El DNI debe tener exactamente 8 dígitos numéricos'],
    },
    telefono: { type: String, required: true },
    nombre: { type: String },
    apellido_paterno: { type: String },
    apellido_materno: { type: String },
    email: { type: String },
    direccion: { type: String },
    eliminado: { type: Boolean, default: false },
    fecha_creacion: { type: Date, default: Date.now },
    fecha_actualizacion: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

// Actualizar fecha_actualizacion en cada update
clienteSchema.pre('findOneAndUpdate', function (next) {
  this.set({ fecha_actualizacion: new Date() });
  next();
});

// Índices
// dni ya tiene índice único por unique:true en el schema
clienteSchema.index({ nombre: 'text', apellido_paterno: 'text' });

module.exports = mongoose.model('Cliente', clienteSchema);
