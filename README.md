# Panta Tec — Sistema POS de Ventas

Sistema de punto de venta (POS) para tienda de celulares y accesorios.  
**Backend:** Node.js + Express + MongoDB Atlas  
**Frontend:** Vanilla JS SPA (ES Modules) + CSS

---

## Características

- **POS** — Búsqueda de productos con filtro por categoría, carrito, descuentos, métodos de pago, vuelto
- **Dashboard** — Estadísticas en tiempo real, alertas de stock bajo, últimos pedidos
- **Productos** — CRUD con imágenes (Cloudinary), stock mínimo, código de barras
- **Categorías** — CRUD con soft delete
- **Clientes** — CRUD con búsqueda por DNI/nombre, paginación
- **Pedidos** — Gestión de pedidos a proveedores con recepción parcial
- **Usuarios** — Roles (admin/vendedor/almacén), CRUD con paginación
- **Reportes** — Ventas por día/mes, productos más vendidos
- **Configuración** — Datos de tienda, términos y condiciones
- **Autenticación** — JWT, login, recuperación de contraseña por email, Google OAuth
- **Perfil** — Cambio de contraseña, foto de perfil (Cloudinary)

---

## Instalación

```bash
# Clonar
git clone <repo>
cd sitema-panda-tec

# Dependencias
npm install

# Variables de entorno (copiar y configurar)
cp .env.example .env
```

### Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `MONGODB_URI` | URI de MongoDB Atlas |
| `JWT_SECRET` | Secreto para firmar tokens JWT |
| `CLOUDINARY_CLOUD_NAME` | Cloud name de Cloudinary |
| `CLOUDINARY_API_KEY` | API Key de Cloudinary |
| `CLOUDINARY_API_SECRET` | API Secret de Cloudinary |
| `EMAIL_SERVICE` | `sendgrid` o `resend` |
| `SENDGRID_API_KEY` | API Key de SendGrid |
| `RESEND_API_KEY` | API Key de Resend |
| `EMAIL_FROM` | Correo remitente |
| `GOOGLE_CLIENT_ID` | Client ID de Google OAuth |
| `NODE_ENV` | `development` o `production` |

---

## Ejecutar

```bash
# Desarrollo (con nodemon)
npm run dev

# Producción
npm start
```

Servidor en `http://localhost:3000`

---

## Tests

```bash
npm test
```

---

## Seguridad

- JWT con expiración de 8 horas
- Rate limiting en login, recuperación, escritura y lectura
- Helmet (cabeceras HTTP seguras)
- express-mongo-sanitize (protección NoSQL injection)
- Contraseñas hasheadas con bcryptjs (cost 10)
- Validación de entradas en todos los endpoints
- Soft delete en categorías
- Mensajes genéricos en recuperación de contraseña (previene enumeración)
- CORS restringido en producción
- Graceful shutdown con cierre de conexiones

---

## Estructura

```
src/
  app.js              — Express app (middlewares, rutas)
  server.js           — Entry point con graceful shutdown
  config/             — db.js, cloudinary.js, rateLimiter.js
  controllers/        — Lógica de negocio
  middlewares/         — auth.js, roles.js, upload.js
  models/             — Mongoose schemas
  routes/             — Definición de rutas
  utils/              — dateUtils.js
public/
  dashboard.html      — SPA dashboard
  index.html          — Login
  js/
    auth.js           — Autenticación frontend
    api.js            — Cliente HTTP centralizado con caché
    settings.js       — Modal de configuración de cuenta
    modules/          — Módulos SPA (ventas, productos, etc.)
  css/
    style.css         — Estilos globales
    panda.css         — Tema base
    responsive.css    — Media queries
```

---

## API

### Autenticación
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/login` | Iniciar sesión |
| GET | `/api/auth/verificar` | Verificar token |
| PUT | `/api/auth/perfil` | Cambiar contraseña |
| POST | `/api/auth/perfil/foto` | Subir foto de perfil |

### Módulos
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET/POST | `/api/productos` | CRUD productos |
| GET/POST | `/api/categorias` | CRUD categorías |
| GET/POST | `/api/clientes` | CRUD clientes |
| GET/POST | `/api/usuarios` | CRUD usuarios |
| GET/POST | `/api/pedidos` | CRUD pedidos |
| GET/POST | `/api/proveedores` | CRUD proveedores |
| GET | `/api/reportes` | Reportes de ventas |
| GET/POST | `/api/configuracion` | Configuración de tienda |
