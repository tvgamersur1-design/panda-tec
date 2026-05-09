#!/usr/bin/env node
/**
 * Script de diagnóstico para verificar la configuración de email
 * Uso: node scripts/test-email.js [email_destino]
 */

require('dotenv').config();
const { enviarCodigoRecuperacion, verificarConexion } = require('../src/config/mailer');

const emailDestino = process.argv[2];

async function testEmail() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  🔍 Diagnóstico de Configuración de Email');
  console.log('═══════════════════════════════════════════════════════════\n');

  // 1. Verificar variables de entorno
  console.log('1️⃣  Verificando variables de entorno...');
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;

  if (!gmailUser) {
    console.error('   ✗ GMAIL_USER no está configurado');
    process.exit(1);
  }
  console.log(`   ✓ GMAIL_USER: ${gmailUser}`);

  if (!gmailPass) {
    console.error('   ✗ GMAIL_APP_PASSWORD no está configurado');
    process.exit(1);
  }
  console.log(`   ✓ GMAIL_APP_PASSWORD: ${'*'.repeat(gmailPass.length)} (${gmailPass.length} caracteres)`);

  // 2. Verificar conexión SMTP
  console.log('\n2️⃣  Verificando conexión con Gmail SMTP...');
  const conexionOk = await verificarConexion();
  
  if (!conexionOk) {
    console.error('\n❌ No se pudo conectar con Gmail SMTP');
    console.error('\nPosibles causas:');
    console.error('  • Credenciales incorrectas');
    console.error('  • Firewall bloqueando puerto 587');
    console.error('  • Contraseña de aplicación revocada');
    console.error('  • Verificación en 2 pasos desactivada en Google');
    process.exit(1);
  }

  // 3. Enviar email de prueba (opcional)
  if (emailDestino) {
    console.log(`\n3️⃣  Enviando email de prueba a ${emailDestino}...`);
    try {
      const codigoPrueba = '123456';
      await enviarCodigoRecuperacion(emailDestino, codigoPrueba, 'Usuario de Prueba');
      console.log('   ✓ Email enviado correctamente');
      console.log(`   ℹ️  Revisa la bandeja de entrada de ${emailDestino}`);
    } catch (error) {
      console.error('   ✗ Error al enviar email:', error.message);
      process.exit(1);
    }
  } else {
    console.log('\n3️⃣  Omitiendo envío de prueba (no se proporcionó email destino)');
    console.log('   ℹ️  Para probar el envío: node scripts/test-email.js tu@correo.com');
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  ✅ Configuración de email correcta');
  console.log('═══════════════════════════════════════════════════════════\n');
}

testEmail().catch((error) => {
  console.error('\n❌ Error inesperado:', error.message);
  process.exit(1);
});
