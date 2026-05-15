const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const Usuario = require('../models/Usuario');
const { enviarCodigoRecuperacion, enviarEmail } = require('../config/mailer');

// ── CONSTANTES DE SEGURIDAD ─────────────────────────────────────────────────
const MAX_INTENTOS_VERIFICACION = 5; // Máximo de intentos para verificar código
const TIEMPO_BLOQUEO_MINUTOS = 30; // Tiempo de bloqueo después de exceder intentos
const TIEMPO_EXPIRACION_CODIGO = 15; // Minutos de validez del código
const MIN_TIEMPO_ENTRE_SOLICITUDES = 2; // Minutos mínimos entre solicitudes del mismo correo

/**
 * POST /api/auth/recuperar
 * Envía un código de 6 dígitos al correo del usuario.
 * Body: { correo }
 * 
 * ENFOQUE DIRECTO (Sistema interno):
 * - Valida que el correo exista (mensaje claro si no existe)
 * - Valida que la cuenta esté activa (mensaje específico)
 * - Limita solicitudes por correo (anti-spam)
 * - Rate limiting por IP (configurado en rutas)
 */
exports.solicitarCodigo = async (req, res) => {
  try {
    const { correo } = req.body;

    // ── Validación básica ───────────────────────────────────────────────────
    if (!correo) {
      return res.status(400).json({ error: 'El correo es obligatorio' });
    }

    // Validar formato de correo
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(correo)) {
      return res.status(400).json({ error: 'Formato de correo inválido' });
    }

    // ── Verificar configuración de email ────────────────────────────────────
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.error('❌ Variables GMAIL_USER o GMAIL_APP_PASSWORD no configuradas');
      return res.status(503).json({ 
        error: 'El servicio de recuperación de contraseña no está disponible. Contacta al administrador.' 
      });
    }

    // ── Buscar usuario ──────────────────────────────────────────────────────
    const usuario = await Usuario.findOne({ correo, eliminado: false });

    // ── VALIDACIÓN DIRECTA: Correo no existe ────────────────────────────────
    if (!usuario) {
      console.log(`⚠️ Intento de recuperación con correo no registrado: ${correo}`);
      return res.status(404).json({ 
        error: 'El correo no está registrado en el sistema. Verifica que sea correcto o contacta al administrador.' 
      });
    }

    // ── VALIDACIÓN: Usuario debe estar activo ───────────────────────────────
    if (!usuario.activo) {
      console.log(`⚠️ Intento de recuperación con cuenta inactiva: ${correo}`);
      return res.status(403).json({ 
        error: 'Tu cuenta está inactiva. Contacta al administrador para reactivarla.' 
      });
    }

    // ── SEGURIDAD: Limitar frecuencia de solicitudes por correo ─────────────
    if (usuario.ultima_solicitud_codigo) {
      const tiempoTranscurrido = (Date.now() - usuario.ultima_solicitud_codigo.getTime()) / 1000 / 60;
      if (tiempoTranscurrido < MIN_TIEMPO_ENTRE_SOLICITUDES) {
        const tiempoRestante = Math.ceil(MIN_TIEMPO_ENTRE_SOLICITUDES - tiempoTranscurrido);
        console.log(`⚠️ Solicitud demasiado rápida para ${correo}. Esperar ${tiempoRestante} min`);
        return res.status(429).json({ 
          error: `Debes esperar ${tiempoRestante} minuto(s) antes de solicitar otro código.` 
        });
      }
    }

    // ── Generar código de 6 dígitos ─────────────────────────────────────────
    const codigo = crypto.randomInt(100000, 999999).toString();
    const expiracion = new Date(Date.now() + TIEMPO_EXPIRACION_CODIGO * 60 * 1000);

    // ── Guardar en BD ───────────────────────────────────────────────────────
    usuario.codigo_recuperacion = codigo;
    usuario.codigo_expiracion = expiracion;
    usuario.intentos_codigo = 0; // Resetear intentos
    usuario.codigo_bloqueado_hasta = null; // Quitar bloqueo previo
    usuario.ultima_solicitud_codigo = new Date();
    await usuario.save();

    // ── Enviar email con timeout ────────────────────────────────────────────
    try {
      await Promise.race([
        enviarCodigoRecuperacion(correo, codigo, usuario.nombre_completo),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout al enviar email')), 30000)
        )
      ]);
      console.log(`✓ Código enviado a ${correo} (Usuario: ${usuario.nombre_completo})`);
    } catch (emailError) {
      console.error('❌ Error al enviar email:', emailError.message);
      
      // Revertir el código guardado si falla el envío
      usuario.codigo_recuperacion = null;
      usuario.codigo_expiracion = null;
      usuario.ultima_solicitud_codigo = null;
      await usuario.save();
      
      // Mensaje específico según el error
      let mensajeError = 'No se pudo enviar el email. ';
      if (emailError.message.includes('Timeout')) {
        mensajeError += 'El servidor de correo no responde. Intenta más tarde.';
      } else if (emailError.message.includes('ECONNREFUSED') || emailError.message.includes('ETIMEDOUT')) {
        mensajeError += 'No se puede conectar al servidor de correo. Contacta al administrador.';
      } else if (emailError.message.includes('Invalid login')) {
        mensajeError += 'Error de autenticación con el servidor de correo. Contacta al administrador.';
      } else {
        mensajeError += 'Error desconocido. Contacta al administrador.';
      }
      
      return res.status(503).json({ error: mensajeError });
    }

    // ── Respuesta exitosa con información clara ─────────────────────────────
    res.json({ 
      success: true,
      mensaje: `Código enviado exitosamente a ${correo}. Revisa tu bandeja de entrada y spam.` 
    });
  } catch (error) {
    console.error('❌ Error al solicitar recuperación:', error);
    res.status(500).json({ error: 'Error al procesar la solicitud' });
  }
};

/**
 * POST /api/auth/verificar-codigo
 * Verifica que el código sea válido y no haya expirado.
 * Body: { correo, codigo }
 * 
 * SEGURIDAD:
 * - Limita intentos de verificación (anti-fuerza bruta)
 * - Bloquea temporalmente después de exceder intentos
 * - Valida expiración del código
 * - Rate limiting por IP (configurado en rutas)
 */
exports.verificarCodigo = async (req, res) => {
  try {
    const { correo, codigo } = req.body;

    // ── Validación básica ───────────────────────────────────────────────────
    if (!correo || !codigo) {
      return res.status(400).json({ error: 'Correo y código son obligatorios' });
    }

    // Validar formato del código (6 dígitos)
    if (!/^\d{6}$/.test(codigo)) {
      return res.status(400).json({ error: 'El código debe tener 6 dígitos numéricos' });
    }

    // ── Buscar usuario ──────────────────────────────────────────────────────
    const usuario = await Usuario.findOne({ correo, eliminado: false });

    if (!usuario) {
      console.log(`⚠️ Intento de verificación con correo no registrado: ${correo}`);
      return res.status(400).json({ error: 'Código inválido o expirado' });
    }

    // ── SEGURIDAD: Verificar si está bloqueado temporalmente ────────────────
    if (usuario.codigo_bloqueado_hasta && usuario.codigo_bloqueado_hasta > new Date()) {
      const minutosRestantes = Math.ceil((usuario.codigo_bloqueado_hasta - new Date()) / 1000 / 60);
      console.log(`⚠️ Usuario bloqueado: ${correo}. Restantes: ${minutosRestantes} min`);
      return res.status(429).json({ 
        error: `Demasiados intentos fallidos. Intenta de nuevo en ${minutosRestantes} minuto(s).` 
      });
    }

    // ── Verificar si existe código de recuperación ──────────────────────────
    if (!usuario.codigo_recuperacion) {
      console.log(`⚠️ No hay código activo para: ${correo}`);
      return res.status(400).json({ error: 'No hay código de recuperación activo. Solicita uno nuevo.' });
    }

    // ── Verificar expiración ────────────────────────────────────────────────
    if (usuario.codigo_expiracion < new Date()) {
      console.log(`⚠️ Código expirado para: ${correo}`);
      // Limpiar código expirado
      usuario.codigo_recuperacion = null;
      usuario.codigo_expiracion = null;
      usuario.intentos_codigo = 0;
      await usuario.save();
      return res.status(400).json({ error: 'El código ha expirado. Solicita uno nuevo.' });
    }

    // ── Verificar código ────────────────────────────────────────────────────
    if (usuario.codigo_recuperacion !== codigo) {
      // ── SEGURIDAD: Incrementar contador de intentos fallidos ────────────
      usuario.intentos_codigo = (usuario.intentos_codigo || 0) + 1;
      
      console.log(`⚠️ Código incorrecto para ${correo}. Intento ${usuario.intentos_codigo}/${MAX_INTENTOS_VERIFICACION}`);

      // ── SEGURIDAD: Bloquear si excede intentos máximos ──────────────────
      if (usuario.intentos_codigo >= MAX_INTENTOS_VERIFICACION) {
        usuario.codigo_bloqueado_hasta = new Date(Date.now() + TIEMPO_BLOQUEO_MINUTOS * 60 * 1000);
        usuario.codigo_recuperacion = null; // Invalidar código
        usuario.codigo_expiracion = null;
        await usuario.save();
        
        console.log(`🚫 Usuario bloqueado por ${TIEMPO_BLOQUEO_MINUTOS} min: ${correo}`);
        return res.status(429).json({ 
          error: `Demasiados intentos fallidos. Tu cuenta ha sido bloqueada temporalmente por ${TIEMPO_BLOQUEO_MINUTOS} minutos.` 
        });
      }

      await usuario.save();
      
      const intentosRestantes = MAX_INTENTOS_VERIFICACION - usuario.intentos_codigo;
      return res.status(400).json({ 
        error: `Código incorrecto. Te quedan ${intentosRestantes} intento(s).` 
      });
    }

    // ── Código válido ───────────────────────────────────────────────────────
    console.log(`✓ Código verificado correctamente para: ${correo}`);
    
    // Resetear intentos (pero mantener el código para el paso de restablecimiento)
    usuario.intentos_codigo = 0;
    await usuario.save();

    res.json({ valido: true, mensaje: 'Código verificado correctamente' });
  } catch (error) {
    console.error('❌ Error al verificar código:', error);
    res.status(500).json({ error: 'Error al verificar el código' });
  }
};

/**
 * POST /api/auth/restablecer
 * Cambia la contraseña tras verificar el código.
 * Body: { correo, codigo, nueva_clave }
 * 
 * SEGURIDAD:
 * - Valida fortaleza de contraseña
 * - Verifica código nuevamente (doble verificación)
 * - Envía email de confirmación
 * - Limpia todos los códigos y bloqueos
 */
exports.restablecerClave = async (req, res) => {
  try {
    const { correo, codigo, nueva_clave } = req.body;

    // ── Validación básica ───────────────────────────────────────────────────
    if (!correo || !codigo || !nueva_clave) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    // ── SEGURIDAD: Validar fortaleza de contraseña ──────────────────────────
    if (nueva_clave.length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    }

    // Validar complejidad (al menos una mayúscula, una minúscula y un número)
    const tieneMinuscula = /[a-z]/.test(nueva_clave);
    const tieneMayuscula = /[A-Z]/.test(nueva_clave);
    const tieneNumero = /[0-9]/.test(nueva_clave);

    if (!tieneMinuscula || !tieneMayuscula || !tieneNumero) {
      return res.status(400).json({ 
        error: 'La contraseña debe contener al menos una mayúscula, una minúscula y un número' 
      });
    }

    // ── Buscar usuario ──────────────────────────────────────────────────────
    const usuario = await Usuario.findOne({ correo, eliminado: false });

    if (!usuario) {
      console.log(`⚠️ Intento de restablecimiento con correo no registrado: ${correo}`);
      return res.status(400).json({ error: 'Código inválido o expirado' });
    }

    // ── Verificar código nuevamente (doble verificación) ────────────────────
    if (!usuario.codigo_recuperacion || usuario.codigo_recuperacion !== codigo) {
      console.log(`⚠️ Código inválido en restablecimiento para: ${correo}`);
      return res.status(400).json({ error: 'Código inválido o expirado' });
    }

    if (usuario.codigo_expiracion < new Date()) {
      console.log(`⚠️ Código expirado en restablecimiento para: ${correo}`);
      return res.status(400).json({ error: 'El código ha expirado. Solicita uno nuevo.' });
    }

    // ── Actualizar contraseña ───────────────────────────────────────────────
    usuario.clave = nueva_clave; // El pre-save hook hashea automáticamente
    usuario.codigo_recuperacion = null;
    usuario.codigo_expiracion = null;
    usuario.intentos_codigo = 0;
    usuario.codigo_bloqueado_hasta = null;
    usuario.ultima_solicitud_codigo = null;
    await usuario.save();

    console.log(`✓ Contraseña restablecida para: ${correo}`);

    // ── SEGURIDAD: Enviar email de confirmación ─────────────────────────────
    try {
      const htmlConfirmacion = `
        <div style="font-family:'Inter',Arial,sans-serif;max-width:480px;margin:0 auto;padding:2rem;">
          <div style="text-align:center;margin-bottom:1.5rem;">
            <h1 style="font-size:1.5rem;color:#0a0a0a;margin:0;">Panta Tec</h1>
            <p style="color:#64748B;font-size:0.875rem;margin-top:0.25rem;">Sistema de Gestión</p>
          </div>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:1.5rem;">
            <div style="text-align:center;margin-bottom:1rem;">
              <div style="display:inline-block;width:48px;height:48px;background:#16A34A;border-radius:50%;color:#fff;font-size:1.5rem;line-height:48px;">
                ✓
              </div>
            </div>
            <p style="color:#374151;margin:0 0 0.5rem;text-align:center;">Hola <strong>${usuario.nombre_completo}</strong>,</p>
            <p style="color:#64748B;font-size:0.875rem;margin:0;text-align:center;">Tu contraseña ha sido restablecida exitosamente.</p>
            <p style="color:#94A3B8;font-size:0.75rem;margin-top:1.25rem;text-align:center;">
              Si no realizaste este cambio, contacta inmediatamente al administrador.
            </p>
          </div>
          <p style="color:#CBD5E1;font-size:0.75rem;text-align:center;margin-top:1.5rem;">© ${new Date().getFullYear()} Panta Tec</p>
        </div>
      `;
      
      await enviarEmail(correo, 'Contraseña restablecida - Panta Tec', htmlConfirmacion);
      console.log(`✓ Email de confirmación enviado a: ${correo}`);
    } catch (emailError) {
      // No fallar si el email de confirmación falla (la contraseña ya se cambió)
      console.error('⚠️ No se pudo enviar email de confirmación:', emailError.message);
    }

    res.json({ mensaje: 'Contraseña restablecida correctamente' });
  } catch (error) {
    console.error('❌ Error al restablecer contraseña:', error);
    res.status(500).json({ error: 'Error al restablecer la contraseña' });
  }
};
