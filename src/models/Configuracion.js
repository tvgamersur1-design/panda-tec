const mongoose = require('mongoose');

const configuracionSchema = new mongoose.Schema(
  {
    nombre_tienda: { type: String, required: true },
    ruc: {
      type: String,
      required: true,
      match: [/^\d{11}$/, 'El RUC debe tener exactamente 11 dígitos numéricos'],
    },
    direccion: { type: String },
    telefono: { type: String },
    correo: { type: String },
    terminos: { type: String, default: 'No se aceptan devoluciones de dinero. Cualquier reclamo debe realizarse dentro de las 24 horas de la compra.' },
    mensaje_ticket: { type: String, default: '¡Gracias por su compra!' },
  },
  { timestamps: false }
);

// Colección singleton: siempre un solo documento

module.exports = mongoose.model('Configuracion', configuracionSchema);
