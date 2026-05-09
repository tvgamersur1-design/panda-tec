# 📧 Alternativas para Enviar Emails desde Render

## ✅ Opción 1: SendGrid (Recomendado - Gratis hasta 100 emails/día)

SendGrid funciona perfecto en Render y tiene plan gratuito generoso.

### Pasos:

1. **Crear cuenta en SendGrid:**
   - Ve a [sendgrid.com](https://sendgrid.com)
   - Regístrate gratis (100 emails/día gratis para siempre)

2. **Crear API Key:**
   - Ve a Settings → API Keys
   - Create API Key → Full Access
   - Copia la key (empieza con `SG.`)

3. **Verificar un remitente (Single Sender):**
   - Ve a Settings → Sender Authentication
   - Haz clic en "Verify a Single Sender"
   - Ingresa tu email (ej: `tvgamersur1@gmail.com`)
   - Revisa tu correo y verifica el link
   - ✅ Listo, puedes enviar desde ese email

4. **Configurar en Render:**
   ```
   SENDGRID_API_KEY = SG.tu_api_key_aqui
   SENDGRID_FROM = tvgamersur1@gmail.com
   ```

5. **Actualizar el código:**

Ya tienes `@sendgrid/mail` instalado en tu `package.json`, solo necesitas actualizar `src/config/mailer.js`

---

## ✅ Opción 2: Resend con dominio de prueba (Limitado)

Ya lo tienes configurado, solo funciona para enviar al email de tu cuenta Resend.

**Variables en Render:**
```
RESEND_API_KEY = re_Ch5rbv8p_KjyadJfypJ5BHa29Jfi9khRW
RESEND_FROM = Panta Tec <onboarding@resend.dev>
```

**Limitación:** Solo envía al email con el que te registraste en Resend.

---

## ✅ Opción 3: Brevo (ex-Sendinblue) - Gratis hasta 300 emails/día

Brevo es otra alternativa con buen plan gratuito.

### Pasos:

1. **Crear cuenta:**
   - Ve a [brevo.com](https://www.brevo.com)
   - Regístrate gratis

2. **Crear API Key:**
   - Ve a Settings → SMTP & API → API Keys
   - Create a new API key
   - Copia la key

3. **Verificar remitente:**
   - Ve a Senders → Add a sender
   - Ingresa tu email y verifica

4. **Configurar en Render:**
   ```
   BREVO_API_KEY = tu_api_key_aqui
   BREVO_FROM = tvgamersur1@gmail.com
   ```

---

## ✅ Opción 4: Mailgun - Gratis 5,000 emails/mes (3 meses)

Mailgun tiene un trial generoso.

### Pasos:

1. **Crear cuenta:**
   - Ve a [mailgun.com](https://www.mailgun.com)
   - Regístrate (requiere tarjeta pero no cobra)

2. **Usar dominio sandbox:**
   - Mailgun te da un dominio sandbox automáticamente
   - Puedes agregar hasta 5 emails autorizados

3. **Agregar emails autorizados:**
   - Ve a Sending → Authorized Recipients
   - Agrega tu email
   - Verifica el link que te envían

4. **Obtener API Key:**
   - Ve a Settings → API Keys
   - Copia la Private API key

5. **Configurar en Render:**
   ```
   MAILGUN_API_KEY = tu_api_key_aqui
   MAILGUN_DOMAIN = sandboxXXXXX.mailgun.org
   MAILGUN_FROM = Panta Tec <mailgun@sandboxXXXXX.mailgun.org>
   ```

---

## 🎯 Recomendación: SendGrid

**SendGrid es la mejor opción porque:**
- ✅ 100 emails/día gratis para siempre
- ✅ Solo necesitas verificar tu email (no dominio)
- ✅ Funciona perfecto en Render
- ✅ Fácil de configurar
- ✅ Puedes enviar a cualquier correo

---

## 📝 Comparación Rápida

| Servicio | Emails Gratis | Verificación | Enviar a Cualquiera |
|----------|---------------|--------------|---------------------|
| **SendGrid** | 100/día | Email único | ✅ Sí |
| **Resend** | 100/día | Dominio propio | ❌ No (solo pruebas) |
| **Brevo** | 300/día | Email único | ✅ Sí |
| **Mailgun** | 5,000/mes (3 meses) | Email único | ✅ Sí (hasta 5) |

---

## 🚀 Implementación Rápida con SendGrid

¿Quieres que actualice el código para usar SendGrid? Es la solución más rápida y sin limitaciones.
