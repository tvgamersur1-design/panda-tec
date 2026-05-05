/**
 * scripts/seed-admin.js
 * Crea el usuario administrador inicial en MongoDB.
 * Uso: node scripts/seed-admin.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Usuario = require('../src/models/Usuario');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Conectado a MongoDB Atlas.');

  const existe = await Usuario.findOne({ usuario: 'admin' });
  if (existe) {
    console.log('El usuario admin ya existe. Nada que hacer.');
    return;
  }

  await Usuario.create({
    nombre_completo: 'Administrador',
    usuario: 'admin',
    correo: 'admin@pantatec.com',
    clave: 'Admin2026!',   // ← cámbiala después de entrar
    rol: 'admin',
    activo: true,
  });

  console.log('✅ Usuario admin creado.');
  console.log('   Usuario: admin');
  console.log('   Clave:   Admin2026!');
  console.log('   ⚠ Cámbiala desde el módulo de Usuarios después de entrar.');
}

main()
  .catch(e => { console.error('Error:', e.message); process.exit(1); })
  .finally(() => mongoose.disconnect());
