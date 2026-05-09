require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/config/db');
const { verificarConexion } = require('./src/config/mailer');

const PORT = process.env.PORT || 3000;

// Conectar a MongoDB y verificar configuración de email
connectDB().then(async () => {
  // Verificar configuración de email (no bloquea el inicio del servidor)
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    console.log('Verificando conexión SMTP...');
    await verificarConexion();
  } else {
    console.warn('⚠ Variables GMAIL_USER o GMAIL_APP_PASSWORD no configuradas. La recuperación de contraseña no funcionará.');
  }

  app.listen(PORT, () => {
    console.log(`Servidor Panta Tec corriendo en http://localhost:${PORT}`);
    console.log(`Entorno: ${process.env.NODE_ENV || 'development'}`);
  });
}).catch((err) => {
  console.error('Error al conectar a MongoDB:', err.message);
  process.exit(1);
});
