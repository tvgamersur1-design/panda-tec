const mongoose = require('mongoose');

/**
 * Conecta la aplicación a MongoDB Atlas usando la URI definida en MONGODB_URI.
 * Configura connection pool, timeouts y handlers de reconexión.
 */
async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('La variable de entorno MONGODB_URI no está definida.');
  }

  // ─── CONNECTION EVENT HANDLERS ────────────────────────────────────────────
  mongoose.connection.on('connected', () => {
    console.log('Mongoose: conexión a MongoDB establecida.');
  });

  mongoose.connection.on('error', (err) => {
    console.error('Mongoose: error de conexión:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('Mongoose: conexión a MongoDB perdida. Intentando reconexión...');
  });

  mongoose.connection.on('reconnected', () => {
    console.log('Mongoose: reconectado a MongoDB exitosamente.');
  });

  // ─── GRACEFUL SHUTDOWN ────────────────────────────────────────────────────
  const gracefulShutdown = async (signal) => {
    console.log(`\n${signal} recibido. Cerrando conexión a MongoDB...`);
    await mongoose.connection.close(false);
    console.log('Conexión a MongoDB cerrada.');
    process.exit(0);
  };

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  // ─── UNHANDLED ERRORS ─────────────────────────────────────────────────────
  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
  });

  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    gracefulShutdown('uncaughtException');
  });

  try {
    await mongoose.connect(uri, {
      maxPoolSize: parseInt(process.env.DB_POOL_SIZE, 10) || 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      appName: 'pantatec',
      retryWrites: true,
      w: 'majority',
    });
    console.log('Conectado a MongoDB Atlas correctamente.');
  } catch (error) {
    console.error('Error al conectar a MongoDB:', error.message);
    throw error;
  }
}

module.exports = connectDB;
