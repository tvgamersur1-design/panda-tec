# ⚡ Solución Rápida: Enviar Emails desde Render

## 🎯 Problema

Render bloquea Gmail SMTP → No puedes enviar emails de recuperación

## ✅ Solución: SendGrid (5 minutos)

### 1️⃣ Crear cuenta SendGrid
👉 [sendgrid.com](https://sendgrid.com) → **Start for Free**

### 2️⃣ Crear API Key
- Settings → API Keys → **Create API Key**
- Nombre: `Panta Tec Production`
- Permisos: **Full Access**
- Copiar la key: `SG.abc123...`

### 3️⃣ Verificar tu email
- Settings → Sender Authentication → **Verify a Single Sender**
- Email: `tvgamersur1@gmail.com`
- Revisar correo y hacer clic en el link

### 4️⃣ Configurar en Render
```
SENDGRID_API_KEY = SG.tu_api_key_aqui
SENDGRID_FROM = tvgamersur1@gmail.com
```

### 5️⃣ Deploy
**Manual Deploy** → Deploy latest commit

---

## 📝 Guías Completas

- **Paso a paso detallado:** `CONFIGURAR_SENDGRID.md`
- **Otras alternativas:** `ALTERNATIVAS_EMAIL_RENDER.md`

---

## ✅ Ventajas

- 🆓 100 emails/día gratis
- ✉️ Enviar a cualquier correo
- ⚡ Sin dominio propio
- 🚀 Funciona en Render

---

## 🔧 Código Actualizado

Ya actualicé `src/config/mailer.js` para soportar:
1. **SendGrid** (prioridad 1)
2. **Resend** (prioridad 2)
3. **Gmail SMTP** (fallback local)

El sistema detecta automáticamente cuál usar según las variables de entorno.
