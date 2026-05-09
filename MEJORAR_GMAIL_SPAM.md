# 📧 Cómo evitar que Gmail llegue como SPAM

## 🎯 Problema
Los correos enviados desde Gmail SMTP llegan a la carpeta de spam porque:
- Gmail detecta envíos automáticos
- Falta autenticación SPF/DKIM
- El contenido parece "sospechoso"

## ✅ Soluciones

### 1️⃣ Mejorar el contenido del email

**Evitar palabras spam:**
- ❌ "URGENTE", "GRATIS", "GANASTE"
- ❌ Muchos signos de exclamación!!!
- ❌ TODO EN MAYÚSCULAS
- ✅ Usar lenguaje natural y profesional

**Tu email actual está bien**, pero puedes mejorarlo:

```javascript
// Agregar texto plano además de HTML
const mailOptions = {
  from: `"Panta Tec" <${process.env.GMAIL_USER}>`,
  to: destinatario,
  subject: 'Código de recuperación — Panta Tec',
  text: `Hola ${nombreUsuario}, tu código de recuperación es: ${codigo}. Expira en 15 minutos.`,
  html: htmlContent,
};
```

### 2️⃣ Configurar autenticación en Gmail

**Habilitar "Acceso de aplicaciones menos seguras":**
1. Ir a: https://myaccount.google.com/security
2. Buscar "Acceso de aplicaciones menos seguras"
3. Activar (⚠️ no recomendado por seguridad)

**Mejor: Usar contraseña de aplicación (ya lo tienes)**
- Ya configuraste `GMAIL_APP_PASSWORD` ✅
- Esto es más seguro

### 3️⃣ Calentar la cuenta de Gmail

Gmail limita envíos automáticos. Para "calentar" la cuenta:

1. **Enviar pocos emails al inicio:**
   - Día 1-3: 5-10 emails/día
   - Día 4-7: 20-30 emails/día
   - Después: hasta 100/día

2. **Pedir a los usuarios que marquen como "No es spam":**
   - Si varios usuarios marcan tus emails como legítimos, Gmail aprende

### 4️⃣ Agregar encabezados de autenticación

Modificar `src/config/mailer.js`:

```javascript
const mailOptions = {
  from: `"Panta Tec" <${process.env.GMAIL_USER}>`,
  to: destinatario,
  subject: 'Código de recuperación — Panta Tec',
  html: htmlContent,
  headers: {
    'X-Priority': '1',
    'X-MSMail-Priority': 'High',
    'Importance': 'high',
    'List-Unsubscribe': `<mailto:${process.env.GMAIL_USER}?subject=unsubscribe>`,
  },
};
```

### 5️⃣ Verificar reputación del dominio

Usar herramientas para verificar si tu Gmail está en listas negras:
- https://mxtoolbox.com/blacklists.aspx
- https://www.mail-tester.com/

---

## 🚀 Solución DEFINITIVA: Usar SendGrid

Gmail SMTP **NO está diseñado** para envíos automáticos masivos.

**Migrar a SendGrid:**
1. Crear cuenta gratis: https://sendgrid.com
2. Verificar email
3. Crear API Key
4. Agregar a `.env`:
   ```env
   SENDGRID_API_KEY=SG.tu_key
   SENDGRID_FROM=tu_correo@gmail.com
   ```

**Ventajas:**
- ✅ No llega a spam
- ✅ 100 emails/día gratis
- ✅ Mejor entregabilidad
- ✅ Estadísticas de envío

---

## 📊 Comparación

| Característica | Gmail SMTP | SendGrid |
|----------------|------------|----------|
| Llega a spam | ⚠️ A veces | ✅ Raramente |
| Límite diario | ~100 | 100 gratis |
| Configuración | Media | Fácil |
| Reputación | Baja | Alta |
| Estadísticas | ❌ No | ✅ Sí |

---

## 🎯 Recomendación

**Para producción:** Usar SendGrid (5 minutos de configuración)
**Para desarrollo:** Gmail SMTP está bien

Tu código ya soporta ambos, solo necesitas agregar las variables de entorno.
