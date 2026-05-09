const nodemailer = require('nodemailer');

/**
 * Transportador de correo — Gmail SMTP.
 * Requiere GMAIL_USER y GMAIL_APP_PASSWORD en .env
 * (usar "Contraseña de aplicación" de Google, NO la contraseña normal).
 */
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

/**
 * Envía un correo con código de recuperación de contraseña.
 */
async function enviarCodigoRecuperacion(destinatario, codigo, nombreUsuario) {
  const mailOptions = {
    from: `"Panta Tec" <${process.env.GMAIL_USER}>`,
    to: destinatario,
    subject: 'Código de recuperación — Panta Tec',
    html: `
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
    `,
  };

  return transporter.sendMail(mailOptions);
}

module.exports = { transporter, enviarCodigoRecuperacion };
