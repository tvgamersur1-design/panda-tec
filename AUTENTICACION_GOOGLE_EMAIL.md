# 🔐 Autenticación — Google OAuth + Recuperación por Email

## Resumen

El sistema Panta Tec ahora soporta:
1. **Recuperación de contraseña por email** — Envía un código de 6 dígitos al correo del usuario
2. **Inicio de sesión con Google** — Los usuarios pueden vincularse y acceder con su cuenta de Google

---

## 📦 Dependencias instaladas

| Paquete | Versión | Propósito |
|---|---|---|
| `nodemailer` | ^6.x | Envío de emails via Gmail SMTP (fallback) |
| `@sendgrid/mail` | ^8.x | Envío de emails via SendGrid (recomendado) |
| `google-auth-library` | ^9.x | Verificación de tokens de Google OAuth |

---

## 🔑 Variables de entorno (.env)

Agrega estas variables a tu archivo `.env`:

```env
# ── Gmail SMTP (recuperación de contraseña) ──────────────────────────────────
# Correo Gmail desde el cual se envían los emails
GMAIL_USER=tu_correo@gmail.com

# Contraseña de aplicación (NO la contraseña normal de Gmail)
# Generar en: https://myaccount.google.com/apppasswords
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx

# ── Google OAuth ─────────────────────────────────────────────────────────────
# Client ID de Google Cloud Console
# Crear en: https://console.cloud.google.com/apis/credentials
GOOGLE_CLIENT_ID=tu_client_id.apps.googleusercontent.com
```

---

## ⚙️ Configuración paso a paso

### 1. Configurar Gmail SMTP (para recuperación de contraseña)

1. Ve a tu cuenta de Google: https://myaccount.google.com
2. **Seguridad** → Activa la **verificación en 2 pasos** (requisito)
3. Ve a https://myaccount.google.com/apppasswords
4. Crea una contraseña de aplicación:
   - Nombre: `Panta Tec`
   - Google te dará una clave de 16 caracteres (formato: `xxxx xxxx xxxx xxxx`)
5. Copia esa clave en `GMAIL_APP_PASSWORD` de tu `.env`
6. Pon tu correo Gmail en `GMAIL_USER`

### 2. Configurar Google OAuth (para login con Google)

1. Ve a https://console.cloud.google.com
2. **Crear proyecto** (o usa uno existente)
3. Menú → **APIs & Services** → **Credentials**
4. **+ Create Credentials** → **OAuth 2.0 Client ID**
5. Tipo de aplicación: **Web application**
6. Nombre: `Panta Tec`
7. **Authorized JavaScript Origins**: 
   - `http://localhost:3000` (desarrollo)
   - `https://tu-dominio.com` (producción, cuando lo tengas)
8. **Authorized redirect URIs**: (dejar vacío, usamos el flujo de popup)
9. Copiar el **Client ID** en `GOOGLE_CLIENT_ID` de tu `.env`

> ⚠️ **IMPORTANTE**: En "OAuth consent screen", configura como **External** y agrega tu email como usuario de prueba mientras la app esté en modo "Testing".

---

## 📡 Nuevos Endpoints API

### Recuperación de contraseña

| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| POST | `/api/auth/recuperar` | Envía código de 6 dígitos al correo | No |
| POST | `/api/auth/verificar-codigo` | Verifica que el código sea válido | No |
| POST | `/api/auth/restablecer` | Cambia la contraseña con código válido | No |

### Google OAuth

| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| POST | `/api/auth/google` | Inicia sesión con token de Google | No |
| POST | `/api/auth/google/vincular` | Vincula cuenta Google al usuario actual | Sí (JWT) |

---

## 🗄️ Cambios en el modelo Usuario

Nuevos campos agregados:

```javascript
google_id: String           // ID de Google vinculado
email_verificado: Boolean   // Si el email fue verificado
codigo_recuperacion: String // Código temporal de 6 dígitos
codigo_expiracion: Date     // Cuándo expira el código (15 min)
```

---

## 🖥️ Nuevas páginas frontend

| Página | Ruta | Descripción |
|---|---|---|
| Recuperar contraseña | `/recuperar.html` | Flujo de 3 pasos (correo → código → nueva clave) |

### Cambios en páginas existentes

- **`index.html`** (login): 
  - Enlace "¿Olvidaste tu contraseña?" → `/recuperar.html`
  - Botón "Iniciar con Google"

---

## 🔄 Flujos

### Flujo de recuperación de contraseña
```
1. Usuario hace clic en "¿Olvidaste tu contraseña?"
2. Ingresa su correo → POST /api/auth/recuperar
3. Recibe email con código de 6 dígitos (expira en 15 min)
4. Ingresa el código → POST /api/auth/verificar-codigo
5. Si es válido, ingresa nueva contraseña → POST /api/auth/restablecer
6. Redirigido al login
```

### Flujo de Google Sign-In
```
1. Usuario hace clic en "Iniciar con Google"
2. Se abre popup de Google para seleccionar cuenta
3. Google retorna un ID token → POST /api/auth/google
4. Backend verifica el token con Google
5. Busca usuario por google_id o correo
6. Si existe: genera JWT y lo retorna
7. Si no existe: retorna error (solo admin puede crear cuentas)
```

### Vinculación de Google (para usuarios existentes)
```
1. Un usuario existente inicia sesión normalmente
2. El admin o el sistema vincula su cuenta → POST /api/auth/google/vincular
3. El google_id se guarda en su perfil
4. A partir de ahora puede usar Google para iniciar sesión
```

---

## 🔒 Seguridad

- Los códigos de recuperación expiran en **15 minutos**
- Las rutas de recuperación tienen **rate limiting** para evitar abuso
- El endpoint `/api/auth/recuperar` **no revela** si el correo existe o no
- Los tokens de Google se **verifican contra la API de Google** (no se confían ciegamente)
- La contraseña de aplicación de Gmail **no es** la contraseña normal de la cuenta
- **Timeouts configurados**: 10s para conexión, 30s para envío (evita que se quede colgado)

---

## ⚠️ Problemas Comunes

### Email se queda cargando en producción

Si funciona en local pero no en producción, revisa:

1. **Variables de entorno**: `GMAIL_USER` y `GMAIL_APP_PASSWORD` configuradas en producción
2. **Firewall**: El servidor debe permitir conexiones salientes al puerto 587 (SMTP)
3. **CORS**: `ALLOWED_ORIGINS` debe incluir tu dominio de producción
4. **Logs del servidor**: Busca mensajes de error al iniciar

**Ver guía completa**: [CONFIGURACION_PRODUCCION.md](./CONFIGURACION_PRODUCCION.md)

### Gmail SMTP bloqueado por el hosting

Algunos proveedores bloquean Gmail SMTP. Alternativas:
- **SendGrid** (100 emails/día gratis)
- **Mailgun** (5,000 emails/mes gratis)
- **Resend** (3,000 emails/mes gratis)

---

## 💰 Costos

| Servicio | Costo |
|---|---|
| Gmail SMTP | **GRATIS** (500 emails/día) |
| Google Cloud OAuth | **GRATIS** (sin límite) |
| nodemailer + google-auth-library | **GRATIS** (open source) |

**Total: $0**

---

## 📁 Archivos creados/modificados

### Nuevos
- `src/config/mailer.js` — Configuración de nodemailer con Gmail
- `src/controllers/recoveryController.js` — Lógica de recuperación
- `src/controllers/googleAuthController.js` — Lógica de Google OAuth
- `public/recuperar.html` — Página de recuperación de contraseña

### Modificados
- `src/models/Usuario.js` — Nuevos campos (google_id, etc.)
- `src/routes/auth.js` — Nuevas rutas
- `src/controllers/configuracionController.js` — Expone google_client_id
- `public/index.html` — Botón Google + enlace recuperación
- `.env.example` — Nuevas variables
- `package.json` — Nuevas dependencias
