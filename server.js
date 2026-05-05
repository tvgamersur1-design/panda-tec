require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/config/db');

const PORT = process.env.PORT || 3000;

// Conectar a MongoDB y luego arrancar el servidor
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Servidor Panta Tec corriendo en http://localhost:${PORT}`);
    console.log(`Entorno: ${process.env.NODE_ENV || 'development'}`);
  });
}).catch((err) => {
  console.error('Error al conectar a MongoDB:', err.message);
  process.exit(1);
});
