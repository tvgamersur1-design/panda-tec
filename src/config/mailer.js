const nodemailer = require('nodemailer');
const { Resend } = require('resend');
const sgMail = require('@sendgrid/mail');

// ── Determinar proveedor de email ───────────────────────────────────────────
// Prioridad: SendGrid > Resend > Gmail SMTP
const useSendGrid = !!process.env.SENDGRID_API_KEY;
const useResend = !useSendGrid && !!process.env.RESEND_API_KEY;
let resend;

if (useSendGrid) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log('✓ SendGrid configurado para envío de emails');
} else if (useResend) {
  resend = new Resend(process.env.RESEND_API_KEY);
  console.log('✓ Resend configurado para envío de emails');
}

/**
 * Transportador de correo — Gmail SMTP (solo desarrollo/fallback).
 */
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
  rateDelta: 1000,
  rateLimit: 5,
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 30000,
});

/**
 * Verifica la conexión con el servidor SMTP (solo si no se usa SendGrid/Resend)
 */
async function verificarConexion() {
  if (useSendGrid) {
    console.log('✓ Usando SendGrid — no se necesita verificar SMTP');
    return true;
  }
  if (useResend) {
    console.log('✓ Usando Resend — no se necesita verificar SMTP');
    return true;
  }
  try {
    await transporter.verify();
    console.log('✓ Servidor SMTP listo para enviar emails');
    return true;
  } catch (error) {
    console.error('✗ Error al conectar con el servidor SMTP:', error.message);
    return false;
  }
}

/**
 * Genera el HTML del email de recuperación
 */
function generarHtmlRecuperacion(codigo, nombreUsuario) {
  return `
    <div style="font-family:'Inter',Arial,sans-serif;max-width:480px;margin:0 auto;padding:2rem;">
      <div style="text-align:center;margin-bottom:1.5rem;">
        <h1 style="font-size:1.5rem;color:#0a0a0a;margin:0;">Panta Tec</h1>
        <p style="color:#64748B;font-size:0.875rem;margin-top:0.25rem;">Sistema de Gestión</p>
      </div>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:1.5rem;text-align:center;">
        <p style="color:#374151;margin:0 0 0.5rem;">Hola <strong>${nombreUsuario}</strong>,</p>
        <p style="color:#64748B;font-size:0.875rem;margin:0 0 1.25rem;">Usa este código para restablecer tu contraseña:</p>
        <div style="background:#0a0a0a;color:#fff;font-size:2rem;font-weight:700;letter-spacing:0.3em;padding:0.75rem 1.5rem;border-radius:8px;display:inline-block;">
          ${codigo}
        </div>
        <p style="color:#94A3B8;font-size:0.75rem;margin-top:1.25rem;">Este código expira en <strong>15 minutos</strong>.</p>
        <p style="color:#94A3B8;font-size:0.75rem;">Si no solicitaste este código, ignora este mensaje.</p>
      </div>
      <p style="color:#CBD5E1;font-size:0.75rem;text-align:center;margin-top:1.5rem;">© ${new Date().getFullYear()} Panta Tec</p>
    </div>
  `;
}

/**
 * Envía un correo con código de recuperación de contraseña.
 * Usa SendGrid > Resend > Gmail SMTP (en ese orden de prioridad).
 */
async function enviarCodigoRecuperacion(destinatario, codigo, nombreUsuario) {
  const htmlContent = generarHtmlRecuperacion(codigo, nombreUsuario);

  // Prioridad 1: SendGrid
  if (useSendGrid) {
    try {
      const fromEmail = process.env.SENDGRID_FROM || process.env.GMAIL_USER;
      const msg = {
        to: destinatario,
        from: fromEmail,
        subject: 'Código de recuperación — Panta Tec',
        html: htmlContent,
      };

      const response = await sgMail.send(msg);
      console.log('✓ Email enviado via SendGrid:', response[0].statusCode);
      return { success: true, messageId: response[0].headers['x-message-id'] };
    } catch (error) {
      console.error('✗ Error al enviar email con SendGrid:', error.message);
      throw error;
    }
  }

  // Prioridad 2: Resend
  if (useResend) {
    try {
      const fromEmail = process.env.RESEND_FROM || 'Panta Tec <onboarding@resend.dev>';
      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: [destinatario],
        subject: 'Código de recuperación — Panta Tec',
        html: htmlContent,
      });

      if (error) {
        console.error('✗ Error Resend:', error);
        throw new Error(error.message);
      }

      console.log('✓ Email enviado via Resend:', data.id);
      return { success: true, messageId: data.id };
    } catch (error) {
      console.error('✗ Error al enviar email con Resend:', error.message);
      throw error;
    }
  }

  // Fallback: Gmail SMTP
  const mailOptions = {
    from: `"Panta Tec" <${process.env.GMAIL_USER}>`,
    to: destinatario,
    subject: 'Código de recuperación — Panta Tec',
    html: htmlContent,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✓ Email enviado:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('✗ Error al enviar email:', error.message);
    throw error;
  }
}

/**
 * Envía un email genérico. Usa SendGrid > Resend > Gmail SMTP.
 */
async function enviarEmail(destinatario, subject, html) {
  console.log(`📧 Intentando enviar email a: ${destinatario} | Asunto: ${subject}`);
  console.log(`📧 Proveedor: ${useSendGrid ? 'SendGrid' : useResend ? 'Resend' : 'Gmail SMTP'}`);

  // Prioridad 1: SendGrid
  if (useSendGrid) {
    const fromEmail = process.env.SENDGRID_FROM || process.env.GMAIL_USER;
    console.log(`📧 SendGrid FROM: ${fromEmail}`);
    const msg = {
      to: destinatario,
      from: fromEmail,
      subject,
      html,
    };
    const response = await sgMail.send(msg);
    console.log('✓ Email enviado via SendGrid:', response[0].statusCode);
    return { success: true, messageId: response[0].headers['x-message-id'] };
  }

  // Prioridad 2: Resend
  if (useResend) {
    const fromEmail = process.env.RESEND_FROM || 'Panta Tec <onboarding@resend.dev>';
    console.log(`📧 Resend FROM: ${fromEmail}`);
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [destinatario],
      subject,
      html,
    });
    if (error) throw new Error(error.message);
    console.log('✓ Email enviado via Resend:', data.id);
    return { success: true, messageId: data.id };
  }

  // Fallback: Gmail SMTP
  console.log(`📧 Gmail SMTP FROM: ${process.env.GMAIL_USER}`);
  const info = await transporter.sendMail({
    from: `"Panta Tec" <${process.env.GMAIL_USER}>`,
    to: destinatario,
    subject,
    html,
  });
  console.log('✓ Email enviado:', info.messageId);
  return { success: true, messageId: info.messageId };
}

module.exports = { transporter, enviarCodigoRecuperacion, enviarEmail, verificarConexion };
