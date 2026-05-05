const mongoose = require('mongoose');

/**
 * Conecta la aplicación a MongoDB Atlas usando la URI definida en MONGODB_URI.
 * Retorna la promesa de conexión para que server.js pueda esperar antes de arrancar.
 */
async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('La variable de entorno MONGODB_URI no está definida.');
  }

  try {
    await mongoose.connect(uri);
    console.log('Conectado a MongoDB Atlas correctamente.');
  } catch (error) {
    console.error('Error al conectar a MongoDB:', error.message);
    throw error;
  }
}

module.exports = connectDB;
