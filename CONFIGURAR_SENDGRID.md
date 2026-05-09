# 📧 Configurar SendGrid para Render (Paso a Paso)

## ✅ Por qué SendGrid

- 🆓 **100 emails/día gratis para siempre**
- ✅ **No necesitas dominio propio**
- ✅ **Solo verificas tu email**
- ✅ **Funciona perfecto en Render**
- ✅ **Puedes enviar a cualquier correo**

---

## 🚀 Paso 1: Crear cuenta en SendGrid

1. Ve a [sendgrid.com](https://sendgrid.com)
2. Haz clic en **Start for Free**
3. Completa el registro:
   - Email: `tvgamersur1@gmail.com` (o el que prefieras)
   - Contraseña
   - Nombre y empresa (puedes poner "Panta Tec")
4. Verifica tu email (revisa tu bandeja de entrada)
5. Completa el cuestionario inicial (selecciona lo que quieras)

---

## 🔑 Paso 2: Crear API Key

1. Una vez dentro del dashboard, ve a:
   **Settings** (menú lateral izquierdo) → **API Keys**

2. Haz clic en **Create API Key** (botón azul arriba a la derecha)

3. Configura:
   - **API Key Name:** `Panta Tec Production`
   - **API Key Permissions:** Selecciona **Full Access**

4. Haz clic en **Create & View**

5. **¡IMPORTANTE!** Copia la API Key que aparece (empieza con `SG.`)
   - Solo se muestra una vez
   - Guárdala en un lugar seguro

Ejemplo: `SG.abc123xyz789...`

---

## ✉️ Paso 3: Verificar tu email como remitente

SendGrid necesita que verifiques el email desde el cual enviarás.

1. Ve a:
   **Settings** → **Sender Authentication**

2. En la sección **"Single Sender Verification"** (la del medio), haz clic en **"Get Started"**

3. Haz clic en **"Create New Sender"** (botón azul)

4. Completa el formulario:
   - **From Name:** `Panta Tec`
   - **From Email Address:** `tvgamersur1@gmail.com` (tu email real)
   - **Reply To:** `tvgamersur1@gmail.com` (mismo email)
   - **Company Address:** (puedes poner cualquier dirección)
   - **City:** Lima
   - **State:** Lima
   - **Zip Code:** 15001
   - **Country:** Peru
   - **Nickname:** `Panta Tec Sender`

5. Haz clic en **Create**

6. **Revisa tu email** (`tvgamersur1@gmail.com`)
   - Recibirás un email de SendGrid
   - Haz clic en el link de verificación
   - ✅ Verás "Sender verified successfully"

---

## ⚙️ Paso 4: Configurar variables en Render

1. Ve a [dashboard.render.com](https://dashboard.render.com)

2. Selecciona tu servicio web (Panta Tec)

3. Ve a **Environment** en el menú lateral

4. Agrega estas dos variables (haz clic en **Add Environment Variable**):

   **Variable 1:**
   ```
   Key:   SENDGRID_API_KEY
   Value: SG.tu_api_key_que_copiaste_en_paso_2
   ```

   **Variable 2:**
   ```
   Key:   SENDGRID_FROM
   Value: tvgamersur1@gmail.com
   ```

5. Haz clic en **Save Changes**

---

## 🚀 Paso 5: Hacer Deploy

1. En Render, haz clic en **Manual Deploy** (arriba a la derecha)

2. Selecciona **Deploy latest commit**

3. Espera a que termine el deploy (2-3 minutos)

4. Revisa los logs, deberías ver:
   ```
   ✓ SendGrid configurado para envío de emails
   ```

---

## 🧪 Paso 6: Probar el envío

### Opción A: Desde tu aplicación

1. Ve a tu aplicación en Render (tu URL de producción)

2. Ve a la página de **Recuperar Contraseña**

3. Ingresa **cualquier email** (puede ser el tuyo o cualquier otro)

4. Haz clic en **Enviar código**

5. **Revisa el correo** - deberías recibir el código de recuperación

### Opción B: Desde los logs de Render

1. En Render → tu servicio → **Logs**

2. Busca líneas como:
   ```
   ✓ Email enviado via SendGrid: 202
   ```

3. Si ves errores, revisa que:
   - La API Key sea correcta
   - El email esté verificado en SendGrid

---

## 📊 Paso 7: Monitorear emails enviados

1. En SendGrid, ve a **Activity** en el menú lateral

2. Verás todos los emails enviados:
   - Estado (Delivered, Opened, Clicked)
   - Destinatario
   - Fecha y hora
   - Errores (si los hay)

---

## ✅ Checklist Final

- [ ] Creé cuenta en SendGrid
- [ ] Creé API Key y la copié
- [ ] Verifiqué mi email como remitente
- [ ] Agregué `SENDGRID_API_KEY` en Render
- [ ] Agregué `SENDGRID_FROM` en Render
- [ ] Hice deploy en Render
- [ ] Vi el mensaje "SendGrid configurado" en los logs
- [ ] Probé enviar un código de recuperación
- [ ] Recibí el email correctamente

---

## 🐛 Problemas Comunes

### Error: "The from address does not match a verified Sender Identity"

**Solución:** El email en `SENDGRID_FROM` no está verificado.
- Ve a SendGrid → Settings → Sender Authentication
- Verifica que tu email tenga un ✅ verde
- Si no, haz clic en el link de verificación en tu correo

### Error: "Unauthorized"

**Solución:** La API Key es incorrecta.
- Verifica que copiaste la key completa (empieza con `SG.`)
- Crea una nueva API Key si es necesario
- Actualiza `SENDGRID_API_KEY` en Render

### No recibo el email

**Solución:**
1. Revisa la carpeta de SPAM
2. Ve a SendGrid → Activity y verifica el estado del email
3. Revisa los logs de Render para ver errores

### Sigo viendo "Gmail SMTP" en los logs

**Solución:** SendGrid no está configurado correctamente.
- Verifica que `SENDGRID_API_KEY` esté en las variables de Render
- Haz redeploy después de agregar las variables
- Verifica que no haya espacios extra en la API Key

---

## 💡 Ventajas de SendGrid vs Resend

| Característica | SendGrid | Resend |
|----------------|----------|--------|
| Emails gratis | 100/día | 100/día |
| Verificación | Solo email | Dominio propio |
| Enviar a cualquiera | ✅ Sí | ❌ No (sin dominio) |
| Configuración | 5 minutos | 30+ minutos |
| Funciona en Render | ✅ Sí | ✅ Sí |

---

## 🎯 Resumen

Con SendGrid configurado:
- ✅ Puedes enviar a **cualquier email**
- ✅ **100 emails/día gratis** para siempre
- ✅ No necesitas dominio propio
- ✅ Funciona perfecto en Render
- ✅ Configuración en 5 minutos

**¡Listo para producción!** 🚀
