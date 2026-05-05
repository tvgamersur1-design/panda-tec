const mongoose = require('mongoose');

const loginAttemptSchema = new mongoose.Schema(
  {
    ip: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

// Índice TTL: los documentos expiran automáticamente a los 900 segundos (15 minutos)
loginAttemptSchema.index({ timestamp: 1 }, { expireAfterSeconds: 900 });

module.exports = mongoose.model('LoginAttempt', loginAttemptSchema);
