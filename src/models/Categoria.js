const mongoose = require('mongoose');

const categoriaSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, unique: true },
    descripcion: { type: String },
    activo: { type: Boolean, default: true },
  },
  { timestamps: false }
);

// El índice único en nombre ya se crea por unique:true en el schema.

module.exports = mongoose.model('Categoria', categoriaSchema);
