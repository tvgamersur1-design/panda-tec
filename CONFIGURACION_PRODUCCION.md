# 🚀 Configuración para Producción

## Problema: Email se queda cargando en producción

Si la recuperación de contraseña funciona en local pero se queda cargando en producción, sigue estos pasos:

---

## ✅ Checklist de Configuración

### 1. Variables de Entorno en Producción

Asegúrate de que tu servidor de producción tenga configuradas estas variables:

```env
# Gmail SMTP
GMAIL_USER=tvgamersur1@gmail.com
GMAIL_APP_PASSWORD=dhzbmdscbpkspjxn

# CORS - IMPORTANTE: Cambia esto por tu dominio real
ALLOWED_ORIGINS=https://tu-dominio.com,https://www.tu-dominio.com

# Entorno
NODE_ENV=production
```

**¿Dónde configurar?**
- **cPanel**: Panel de control → Variables de entorno
- **Vercel/Netlify**: Settings → Environment Variables
- **Heroku**: Settings → Config Vars
- **VPS/Servidor propio**: Archivo `.env` en el directorio del proyecto

---

### 2. Verificar Firewall y Puertos

Gmail SMTP usa el puerto **587** (STARTTLS) o **465** (SSL). Tu servidor debe permitir conexiones salientes a estos puertos.

**Verificar en tu servidor:**

```bash
# Probar conexión a Gmail SMTP
telnet smtp.gmail.com 587
# o
nc -zv smtp.gmail.com 587
```

Si no conecta, contacta a tu proveedor de hosting para que habilite el puerto 587.

**Proveedores comunes:**
- **cPanel/Hostinger**: Generalmente abierto por defecto
- **AWS EC2**: Revisar Security Groups
- **DigitalOcean**: Revisar Firewall rules
- **Google Cloud**: Revisar Firewall rules

---

### 3. Verificar Logs del Servidor

Cuando inicies el servidor, deberías ver:

```
✓ Servidor SMTP listo para enviar emails
```

Si ves:
```
✗ Error al conectar con el servidor SMTP: ...
```

Revisa:
1. Las credenciales de Gmail están correctas
2. El firewall permite conexiones salientes
3. No hay rate limiting del proveedor

---

### 4. Alternativas si Gmail SMTP está bloqueado

Algunos proveedores de hosting bloquean Gmail SMTP. Alternativas:

#### Opción A: SendGrid (Recomendado para producción)
- **Gratis**: 100 emails/día
- **Configuración**: https://sendgrid.com/

```bash
npm install @sendgrid/mail
```

```javascript
// src/config/mailer.js
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function enviarCodigoRecuperacion(destinatario, codigo, nombreUsuario) {
  const msg = {
    to: destinatario,
    from: 'noreply@tu-dominio.com', // Debe ser verificado en SendGrid
    subject: 'Código de recuperación — Panta Tec',
    html: `...` // Tu HTML actual
  };
  return sgMail.send(msg);
}
```

#### Opción B: Mailgun
- **Gratis**: 5,000 emails/mes
- **Configuración**: https://www.mailgun.com/

#### Opción C: Resend
- **Gratis**: 3,000 emails/mes
- **Configuración**: https://resend.com/

---

### 5. Configurar CORS correctamente

En tu archivo `.env` de producción:

```env
# Si tu dominio es https://pantatec.com
ALLOWED_ORIGINS=https://pantatec.com,https://www.pantatec.com

# Si usas un subdominio
ALLOWED_ORIGINS=https://app.pantatec.com
```

**NO uses:**
- `http://` en producción (debe ser `https://`)
- `localhost` en producción
- `*` (wildcard) - es inseguro

---

## 🔍 Diagnóstico Rápido

### Probar desde el servidor de producción

Conéctate por SSH a tu servidor y ejecuta:

```bash
# Verificar variables de entorno
echo $GMAIL_USER
echo $GMAIL_APP_PASSWORD

# Probar conexión SMTP
node -e "
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});
transporter.verify().then(() => console.log('✓ OK')).catch(err => console.error('✗', err.message));
"
```

---

## 📊 Timeouts Configurados

El código ahora tiene timeouts para evitar que se quede cargando indefinidamente:

- **Conexión SMTP**: 10 segundos
- **Operaciones SMTP**: 30 segundos
- **Envío de email**: 30 segundos máximo

Si el email no se envía en 30 segundos, el usuario recibirá un error claro en lugar de quedarse esperando.

---

## 🆘 Solución Temporal

Si necesitas que funcione YA y no puedes configurar SMTP:

1. **Desactiva temporalmente la recuperación de contraseña**
2. **Usa un servicio de email transaccional** (SendGrid, Mailgun, Resend)
3. **Contacta a tu proveedor de hosting** para habilitar SMTP

---

## 📝 Verificar que todo funciona

1. Reinicia el servidor
2. Revisa los logs al iniciar:
   ```
   ✓ Servidor SMTP listo para enviar emails
   ```
3. Prueba la recuperación de contraseña desde producción
4. Revisa los logs del servidor:
   ```
   ✓ Código enviado a usuario@correo.com
   ✓ Email enviado: <message-id>
   ```

---

## 💡 Mejores Prácticas

1. **Usa un servicio de email transaccional en producción** (SendGrid, Mailgun, etc.)
2. **No uses Gmail SMTP en producción** - tiene límites estrictos (500 emails/día)
3. **Configura SPF, DKIM y DMARC** para evitar que tus emails caigan en spam
4. **Monitorea los logs** para detectar problemas rápidamente
5. **Configura alertas** si el envío de emails falla

---

## 🔗 Enlaces Útiles

- [Contraseñas de aplicación de Google](https://myaccount.google.com/apppasswords)
- [SendGrid](https://sendgrid.com/)
- [Mailgun](https://www.mailgun.com/)
- [Resend](https://resend.com/)
- [Nodemailer Docs](https://nodemailer.com/)
