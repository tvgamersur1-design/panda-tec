# Plan de Implementación: Sistema de Gestión Panta Tec

## Visión General

Migración del sistema actual (JSON + app.js monolítico) hacia una arquitectura con MongoDB Atlas, autenticación JWT, módulos ES6 en el frontend y ocho módulos funcionales completos. El backend usa Node.js + Express + Mongoose y el frontend usa HTML + CSS + ES6 Modules vanilla.

## Tareas

- [x] 1. Configuración base del proyecto y conexión a MongoDB
  - Crear `server.js` como entry point con arranque del servidor Express
  - Crear `src/app.js` con configuración de Express, CORS, body-parser y middlewares globales
  - Crear `src/config/db.js` con conexión Mongoose a `MONGODB_URI` del `.env`
  - Crear `src/config/cloudinary.js` con configuración del SDK de Cloudinary
  - Crear `.env.example` con todas las variables requeridas documentadas
  - Instalar dependencias: `express`, `mongoose`, `jsonwebtoken`, `bcryptjs`, `cloudinary`, `multer`, `express-rate-limit`, `axios`, `dotenv`
  - _Requisitos: 11.1, 11.2, 4.3a_

- [x] 2. Modelos Mongoose
  - [x] 2.1 Crear modelos base: `Usuario`, `Categoria`, `Producto`
    - `src/models/Usuario.js`: campos según diseño, índices en `usuario` y `correo`, hash bcryptjs en pre-save
    - `src/models/Categoria.js`: campos según diseño, índice único en `nombre`
    - `src/models/Producto.js`: campos según diseño, índices en `nombre` (text), `categoria_id`, `estado`, `stock_actual`
    - _Requisitos: 1.8, 3.1, 4.1, 4.2_

  - [x] 2.2 Crear modelos de transacciones: `Venta`, `DetalleVenta`, `MovimientoInventario`
    - `src/models/Venta.js`: campos según diseño, índices en `numero_venta`, `cliente_id`, `vendedor_id`, `fecha_venta`, `estado`
    - `src/models/DetalleVenta.js`: campos según diseño, índices en `venta_id` y `producto_id`
    - `src/models/MovimientoInventario.js`: campos según diseño, índices en `producto_id + fecha` y `referencia_id`
    - _Requisitos: 5.10, 5.12, 4.4_

  - [x] 2.3 Crear modelos restantes: `Cliente`, `Proveedor`, `Pedido`, `Configuracion`, `LoginAttempt`
    - `src/models/Cliente.js`: DNI con regex `/^\d{8}$/`, índice único en `dni`, índice text en nombre+apellido
    - `src/models/Proveedor.js` y `src/models/Pedido.js`: campos según diseño
    - `src/models/Configuracion.js`: RUC con regex `/^\d{11}$/`
    - `src/models/LoginAttempt.js`: índice TTL en `timestamp` con `expireAfterSeconds: 900`
    - _Requisitos: 6.1, 7.1, 7.3, 10.1, 10.2, 1.3_

  - [ ]* 2.4 Escribir tests de propiedad para validaciones de modelos
    - **Propiedad 9: DNI de cliente es único en el sistema**
    - **Propiedad 12: Validación de RUC es estricta**
    - **Valida: Requisitos 6.2, 10.2, 10.3**

- [x] 3. Middlewares de autenticación y control de acceso
  - [x] 3.1 Implementar `src/middlewares/auth.js`
    - Verificar JWT del header `Authorization: Bearer <token>`
    - Retornar HTTP 401 si token ausente, expirado o inválido
    - Adjuntar `req.user = { id, usuario, rol }` para uso en controllers
    - _Requisitos: 1.4, 1.5_

  - [x] 3.2 Implementar `src/middlewares/roles.js`
    - Fábrica que recibe array de roles permitidos
    - Retornar HTTP 403 si `req.user.rol` no está en la lista
    - _Requisitos: 1.6, 1.7_

  - [x] 3.3 Implementar `src/middlewares/upload.js`
    - Configurar multer con `memoryStorage` y límite de 2MB
    - Aceptar solo `image/jpeg`, `image/png`, `image/webp`
    - Subir buffer a Cloudinary y adjuntar URL segura a `req.cloudinaryUrl`
    - Retornar HTTP 413 si supera 2MB, HTTP 415 si tipo no permitido
    - _Requisitos: 4.3a_

  - [ ]* 3.4 Escribir tests de propiedad para control de acceso
    - **Propiedad 3: Control de acceso por rol es exhaustivo**
    - **Valida: Requisitos 1.6, 1.7**

- [x] 4. Módulo de autenticación
  - [x] 4.1 Implementar `src/controllers/authController.js`
    - `login`: verificar credenciales, generar JWT con `{ id, usuario, rol }` y duración 8h
    - Retornar HTTP 401 con mensaje genérico `"Credenciales inválidas"` si falla (sin revelar si usuario existe)
    - Verificar que usuario esté activo; retornar HTTP 401 con mensaje de cuenta inactiva si no
    - `verificar`: endpoint para validar token activo
    - _Requisitos: 1.1, 1.2, 9.6_

  - [x] 4.2 Configurar rate limiting en login
    - Aplicar `express-rate-limit` con store MongoDB en colección `login_attempts`
    - Límite: 10 intentos por IP en ventana de 15 minutos, retornar HTTP 429 al superar
    - _Requisitos: 1.3_

  - [x] 4.3 Crear `src/routes/auth.js` y registrar en `src/app.js`
    - `POST /api/auth/login` (público, con rate limiter)
    - `GET /api/auth/verificar` (autenticado)
    - _Requisitos: 1.1, 1.4_

  - [ ]* 4.4 Escribir tests de propiedad para autenticación
    - **Propiedad 1: Autenticación con credenciales válidas genera JWT**
    - **Propiedad 2: Rate limiting bloquea intentos excesivos**
    - **Propiedad 13: Contraseñas siempre almacenadas como hash**
    - **Valida: Requisitos 1.1, 1.3, 1.8, 9.2**

- [x] 5. Checkpoint — Verificar que autenticación y middlewares funcionan
  - Asegurar que todos los tests pasen. Consultar al usuario si surgen dudas.

- [x] 6. Módulo de Categorías y Productos
  - [x] 6.1 Implementar `src/controllers/categoriasController.js`
    - `listar`: retornar categorías activas
    - `crear`: validar nombre único (HTTP 409 si duplicado), crear documento
    - `editar`: actualizar nombre y descripción
    - `eliminar`: verificar que no tenga productos asociados (HTTP 409 si tiene), eliminar
    - _Requisitos: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 6.2 Implementar `src/controllers/productosController.js`
    - `listar`: filtros por `?categoria=&search=&estado=`, excluir `eliminado: true`
    - `crear`: validar campos, subir imagen vía `req.cloudinaryUrl`, registrar `MovimientoInventario` tipo `ajuste` si stock inicial > 0
    - `detalle`: retornar producto por ID
    - `editar`: actualizar campos, reemplazar imagen en Cloudinary si se envía nueva, registrar `MovimientoInventario` tipo `ajuste` si cambia stock
    - `eliminar`: soft delete (`eliminado: true`)
    - `stockBajo`: retornar productos con `stock_actual <= stock_minimo`
    - _Requisitos: 4.1, 4.2, 4.3, 4.3a, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11_

  - [x] 6.3 Crear rutas `src/routes/categorias.js` y `src/routes/productos.js`, registrar en `src/app.js`
    - Aplicar middlewares `auth` y `roles` según tabla de endpoints del diseño
    - `GET /api/productos/stock-bajo` debe registrarse antes de `GET /api/productos/:id`
    - _Requisitos: 3.6, 4.10, 4.11_

  - [ ]* 6.4 Escribir tests de propiedad para stock bajo
    - **Propiedad 5: Stock bajo detectado correctamente**
    - **Valida: Requisitos 2.3, 4.7, 4.9**

- [x] 7. Módulo de Clientes
  - [x] 7.1 Implementar `src/controllers/clientesController.js`
    - `listar`: búsqueda por `?search=` en nombre, apellido o DNI
    - `crear`: validar DNI único (HTTP 409 si duplicado), crear documento
    - `detalle`: retornar cliente + historial de ventas asociadas ordenadas por `fecha_venta` desc
    - `editar`: actualizar campos del cliente
    - `eliminar`: soft delete
    - `consultarDNI`: llamar a `RENIEC_API_URL` con header `RENIEC_API_KEY`; si falla retornar `{ encontrado: false, mensaje }`
    - _Requisitos: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_

  - [x] 7.2 Crear `src/routes/clientes.js` y registrar en `src/app.js`
    - `GET /api/clientes/dni/:dni` debe registrarse antes de `GET /api/clientes/:id`
    - _Requisitos: 6.3, 6.4_

  - [ ]* 7.3 Escribir tests unitarios para consulta RENIEC
    - Caso: respuesta exitosa autocompleta campos
    - Caso: timeout o error retorna `{ encontrado: false }`
    - _Requisitos: 6.3, 6.4_

- [x] 8. Punto de Venta (POS) — Backend
  - [x] 8.1 Implementar `src/controllers/ventasController.js`
    - `listar`: filtros por `?desde=&hasta=&estado=&metodo_pago=`
    - `crear`: operación atómica en transacción MongoDB — verificar stock, decrementar `stock_actual`, crear `Venta`, crear `DetalleVenta[]`, crear `MovimientoInventario` tipo `salida` por cada ítem; si stock insuficiente retornar HTTP 409 con nombre del producto y hacer rollback
    - `detalle`: retornar venta con sus ítems
    - `anular`: solo rol `admin`; cambiar estado a `anulada`, registrar motivo y fecha, restaurar stock, crear `MovimientoInventario` tipo `devolucion`; HTTP 409 si ya anulada
    - Generar `numero_venta` secuencial formato `V-YYYY-NNN`
    - _Requisitos: 5.2, 5.3, 5.10, 5.11, 5.12, 5.13, 5.14, 5.15, 5.16, 5.17, 11.1_

  - [x] 8.2 Crear `src/routes/ventas.js` y registrar en `src/app.js`
    - _Requisitos: 5.10, 5.15_

  - [ ]* 8.3 Escribir tests de propiedad para registro de venta
    - **Propiedad 6: Registro de venta descuenta stock atómicamente**
    - **Propiedad 7: Anulación de venta restaura stock completamente**
    - **Propiedad 8: Cálculo de descuento es correcto y seguro**
    - **Valida: Requisitos 5.6, 5.7, 5.10, 5.12, 5.15, 5.17, 11.1**

- [x] 9. Checkpoint — Verificar que el flujo de ventas funciona correctamente
  - Asegurar que todos los tests pasen. Consultar al usuario si surgen dudas.

- [x] 10. Módulo de Pedidos a Proveedores
  - [x] 10.1 Implementar `src/controllers/proveedoresController.js`
    - `listar`, `crear`, `editar`: CRUD básico de proveedores
    - _Requisitos: 7.1, 7.2_

  - [x] 10.2 Implementar `src/controllers/pedidosController.js`
    - `listar`: filtros por `?estado=&proveedor_id=`
    - `crear`: asignar estado `pendiente` y `fecha_creacion`
    - `recibir`: operación atómica — verificar estado != `recibido` (HTTP 409 si ya recibido), incrementar `stock_actual` de cada producto, crear `MovimientoInventario` tipo `entrada` referenciando el pedido, actualizar estado y `fecha_recepcion`
    - _Requisitos: 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10, 11.2_

  - [x] 10.3 Crear rutas `src/routes/proveedores.js` y `src/routes/pedidos.js`, registrar en `src/app.js`
    - _Requisitos: 7.10_

  - [ ]* 10.4 Escribir tests de propiedad para recepción de pedido
    - **Propiedad 10: Recepción de pedido incrementa stock atómicamente**
    - **Valida: Requisitos 7.5, 7.6, 11.2**

- [x] 11. Módulo de Dashboard
  - [x] 11.1 Implementar `src/controllers/dashboardController.js`
    - Consultar ventas con `estado: 'completada'` y `fecha_venta` en el día en curso
    - Retornar: total de ventas del día, monto total, productos con stock bajo, últimas 5 ventas
    - Si no hay ventas del día, retornar ceros en contadores
    - _Requisitos: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 11.2 Crear `src/routes/dashboard.js` y registrar en `src/app.js`
    - _Requisitos: 2.1_

  - [ ]* 11.3 Escribir tests de propiedad para métricas del dashboard
    - **Propiedad 4: Métricas del dashboard reflejan solo ventas completadas del día**
    - **Valida: Requisito 2.2**

- [x] 12. Módulo de Reportes
  - [x] 12.1 Implementar `src/controllers/reportesController.js`
    - `ventasDia`: `?fecha=YYYY-MM-DD` — total ventas completadas, monto total, desglose por método de pago
    - `ventasMes`: `?mes=MM&anio=YYYY` — total ventas, monto total, desglose diario
    - `productosMasVendidos`: `?desde=&hasta=` — top 10 productos por unidades vendidas
    - `stockValorizado`: lista de productos activos con `stock_actual × precio_compra`
    - _Requisitos: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 12.2 Crear `src/routes/reportes.js` y registrar en `src/app.js`
    - Solo rol `admin` en todos los endpoints
    - _Requisitos: 8.5_

- [x] 13. Módulo de Usuarios y Configuración
  - [x] 13.1 Implementar `src/controllers/usuariosController.js`
    - `listar`, `crear` (hash bcryptjs, HTTP 409 si usuario/correo duplicado), `editar` (nombre, correo, rol), `cambiarEstado` (activar/desactivar), `eliminar` (soft delete)
    - Antes de desactivar o eliminar: verificar que no sea el último admin activo (HTTP 409 si lo es)
    - _Requisitos: 9.1, 9.2, 9.3, 9.4, 9.5, 9.7, 9.8, 9.9_

  - [x] 13.2 Implementar `src/controllers/configuracionController.js`
    - `publica`: endpoint sin autenticación, retorna nombre y datos básicos
    - `obtener`: datos completos (solo admin)
    - `guardar`: validar RUC con regex `/^\d{11}$/` (HTTP 400 si inválido), upsert del documento singleton
    - _Requisitos: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [x] 13.3 Crear rutas `src/routes/usuarios.js` y `src/routes/configuracion.js`, registrar en `src/app.js`
    - _Requisitos: 9.8, 10.5_

  - [ ]* 13.4 Escribir tests de propiedad para protección del último admin y validación de RUC
    - **Propiedad 14: Último admin activo protegido**
    - **Propiedad 12: Validación de RUC es estricta**
    - **Valida: Requisitos 9.9, 10.2, 10.3**

- [x] 14. Checkpoint — Verificar que todos los módulos backend funcionan
  - Asegurar que todos los tests pasen. Consultar al usuario si surgen dudas.

- [x] 15. Script de migración JSON → MongoDB
  - [x] 15.1 Implementar `scripts/migrate.js`
    - Leer `data/categorias.json`, `data/productos.json`, `data/ventas.json`, `data/detalles_venta.json`
    - Mapear y transformar según estrategia del diseño (nuevos ObjectId, referencias cruzadas)
    - Procesar cada registro en `try/catch` individual; escribir errores en `scripts/migration-errors.log`
    - Imprimir resumen `{ migrados, errores }` por colección al finalizar
    - _Requisitos: 11.3, 11.4_

  - [x] 15.2 Implementar verificación round-trip en el script
    - Tras insertar cada lote, contar documentos en MongoDB y comparar con registros válidos del JSON
    - Registrar discrepancias en el log de errores
    - _Requisitos: 11.5_

  - [ ]* 15.3 Escribir tests de propiedad para migración
    - **Propiedad 11: Migración preserva todos los registros (round-trip)**
    - **Valida: Requisitos 11.3, 11.5**

- [x] 16. Frontend — Módulo `api.js` y `auth.js`
  - [x] 16.1 Implementar `public/js/api.js`
    - Wrapper fetch que adjunta automáticamente el JWT del `localStorage` en header `Authorization`
    - Ante HTTP 401: limpiar JWT del storage y redirigir a `/index.html`
    - Exponer métodos: `api.get`, `api.post`, `api.put`, `api.patch`, `api.delete`, `api.postForm`
    - _Requisitos: 12.2, 12.3_

  - [x] 16.2 Implementar `public/js/auth.js`
    - Formulario de login: llamar a `POST /api/auth/login`, guardar JWT en `localStorage`, redirigir a `dashboard.html`
    - Logout: eliminar JWT del `localStorage` y redirigir a `index.html`
    - Cargar nombre de tienda desde `GET /api/configuracion/publica` en la pantalla de login
    - _Requisitos: 1.9, 10.4, 12.1_

  - [x] 16.3 Crear `public/index.html` con formulario de login y estructura base
    - Mostrar indicador de carga mientras se procesa el login
    - Mostrar toast de error si las credenciales son incorrectas
    - _Requisitos: 12.4, 12.5_

- [x] 17. Frontend — Dashboard y módulos principales
  - [x] 17.1 Implementar `public/js/dashboard.js` y `public/dashboard.html`
    - Llamar a `GET /api/dashboard` al cargar y al regresar al módulo
    - Mostrar: ventas del día, ingresos del día, alertas de stock bajo, últimas 5 ventas
    - Mostrar skeleton screen mientras carga
    - _Requisitos: 2.1, 2.2, 2.3, 2.4, 2.6, 12.4_

  - [x] 17.2 Implementar `public/js/modules/productos.js`
    - CRUD de productos con formulario de imagen (multipart)
    - Búsqueda en tiempo real por nombre/categoría
    - Indicadores visuales de stock bajo y agotado
    - _Requisitos: 4.1, 4.3, 4.6, 4.7, 4.8, 12.1, 12.4, 12.5_

  - [x] 17.3 Implementar `public/js/modules/ventas.js` (POS)
    - Búsqueda de productos con debounce de 500ms
    - Carrito con recálculo en tiempo real de subtotales y total
    - Aplicar descuento por porcentaje o monto fijo con validaciones
    - Selector de método de pago; calcular vuelto en tiempo real si es efectivo
    - Confirmar venta y limpiar carrito al éxito; mostrar resumen
    - _Requisitos: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.13, 5.14, 12.4, 12.5_

- [x] 18. Frontend — Módulos secundarios
  - [x] 18.1 Implementar `public/js/modules/clientes.js`
    - CRUD de clientes con autocompletado RENIEC al ingresar DNI de 8 dígitos
    - Mostrar historial de ventas en detalle del cliente
    - _Requisitos: 6.1, 6.3, 6.4, 6.7, 6.8, 12.1_

  - [x] 18.2 Implementar `public/js/modules/pedidos.js`
    - Gestión de proveedores y pedidos
    - Botón "Marcar como recibido" con confirmación
    - Filtros por estado y proveedor
    - _Requisitos: 7.1, 7.3, 7.5, 7.9, 12.1_

  - [x] 18.3 Implementar `public/js/modules/reportes.js`
    - Formularios de filtro por fecha para cada tipo de reporte
    - Mostrar resultados en tablas con totales
    - _Requisitos: 8.1, 8.2, 8.3, 8.4, 12.1_

  - [x] 18.4 Implementar `public/js/modules/usuarios.js` y `public/js/modules/configuracion.js`
    - Gestión de usuarios con activar/desactivar y cambio de rol
    - Formulario de configuración de tienda con validación de RUC en frontend
    - _Requisitos: 9.1, 9.4, 9.5, 10.1, 12.1_

- [x] 19. Accesibilidad y estilos
  - [x] 19.1 Crear `public/css/style.css` y `public/css/pos.css`
    - Garantizar contraste mínimo 4.5:1 entre texto y fondo
    - Estilos para skeleton screens, toasts de notificación y estados de carga
    - _Requisitos: 12.4, 12.5, 12.6_

  - [x] 19.2 Verificar accesibilidad por teclado en todos los elementos interactivos
    - Asegurar que formularios, botones y tablas sean navegables con Tab y Enter
    - Agregar atributos `aria-label` donde corresponda
    - _Requisitos: 12.6_

- [x] 20. Checkpoint final — Verificar sistema completo
  - Asegurar que todos los tests pasen. Consultar al usuario si surgen dudas.

## Notas

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido
- Cada tarea referencia los requisitos específicos para trazabilidad
- Los tests de propiedad usan `fast-check` con mínimo 100 iteraciones cada uno
- Las transacciones MongoDB requieren un replica set; MongoDB Atlas lo provee por defecto
- El script de migración se ejecuta una sola vez con `node scripts/migrate.js`
