# 📧 Configuración de Resend para Render

## ¿Por qué Resend en lugar de Gmail SMTP?

**Render bloquea conexiones SMTP salientes** (puertos 587/465), por lo que Gmail SMTP nunca puede conectarse desde Render. Resend usa una **API HTTP** (puerto 443) que sí funciona en Render.

## ✅ Estado Actual del Código

El código ya está preparado para usar Resend automáticamente:

- ✓ Dependencia `resend` instalada en `package.json`
- ✓ `src/config/mailer.js` detecta automáticamente si existe `RESEND_API_KEY`
- ✓ Si existe la key, usa Resend; si no, usa Gmail SMTP (desarrollo local)
- ✓ Solo hay usos de `transporter.sendMail` dentro de `mailer.js` (correcto)

## 🚀 Pasos para Configurar en Render

### 1. Crear cuenta en Resend

1. Ve a [resend.com](https://resend.com) y crea una cuenta gratuita
2. Confirma tu email

### 2. Obtener API Key

1. En el dashboard de Resend, ve a **API Keys**
2. Haz clic en **Create API Key**
3. Dale un nombre (ej: "Panta Tec Production")
4. Copia la key que empieza con `re_...` (solo se muestra una vez)

### 3. Configurar Variables de Entorno en Render

1. Ve a tu servicio en [Render Dashboard](https://dashboard.render.com)
2. Selecciona tu servicio web
3. Ve a **Environment** en el menú lateral
4. Agrega estas dos variables:

```
RESEND_API_KEY = re_tu_api_key_aqui
RESEND_FROM = Panta Tec <onboarding@resend.dev>
```

**Importante:** Para pruebas, usa `onboarding@resend.dev` como remitente. Este es un dominio de prueba de Resend.

### 4. Redeploy

1. En Render, haz clic en **Manual Deploy** → **Deploy latest commit**
2. Espera a que termine el deploy
3. Verifica los logs: deberías ver `✓ Resend configurado para envío de emails`

## 📝 Limitaciones del Plan Gratuito

Con `onboarding@resend.dev` (dominio de prueba):
- ✅ Puedes enviar emails **solo al correo de tu cuenta Resend**
- ❌ No puedes enviar a otros correos

### Para enviar a cualquier correo (Producción Real)

Ya tienes el dominio `panda-tec.onrender.com` agregado en Resend. Ahora necesitas configurar los registros DNS:

#### Registros DNS que debes agregar en Amazon Route 53:

1. **DKIM (Domain Verification)** - Registro TXT:
   - **Name:** `resend._domainkey.panda-tec`
   - **Type:** TXT
   - **Content:** `p=MIGfMA0GCSqG[...]zFudywIDAQAB`
   - **TTL:** Auto

2. **SPF (Enable Sending)** - 2 registros:
   - **Registro MX:**
     - **Name:** `send.panda-tec`
     - **Type:** MX
     - **Content:** `10 feedback-sm[...]amazonses.com`
     - **TTL:** Auto
   
   - **Registro TXT:**
     - **Name:** `send.panda-tec`
     - **Type:** TXT
     - **Content:** `v=spf1 include[...]nses.com ~all`
     - **TTL:** Auto

3. **DMARC (Optional)** - Registro TXT:
   - **Name:** `_dmarc`
   - **Type:** TXT
   - **Content:** `v=DMARC1; p=none;`
   - **TTL:** Auto

#### Pasos en Amazon Route 53:

1. Ve a [AWS Route 53 Console](https://console.aws.amazon.com/route53/)
2. Selecciona tu zona hospedada (Hosted Zone)
3. Haz clic en **Create Record**
4. Para cada registro de arriba:
   - Selecciona el tipo (TXT o MX)
   - Ingresa el Name
   - Ingresa el Content/Value
   - Guarda
5. Espera 5-10 minutos para propagación DNS
6. En Resend, haz clic en **Verify DNS Records**

#### Una vez verificado:

Cambia la variable en Render:

```
RESEND_FROM = Panta Tec <noreply@panda-tec.onrender.com>
```

O cualquier email que quieras usar con ese dominio:
```
RESEND_FROM = Panta Tec <soporte@panda-tec.onrender.com>
```

## 🧪 Probar el Envío de Emails

### Opción 1: Desde tu aplicación
1. Ve a la página de recuperación de contraseña
2. Ingresa el email de tu cuenta Resend
3. Deberías recibir el código de recuperación

### Opción 2: Script de prueba
```bash
node scripts/test-email.js
```

## 🔍 Verificar que Funciona

En los logs de Render deberías ver:
```
✓ Resend configurado para envío de emails
✓ Email enviado via Resend: <message_id>
```

Si ves errores de SMTP, significa que aún está intentando usar Gmail. Verifica que `RESEND_API_KEY` esté configurada correctamente.

## 💡 Desarrollo Local

En desarrollo local (sin `RESEND_API_KEY`), el sistema seguirá usando Gmail SMTP automáticamente. No necesitas cambiar nada en tu `.env` local.

## 📊 Monitoreo

En el dashboard de Resend puedes ver:
- Emails enviados
- Tasa de entrega
- Errores
- Logs detallados

---

**¿Problemas?** Verifica:
1. Que `RESEND_API_KEY` esté en las variables de entorno de Render
2. Que la key sea válida (empieza con `re_`)
3. Que el email de destino sea el de tu cuenta Resend (si usas `onboarding@resend.dev`)
