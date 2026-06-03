require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const morgan = require('morgan');
const compression = require('compression');

// Inicializar configuración de Cloudinary al arrancar la app
require('./config/cloudinary');

const app = express();

// ─── TRUST PROXY ─────────────────────────────────────────────────────────────
// Requerido para rate limiting y IP real detrás de reverse proxy (Nginx, LB)
app.set('trust proxy', 1);

// ─── SECURITY HEADERS ────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // Deshabilitado para compatibilidad con inline scripts del frontend
  crossOriginEmbedderPolicy: false,
}));

// ─── NOSQL INJECTION SANITIZE ────────────────────────────────────────────────
app.use(mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`[SECURITY] Intento de NoSQL injection detectado en ${req.method} ${req.originalUrl}: campo "${key}" eliminado`);
  },
}));

// ─── LOGGING ─────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ─── COMPRESSION ─────────────────────────────────────────────────────────────
app.use(compression());

// ─── CORS ────────────────────────────────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:3000'];

app.use(
  cors({
    origin: (origin, callback) => {
      // En producción, rechazar peticiones sin origin (Postman, curl, SSRF)
      // En desarrollo, permitir peticiones sin origin para debugging
      if (!origin && process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else if (!origin) {
        callback(new Error('Origen no permitido: petición sin header Origin en producción'));
      } else if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origen no permitido por CORS: ${origin}`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ─── BODY PARSERS ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ─── ARCHIVOS ESTÁTICOS ───────────────────────────────────────────────────────
// Dashboard no debe ser cacheado por el navegador
app.use('/dashboard.html', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

app.use(express.static(path.join(__dirname, '../public')));

// Servir el catálogo estático desde la carpeta hermana (opcional, para evitar CORS local)
app.use('/catalogo', express.static(path.join(__dirname, '../../Catalogo-panda')));

// ─── RUTAS API ────────────────────────────────────────────────────────────────
// Módulo de autenticación (JWT)
app.use('/api/auth', require('./routes/auth'));

// Módulo de categorías (MongoDB)
app.use('/api/categorias', require('./routes/categorias'));

// Módulo de productos (MongoDB)
app.use('/api/productos', require('./routes/productos'));

// Módulo de clientes (MongoDB)
app.use('/api/clientes', require('./routes/clientes'));

// Módulo de ventas (MongoDB)
app.use('/api/ventas', require('./routes/ventas'));

// Módulo de proveedores (MongoDB)
app.use('/api/proveedores', require('./routes/proveedores'));

// Módulo de pedidos (MongoDB)
app.use('/api/pedidos', require('./routes/pedidos'));

// Módulo de dashboard (MongoDB)
app.use('/api/dashboard', require('./routes/dashboard'));

// Módulo de reportes (MongoDB)
app.use('/api/reportes', require('./routes/reportes'));

// Módulo de usuarios (MongoDB)
app.use('/api/usuarios', require('./routes/usuarios'));

// Módulo de configuración (MongoDB)
app.use('/api/configuracion', require('./routes/configuracion'));

// ─── RUTA DE INFORMACIÓN DE LA API ───────────────────────────────────────────
// Solo accesible en desarrollo; en producción oculta la superficie de la API
if (process.env.NODE_ENV !== 'production') {
  app.get('/api', (req, res) => {
    res.json({
      mensaje: 'API Sistema de Gestión Panta Tec',
      version: '2.0.0',
      estado: 'en migración a MongoDB Atlas',
      endpoints: {
        auth: {
          'POST /api/auth/login': 'Iniciar sesión (retorna JWT)',
          'GET /api/auth/verificar': 'Verificar token activo',
        },
        dashboard: {
          'GET /api/dashboard': 'Métricas del día',
        },
        categorias: {
          'GET /api/categorias': 'Listar categorías activas',
          'POST /api/categorias': 'Crear categoría (admin)',
          'PUT /api/categorias/:id': 'Editar categoría (admin)',
          'DELETE /api/categorias/:id': 'Eliminar categoría (admin)',
        },
        productos: {
          'GET /api/productos': 'Listar productos con filtros',
          'POST /api/productos': 'Crear producto (admin, almacen)',
          'GET /api/productos/stock-bajo': 'Productos con stock bajo',
          'GET /api/productos/:id': 'Detalle de producto',
          'PUT /api/productos/:id': 'Editar producto (admin, almacen)',
          'DELETE /api/productos/:id': 'Eliminar producto (admin, almacen)',
        },
        ventas: {
          'GET /api/ventas': 'Listar ventas con filtros',
          'POST /api/ventas': 'Registrar venta',
          'GET /api/ventas/:id': 'Detalle de venta',
          'PUT /api/ventas/:id/anular': 'Anular venta (admin)',
        },
        clientes: {
          'GET /api/clientes': 'Listar clientes',
          'POST /api/clientes': 'Crear cliente',
          'GET /api/clientes/dni/:dni': 'Consultar RENIEC por DNI',
          'GET /api/clientes/:id': 'Detalle + historial de ventas',
          'PUT /api/clientes/:id': 'Editar cliente',
          'DELETE /api/clientes/:id': 'Eliminar cliente (admin)',
        },
        proveedores: {
          'GET /api/proveedores': 'Listar proveedores',
          'POST /api/proveedores': 'Crear proveedor',
          'PUT /api/proveedores/:id': 'Editar proveedor',
        },
        pedidos: {
          'GET /api/pedidos': 'Listar pedidos con filtros',
          'POST /api/pedidos': 'Crear pedido',
          'PUT /api/pedidos/:id/recibir': 'Marcar pedido como recibido',
        },
        reportes: {
          'GET /api/reportes/ventas-dia': 'Reporte ventas del día (admin)',
          'GET /api/reportes/ventas-mes': 'Reporte ventas del mes (admin)',
          'GET /api/reportes/productos-mas-vendidos': 'Top 10 productos (admin)',
          'GET /api/reportes/stock-valorizado': 'Stock valorizado (admin)',
        },
        usuarios: {
          'GET /api/usuarios': 'Listar usuarios (admin)',
          'POST /api/usuarios': 'Crear usuario (admin)',
          'PUT /api/usuarios/:id': 'Editar usuario (admin)',
          'PATCH /api/usuarios/:id/estado': 'Activar/desactivar usuario (admin)',
          'DELETE /api/usuarios/:id': 'Eliminar usuario (admin)',
        },
        configuracion: {
          'GET /api/configuracion/publica': 'Datos básicos de la tienda (público)',
          'GET /api/configuracion': 'Configuración completa (admin)',
          'PUT /api/configuracion': 'Guardar configuración (admin)',
        },
      },
    });
  });
}

// ─── MANEJO DE ERRORES GLOBAL ─────────────────────────────────────────────────
// Ruta no encontrada
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Error handler general
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err.stack);

  // Error de CORS
  if (err.message && err.message.startsWith('Origen no permitido')) {
    return res.status(403).json({ error: err.message });
  }

  res.status(500).json({ error: 'Error interno del servidor' });
});

module.exports = app;
