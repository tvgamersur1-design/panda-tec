# Sistema de Gestión - Tienda de Celulares
## Documento de Arquitectura Técnica

---

## 1. STACK TECNOLÓGICO

Mismo stack base que el sistema de reparaciones, probado y funcional:

| Capa | Tecnología | Justificación |
|------|-----------|---------------|
| Runtime | Node.js ≥18 | Mismo entorno |
| Framework | Express.js 4.x | Mismo patrón |
| Base de Datos | MongoDB Atlas | Flexible para catálogo de productos |
| Auth | JWT + bcryptjs | Mismo mecanismo |
| Hosting | Netlify + Functions | Mismo deployment |
| Frontend | ES6 Modules + Fetch API | Mismo patrón modular |
| Estilos | CSS3 custom properties | Mismo sistema de diseño |

---

## 2. ARQUITECTURA GENERAL

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND                          │
│  public/                                             │
│  ├── index.html          (Login)                     │
│  ├── dashboard.html      (Panel principal)           │
│  ├── js/                                             │
│  │   ├── auth.js         (Autenticación)             │
│  │   ├── api.js          (Wrapper fetch + token)     │
│  │   ├── config.js       (URLs, constantes)          │
│  │   ├── ui.js           (Notificaciones, modales)   │
│  │   ├── helpers.js      (Formateo, utilidades)      │
│  │   └── modules/                                    │
│  │       ├── productos.js    (Catálogo)               │
│  │       ├── ventas.js       (Punto de venta)         │
│  │       ├── clientes.js     (Gestión clientes)       │
│  │       ├── inventario.js   (Stock)                  │
│  │       ├── proveedores.js  (Proveedores)            │
│  │       ├── caja.js         (Caja diaria)            │
│  │       ├── reportes.js     (Reportes y estadísticas)|
│  │       └── usuarios.js     (Admin usuarios)         │
│  └── css/                                            │
└─────────────────────────────────────────────────────┘
           │  REST API (JWT en headers)
           ▼
┌─────────────────────────────────────────────────────┐
│                   BACKEND                            │
│  functions/ (Netlify Serverless)                     │
│  ├── auth.js             (Login, verificar token)    │
│  ├── productos.js        (CRUD productos)            │
│  ├── ventas.js           (Registrar ventas)          │
│  ├── clientes.js         (CRUD clientes)             │
│  ├── inventario.js       (Movimientos de stock)      │
│  ├── proveedores.js      (CRUD proveedores)          │
│  ├── caja.js             (Apertura/cierre caja)      │
│  ├── reportes.js         (Estadísticas)              │
│  ├── usuarios.js         (Admin usuarios)            │
│  └── generar-pdf.js      (Boletas/facturas PDF)      │
└─────────────────────────────────────────────────────┘
           │  MongoDB Driver
           ▼
┌─────────────────────────────────────────────────────┐
│               MONGODB ATLAS                          │
│  Colecciones:                                        │
│  ├── usuarios            ├── ventas                  │
│  ├── clientes            ├── detalle_ventas          │
│  ├── productos           ├── movimientos_inventario  │
│  ├── categorias          ├── caja                    │
│  ├── proveedores         └── login_attempts          │
└─────────────────────────────────────────────────────┘
```

---

## 3. MODELOS DE DATOS (COLECCIONES MONGODB)

### 3.1 `usuarios`
```javascript
{
  _id: ObjectId,
  usuario: String,          // único, para login
  nombre_completo: String,
  correo: String,           // único
  clave: String,            // bcryptjs hash
  rol: String,              // 'admin' | 'vendedor' | 'almacen'
  activo: Boolean,
  permisos: {
    ventas: Boolean,
    inventario: Boolean,
    reportes: Boolean,
    caja: Boolean,
    admin: Boolean
  },
  fecha_creacion: String,
  fecha_actualizacion: String
}
```

### 3.2 `clientes`
```javascript
{
  _id: ObjectId,
  nombre: String,
  apellido_paterno: String,
  apellido_materno: String,
  dni: String,              // único, 8 dígitos
  telefono: String,
  email: String,
  direccion: String,
  tipo_cliente: String,     // 'regular' | 'mayorista' | 'vip'
  credito_disponible: Number,
  total_compras: Number,    // calculado
  eliminado: Boolean,       // soft delete
  fecha_creacion: String,
  fecha_actualizacion: String
}
```

### 3.3 `productos`
```javascript
{
  _id: ObjectId,
  codigo: String,           // único, ej: 'CEL-001'
  nombre: String,
  marca: String,            // Samsung, Apple, Xiaomi...
  modelo: String,
  categoria_id: ObjectId,
  descripcion: String,
  especificaciones: {
    almacenamiento: String, // '128GB', '256GB'
    ram: String,            // '6GB', '8GB'
    pantalla: String,       // '6.5"'
    camara: String,         // '50MP'
    bateria: String,        // '5000mAh'
    color: String,
    red: String             // '4G', '5G'
  },
  precio_compra: Number,
  precio_venta: Number,
  precio_mayorista: Number,
  stock_actual: Number,
  stock_minimo: Number,     // alerta de reposición
  proveedor_id: ObjectId,
  imei_list: [String],      // IMEIs disponibles en stock
  fotos: [String],          // URLs Cloudinary
  estado: String,           // 'activo' | 'inactivo' | 'agotado'
  eliminado: Boolean,
  fecha_creacion: String,
  fecha_actualizacion: String
}
```

### 3.4 `categorias`
```javascript
{
  _id: ObjectId,
  nombre: String,           // 'Smartphones', 'Accesorios', 'Tablets'
  descripcion: String,
  activo: Boolean
}
```

### 3.5 `proveedores`
```javascript
{
  _id: ObjectId,
  nombre: String,
  ruc: String,              // único
  contacto: String,
  telefono: String,
  email: String,
  direccion: String,
  productos_que_provee: [String], // marcas o categorías
  condiciones_pago: String, // 'contado' | 'credito_30' | 'credito_60'
  activo: Boolean,
  fecha_creacion: String
}
```

### 3.6 `ventas`
```javascript
{
  _id: ObjectId,
  numero_venta: String,     // único, ej: 'V-2026-001'
  cliente_id: ObjectId,     // null si venta sin cliente
  vendedor_id: ObjectId,
  tipo_comprobante: String, // 'boleta' | 'factura' | 'ninguno'
  numero_comprobante: String,
  subtotal: Number,
  descuento: Number,
  igv: Number,              // 18%
  total: Number,
  metodo_pago: String,      // 'efectivo' | 'tarjeta' | 'yape' | 'plin' | 'transferencia'
  monto_recibido: Number,
  vuelto: Number,
  estado: String,           // 'completada' | 'anulada' | 'pendiente'
  motivo_anulacion: String,
  caja_id: ObjectId,        // a qué apertura de caja pertenece
  notas: String,
  fecha_venta: String,
  fecha_creacion: String
}
```

### 3.7 `detalle_ventas`
```javascript
{
  _id: ObjectId,
  venta_id: ObjectId,
  producto_id: ObjectId,
  imei: String,             // IMEI vendido (si aplica)
  cantidad: Number,
  precio_unitario: Number,
  descuento_item: Number,
  subtotal: Number
}
```

### 3.8 `movimientos_inventario`
```javascript
{
  _id: ObjectId,
  producto_id: ObjectId,
  tipo: String,             // 'entrada' | 'salida' | 'ajuste' | 'devolucion'
  cantidad: Number,
  stock_anterior: Number,
  stock_nuevo: Number,
  referencia_id: ObjectId,  // venta_id o compra_id
  referencia_tipo: String,  // 'venta' | 'compra' | 'ajuste'
  imeis: [String],          // IMEIs involucrados
  usuario_id: ObjectId,
  notas: String,
  fecha: String
}
```

### 3.9 `caja`
```javascript
{
  _id: ObjectId,
  usuario_id: ObjectId,     // quien abrió la caja
  monto_apertura: Number,
  monto_cierre: Number,
  total_ventas_efectivo: Number,
  total_ventas_tarjeta: Number,
  total_ventas_digital: Number,
  total_ventas: Number,
  diferencia: Number,       // monto_cierre - (apertura + ventas_efectivo)
  estado: String,           // 'abierta' | 'cerrada'
  fecha_apertura: String,
  fecha_cierre: String,
  ventas_ids: [ObjectId]
}
```

### 3.10 `login_attempts` (Rate Limiting)
```javascript
{
  _id: ObjectId,
  ip: String,
  timestamp: Date           // TTL index: 900 segundos
}
```

---

## 4. SEGURIDAD DEL LOGIN

### Mismo mecanismo que el sistema de reparaciones + mejoras:

```
1. POST /api/auth/login
   ├── Rate limiting: 10 intentos / 15 min por IP
   ├── Verificar usuario en MongoDB
   ├── bcryptjs.compare(clave, hash)
   ├── Verificar activo: true
   ├── Generar JWT (8h) con { id, usuario, rol, permisos }
   └── Responder con token + datos usuario

2. Cada request autenticado:
   ├── Header: Authorization: Bearer <token>
   ├── Backend verifica JWT
   ├── Verifica permisos según rol
   └── Procede o retorna 403

3. Frontend:
   ├── Token en localStorage (mismo patrón)
   ├── Interceptor en api.js agrega token automáticamente
   ├── 401/403 → limpiar storage + redirigir a login
   └── Verificar sesión al cargar dashboard
```

### Roles y Permisos
| Rol | Ventas | Inventario | Reportes | Caja | Admin |
|-----|--------|-----------|---------|------|-------|
| admin | ✅ | ✅ | ✅ | ✅ | ✅ |
| vendedor | ✅ | ❌ | ❌ | ✅ | ❌ |
| almacen | ❌ | ✅ | ❌ | ❌ | ❌ |

---

## 5. ESTRATEGIA DE CACHE

### Frontend (mismo patrón + optimizaciones)
```javascript
// Cache en memoria por módulo
const cache = {
  productos: { data: null, timestamp: null, ttl: 5 * 60 * 1000 }, // 5 min
  categorias: { data: null, timestamp: null, ttl: 30 * 60 * 1000 }, // 30 min
  clientes: { data: null, timestamp: null, ttl: 2 * 60 * 1000 }   // 2 min
};

function getCached(key) {
  const entry = cache[key];
  if (!entry.data) return null;
  if (Date.now() - entry.timestamp > entry.ttl) {
    entry.data = null; // expirado
    return null;
  }
  return entry.data;
}
```

### Backend (MongoDB Connection Pooling)
```javascript
// Mismo patrón cachedClient del sistema actual
let cachedClient = null;
async function connectDB() {
  if (cachedClient) return cachedClient;
  cachedClient = await MongoClient.connect(MONGODB_URI, {
    maxPoolSize: 5,
    minPoolSize: 1,
    serverSelectionTimeoutMS: 5000
  });
  return cachedClient;
}
```

### Índices MongoDB para Performance
```javascript
// productos
db.productos.createIndex({ codigo: 1 }, { unique: true });
db.productos.createIndex({ marca: 1, modelo: 1 });
db.productos.createIndex({ categoria_id: 1 });
db.productos.createIndex({ estado: 1 });
db.productos.createIndex({ stock_actual: 1 }); // alertas de stock

// ventas
db.ventas.createIndex({ numero_venta: 1 }, { unique: true });
db.ventas.createIndex({ cliente_id: 1 });
db.ventas.createIndex({ vendedor_id: 1 });
db.ventas.createIndex({ fecha_venta: -1 }); // reportes por fecha
db.ventas.createIndex({ caja_id: 1 });

// detalle_ventas
db.detalle_ventas.createIndex({ venta_id: 1 });
db.detalle_ventas.createIndex({ producto_id: 1 });

// movimientos_inventario
db.movimientos_inventario.createIndex({ producto_id: 1, fecha: -1 });

// login_attempts
db.login_attempts.createIndex({ timestamp: 1 }, { expireAfterSeconds: 900 });
```

---

## 6. API ENDPOINTS

```
# Auth
POST   /api/auth/login
GET    /api/auth/verificar

# Productos
GET    /api/productos              ?categoria=&marca=&estado=&search=
POST   /api/productos
GET    /api/productos/:id
PUT    /api/productos/:id
DELETE /api/productos/:id          (soft delete)
GET    /api/productos/stock-bajo   (stock <= stock_minimo)

# Categorías
GET    /api/categorias
POST   /api/categorias
PUT    /api/categorias/:id

# Ventas
GET    /api/ventas                 ?fecha_inicio=&fecha_fin=&vendedor=
POST   /api/ventas                 (registrar venta completa)
GET    /api/ventas/:id
PUT    /api/ventas/:id/anular      (anular venta)
GET    /api/ventas/:id/pdf         (generar boleta/factura)

# Clientes
GET    /api/clientes               ?search=&tipo=
POST   /api/clientes
GET    /api/clientes/:id
PUT    /api/clientes/:id
DELETE /api/clientes/:id

# Inventario
GET    /api/inventario             (stock actual de todos los productos)
POST   /api/inventario/entrada     (registrar compra/entrada)
POST   /api/inventario/ajuste      (ajuste manual de stock)
GET    /api/inventario/movimientos ?producto_id=&tipo=&fecha_inicio=

# Proveedores
GET    /api/proveedores
POST   /api/proveedores
PUT    /api/proveedores/:id

# Caja
GET    /api/caja/estado            (caja abierta o cerrada hoy)
POST   /api/caja/abrir
POST   /api/caja/cerrar
GET    /api/caja/historial

# Reportes
GET    /api/reportes/ventas-dia    ?fecha=
GET    /api/reportes/ventas-mes    ?mes=&anio=
GET    /api/reportes/productos-mas-vendidos
GET    /api/reportes/stock-valorizado

# Usuarios (admin)
GET    /api/usuarios
POST   /api/usuarios
PUT    /api/usuarios/:id
PATCH  /api/usuarios/:id/estado
DELETE /api/usuarios/:id
```

---

## 7. FLUJOS PRINCIPALES

### Flujo de Venta
```
1. Vendedor abre módulo de ventas (POS)
2. Busca cliente por DNI (opcional, puede ser venta anónima)
3. Busca productos por nombre/código/IMEI
4. Agrega productos al carrito
5. Aplica descuentos si corresponde
6. Selecciona método de pago
7. Selecciona tipo de comprobante
8. POST /api/ventas con todo el detalle
9. Backend:
   a. Verifica stock disponible
   b. Descuenta stock de cada producto
   c. Registra movimiento de inventario
   d. Crea venta + detalle_ventas
   e. Asocia a caja abierta
10. Frontend muestra resumen + vuelto
11. Opción de imprimir/enviar boleta PDF
```

### Flujo de Entrada de Inventario
```
1. Almacenero registra llegada de mercadería
2. Selecciona proveedor
3. Agrega productos con cantidad e IMEIs
4. POST /api/inventario/entrada
5. Backend actualiza stock_actual de cada producto
6. Registra movimiento tipo 'entrada'
7. Agrega IMEIs al imei_list del producto
```

### Flujo de Apertura/Cierre de Caja
```
Apertura:
1. Vendedor ingresa monto inicial en efectivo
2. POST /api/caja/abrir
3. Sistema crea registro de caja con estado 'abierta'

Cierre:
1. Vendedor cuenta efectivo en caja
2. POST /api/caja/cerrar con monto_cierre
3. Sistema calcula diferencia vs ventas del día
4. Genera reporte de cierre
```

---

## 8. VARIABLES DE ENTORNO (.env)

```env
# MongoDB
MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/celulares_db

# JWT
JWT_SECRET=cadena_aleatoria_muy_larga_y_segura

# Admin inicial
ADMIN_PASSWORD=password_admin_seguro

# CORS
ALLOWED_ORIGINS=http://localhost:3000,https://tu-tienda.netlify.app

# Cloudinary (fotos de productos)
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret

# DECOLECTA (consulta DNI, opcional)
DECOLECTA_URL=https://api.decolecta.com
DECOLECTA_API_KEY=tu_api_key

# Entorno
NODE_ENV=production
PORT=3000
```

---

## 9. ESTRUCTURA DE ARCHIVOS DEL PROYECTO

```
celulares-sistema/
├── .env
├── .env.example
├── .gitignore
├── netlify.toml
├── package.json
├── server.js
├── functions/
│   ├── auth.js
│   ├── productos.js
│   ├── ventas.js
│   ├── clientes.js
│   ├── inventario.js
│   ├── proveedores.js
│   ├── caja.js
│   ├── reportes.js
│   ├── usuarios.js
│   └── generar-pdf.js
└── public/
    ├── index.html
    ├── dashboard.html
    ├── css/
    │   ├── style.css
    │   ├── pos.css
    │   └── reportes.css
    ├── images/
    │   └── logo.png
    └── js/
        ├── auth.js
        ├── api.js
        ├── config.js
        ├── ui.js
        ├── helpers.js
        └── modules/
            ├── productos.js
            ├── ventas.js
            ├── clientes.js
            ├── inventario.js
            ├── proveedores.js
            ├── caja.js
            ├── reportes.js
            └── usuarios.js
```

---

## 10. DIFERENCIAS CLAVE VS SISTEMA DE REPARACIONES

| Aspecto | Reparaciones | Celulares |
|---------|-------------|-----------|
| Entidad central | Orden de servicio | Venta / Producto |
| Stock | No aplica | Crítico (IMEI tracking) |
| Comprobantes | Reporte PDF | Boleta / Factura |
| Caja | No tiene | Apertura/cierre diario |
| Roles | admin / usuario | admin / vendedor / almacen |
| Cache TTL | Sin TTL | TTL automático por módulo |
| Proveedores | No tiene | Gestión completa |
| Descuentos | No tiene | Por item y por venta |
