/**
 * Script para limpiar bloqueos de recuperación de contraseña
 * 
 * Limpia:
 * - codigo_bloqueado_hasta (desbloquea usuarios)
 * - intentos_codigo (resetea contador)
 * - ultima_solicitud_codigo (permite nuevas solicitudes)
 * - codigo_recuperacion (limpia códigos activos)
 * - codigo_expiracion (limpia expiraciones)
 * 
 * Uso: node scripts/limpiar-bloqueos.js [correo]
 * 
 * Ejemplos:
 *   node scripts/limpiar-bloqueos.js                    # Limpia TODOS los usuarios
 *   node scripts/limpiar-bloqueos.js jesus@mail.com     # Limpia solo ese correo
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Usuario = require('../src/models/Usuario');

async function limpiarBloqueos() {
  try {
    console.log('🔄 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Conectado a MongoDB\n');

    // Obtener correo del argumento (si existe)
    const correoEspecifico = process.argv[2];

    let filtro = {};
    if (correoEspecifico) {
      filtro = { correo: correoEspecifico };
      console.log(`🎯 Limpiando bloqueos solo para: ${correoEspecifico}\n`);
    } else {
      console.log('🧹 Limpiando bloqueos de TODOS los usuarios\n');
    }

    // Mostrar usuarios bloqueados antes de limpiar
    const usuariosBloqueados = await Usuario.find({
      ...filtro,
      $or: [
        { codigo_bloqueado_hasta: { $ne: null } },
        { intentos_codigo: { $gt: 0 } },
        { codigo_recuperacion: { $ne: null } }
      ]
    }).select('usuario correo intentos_codigo codigo_bloqueado_hasta codigo_recuperacion');

    if (usuariosBloqueados.length === 0) {
      console.log('✓ No hay usuarios bloqueados o con códigos activos');
      process.exit(0);
    }

    console.log('📋 Usuarios a limpiar:');
    usuariosBloqueados.forEach(u => {
      console.log(`  - ${u.usuario} (${u.correo})`);
      console.log(`    Intentos: ${u.intentos_codigo || 0}`);
      console.log(`    Bloqueado hasta: ${u.codigo_bloqueado_hasta || 'No bloqueado'}`);
      console.log(`    Código activo: ${u.codigo_recuperacion ? 'Sí' : 'No'}`);
      console.log('');
    });

    // Limpiar bloqueos
    const resultado = await Usuario.updateMany(
      filtro,
      {
        $set: {
          intentos_codigo: 0,
          codigo_bloqueado_hasta: null,
          ultima_solicitud_codigo: null,
          codigo_recuperacion: null,
          codigo_expiracion: null
        }
      }
    );

    console.log(`✅ Bloqueos limpiados exitosamente`);
    console.log(`   Usuarios actualizados: ${resultado.modifiedCount}`);
    console.log(`   Usuarios encontrados: ${resultado.matchedCount}\n`);

    // Verificar limpieza
    const usuariosLimpios = await Usuario.find(filtro).limit(3).select('usuario intentos_codigo codigo_bloqueado_hasta');
    console.log('📋 Verificación (muestra):');
    usuariosLimpios.forEach(u => {
      console.log(`  - ${u.usuario}: intentos=${u.intentos_codigo}, bloqueado=${u.codigo_bloqueado_hasta}`);
    });

    console.log('\n✅ Limpieza completada. Ahora puedes hacer nuevas pruebas.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al limpiar bloqueos:', error);
    process.exit(1);
  }
}

limpiarBloqueos();
