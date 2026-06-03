const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const usuarioSchema = new mongoose.Schema(
  {
    nombre_completo: { type: String, required: true },
    usuario: { type: String, required: true, unique: true },
    correo: { type: String, required: true, unique: true },
    clave: { type: String, required: true }, // bcryptjs hash, cost 10
    rol: {
      type: String,
      enum: ['admin', 'vendedor', 'almacen'],
      required: true,
    },
    activo: { type: Boolean, default: true },
    eliminado: { type: Boolean, default: false },
    foto: { type: String, default: null },
    google_id: { type: String, default: null },
    email_verificado: { type: Boolean, default: false },
    codigo_recuperacion: { type: String, default: null },
    codigo_expiracion: { type: Date, default: null },
    intentos_codigo: { type: Number, default: 0 }, // Contador de intentos fallidos
    codigo_bloqueado_hasta: { type: Date, default: null }, // Bloqueo temporal
    ultima_solicitud_codigo: { type: Date, default: null }, // Última vez que pidió código
    fecha_creacion: { type: Date, default: Date.now },
    fecha_actualizacion: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

// Hash de contraseña antes de guardar
usuarioSchema.pre('save', async function (next) {
  if (!this.isModified('clave')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.clave = await bcrypt.hash(this.clave, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Actualizar fecha_actualizacion en cada update
usuarioSchema.pre('findOneAndUpdate', function (next) {
  this.set({ fecha_actualizacion: new Date() });
  next();
});

// Los índices únicos en usuario y correo ya se crean por unique:true en el schema.
// Se declaran explícitamente aquí solo para documentación; Mongoose los deduplicará.
// usuarioSchema.index({ usuario: 1 }, { unique: true });
// usuarioSchema.index({ correo: 1 }, { unique: true });

module.exports = mongoose.model('Usuario', usuarioSchema);
