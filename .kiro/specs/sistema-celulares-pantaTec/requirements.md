# Documento de Requisitos
## Sistema de Gestión Panta Tec

## Introducción

Panta Tec requiere migrar su sistema de gestión de tienda de celulares desde una arquitectura basada en archivos JSON hacia una solución robusta con MongoDB Atlas. El nuevo sistema cubre ocho módulos: Dashboard, Productos y Categorías, Punto de Venta (POS), Clientes, Pedidos a Proveedores, Reportes, Usuarios y Configuración. Incorpora autenticación JWT con tres roles (admin, vendedor, almacen), integración con la API RENIEC para consulta de DNI, y un frontend modular en ES6 que reemplaza el `app.js` monolítico actual.

---

## Glosario

- **Sistema**: El sistema de gestión web de Panta Tec (backend Node.js + Express + MongoDB Atlas, frontend ES6 Modules).
- **API**: El servidor Express que expone los endpoints REST del Sistema.
- **Auth_Service**: El módulo de autenticación basado en JWT + bcryptjs.
- **POS**: Punto de Venta, el módulo de registro de ventas en tiempo real.
- **Carrito**: Estructura temporal en memoria del frontend que acumula los ítems de una venta en curso.
- **Producto**: Artículo del catálogo con nombre, precio, stock y stock_minimo.
- **Categoria**: Agrupación lógica de Productos (ej. Smartphones, Accesorios, Tablets).
- **Venta**: Transacción comercial registrada en MongoDB con sus ítems, método de pago y estado.
- **Detalle_Venta**: Documento MongoDB que representa un ítem dentro de una Venta (producto, cantidad, precio, descuento).
- **Cliente**: Persona registrada en el sistema con datos personales y DNI.
- **Proveedor**: Empresa o persona que suministra Productos a la tienda.
- **Pedido**: Solicitud de reposición de stock enviada a un Proveedor.
- **Movimiento_Inventario**: Registro de cada cambio de stock (entrada, salida, ajuste).
- **Reporte**: Agregación de datos de ventas, stock o productos generada bajo demanda.
- **Usuario**: Cuenta de acceso al Sistema con rol asignado.
- **Rol**: Nivel de permisos de un Usuario: `admin`, `vendedor` o `almacen`.
- **JWT**: JSON Web Token usado para autenticar cada petición al API.
- **RENIEC_API**: Servicio externo de consulta de datos personales por DNI, configurado mediante `RENIEC_API_URL` y `RENIEC_API_KEY` en el archivo `.env`.
- **Stock_Minimo**: Umbral de stock de un Producto por debajo del cual el Sistema genera una alerta.
- **Descuento**: Reducción aplicada al precio de un ítem o al total de una Venta, expresada como porcentaje o monto fijo.
- **Metodo_Pago**: Forma de pago aceptada: `efectivo`, `tarjeta`, `yape`, `plin` o `transferencia`.
- **Soft_Delete**: Marcado lógico de un documento como eliminado (`eliminado: true`) sin borrarlo físicamente de MongoDB.
- **Dashboard**: Vista principal del Sistema que muestra métricas del día, alertas de stock y últimas ventas.
- **Configuracion**: Módulo que almacena los datos de la tienda y parámetros generales del Sistema.

---

## Requisitos

### Requisito 1: Autenticación y Control de Acceso

**User Story:** Como usuario del sistema, quiero iniciar sesión con mis credenciales y que el sistema reconozca mi rol, para que solo pueda acceder a las funciones que me corresponden.

#### Criterios de Aceptación

1. WHEN un usuario envía credenciales válidas al endpoint de login, THE Auth_Service SHALL generar un JWT firmado con duración de 8 horas que incluya el identificador del usuario, su nombre de usuario y su rol.
2. WHEN un usuario envía credenciales incorrectas, THE Auth_Service SHALL retornar un error HTTP 401 sin revelar si el usuario existe o no.
3. WHEN una misma IP realiza más de 10 intentos de login fallidos en un período de 15 minutos, THE Auth_Service SHALL bloquear los intentos subsiguientes desde esa IP y retornar HTTP 429 hasta que expire el período.
4. WHEN una petición al API incluye un JWT válido en el header `Authorization: Bearer <token>`, THE API SHALL procesar la petición según los permisos del rol del usuario.
5. WHEN una petición al API incluye un JWT expirado o inválido, THE API SHALL retornar HTTP 401.
6. WHEN un usuario con rol `vendedor` intenta acceder a un endpoint reservado para `admin` o `almacen`, THE API SHALL retornar HTTP 403.
7. WHEN un usuario con rol `almacen` intenta acceder a un endpoint de ventas o reportes, THE API SHALL retornar HTTP 403.
8. THE Auth_Service SHALL almacenar las contraseñas de los usuarios usando bcryptjs con un factor de costo mínimo de 10.
9. WHEN un usuario cierra sesión en el frontend, THE Sistema SHALL eliminar el JWT del almacenamiento local del navegador y redirigir al login.

---

### Requisito 2: Dashboard

**User Story:** Como vendedor o administrador, quiero ver un resumen del día al ingresar al sistema, para tomar decisiones rápidas sobre ventas y stock.

#### Criterios de Aceptación

1. WHEN un usuario autenticado accede al Dashboard, THE Sistema SHALL mostrar el número total de ventas completadas del día en curso.
2. WHEN un usuario autenticado accede al Dashboard, THE Sistema SHALL mostrar el monto total de ingresos del día en curso, sumando únicamente las ventas con estado `completada`.
3. WHEN un usuario autenticado accede al Dashboard, THE Sistema SHALL mostrar la lista de Productos cuyo stock actual es menor o igual a su Stock_Minimo.
4. WHEN un usuario autenticado accede al Dashboard, THE Sistema SHALL mostrar las últimas 5 ventas completadas ordenadas de más reciente a más antigua.
5. IF no existen ventas en el día en curso, THEN THE Dashboard SHALL mostrar cero en los contadores de ventas e ingresos del día.
6. WHILE el usuario permanece en el Dashboard, THE Sistema SHALL actualizar las métricas del día sin requerir recarga manual de la página cuando el usuario regresa al Dashboard desde otro módulo.

---

### Requisito 3: Gestión de Categorías

**User Story:** Como administrador, quiero gestionar las categorías de productos, para organizar el catálogo de la tienda.

#### Criterios de Aceptación

1. THE Sistema SHALL permitir crear una Categoria con nombre y descripción opcionales.
2. WHEN se intenta crear una Categoria con un nombre que ya existe, THE API SHALL retornar HTTP 409 con un mensaje descriptivo.
3. THE Sistema SHALL permitir editar el nombre y la descripción de una Categoria existente.
4. THE Sistema SHALL permitir listar todas las Categorias activas.
5. WHEN se intenta eliminar una Categoria que tiene Productos asociados, THE API SHALL retornar HTTP 409 indicando que la Categoria tiene productos y no puede eliminarse.
6. WHERE el rol del usuario es `admin`, THE Sistema SHALL permitir crear, editar y eliminar Categorias.

---

### Requisito 4: Gestión de Productos

**User Story:** Como administrador o encargado de almacén, quiero gestionar el catálogo de productos con control de stock, para mantener el inventario actualizado y recibir alertas de reposición.

#### Criterios de Aceptación

1. THE Sistema SHALL permitir crear un Producto con los campos: nombre, descripción, precio de venta, precio de compra, stock inicial, Stock_Minimo, Categoria asociada, e imagen (archivo de imagen subido por el usuario y almacenado como URL).
2. WHEN se crea un Producto sin especificar Stock_Minimo, THE API SHALL asignar el valor 0 como Stock_Minimo por defecto.
3. THE Sistema SHALL permitir editar todos los campos de un Producto existente, incluyendo reemplazar o eliminar su imagen.
3a. WHEN se sube una imagen para un Producto, THE API SHALL aceptar archivos de tipo JPG, PNG o WEBP con un tamaño máximo de 2MB, subirlos a Cloudinary usando las credenciales `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` y `CLOUDINARY_API_SECRET` del archivo `.env`, y almacenar la URL segura retornada por Cloudinary en el campo `imagen` del Producto.
4. WHEN se actualiza el stock de un Producto, THE Sistema SHALL registrar un Movimiento_Inventario de tipo `ajuste` con el stock anterior, el stock nuevo y el identificador del usuario que realizó el cambio.
5. WHEN se elimina un Producto, THE Sistema SHALL aplicar Soft_Delete marcando el campo `eliminado: true` sin borrar el documento de MongoDB.
6. THE Sistema SHALL permitir buscar Productos por nombre, descripción o Categoria.
7. WHEN el stock actual de un Producto es menor o igual a su Stock_Minimo, THE Sistema SHALL marcar ese Producto como alerta de stock bajo en el listado y en el Dashboard.
8. WHEN el stock actual de un Producto llega a cero, THE Sistema SHALL marcar ese Producto con estado `agotado`.
9. THE API SHALL exponer un endpoint que retorne únicamente los Productos con stock actual menor o igual a su Stock_Minimo.
10. WHERE el rol del usuario es `admin` o `almacen`, THE Sistema SHALL permitir crear, editar y eliminar Productos.
11. WHERE el rol del usuario es `vendedor`, THE Sistema SHALL permitir consultar Productos pero no crear, editar ni eliminar.

---

### Requisito 5: Punto de Venta (POS)

**User Story:** Como vendedor, quiero registrar ventas de forma rápida con carrito, descuentos y múltiples métodos de pago, para atender a los clientes con agilidad.

#### Criterios de Aceptación

1. WHEN un vendedor busca un Producto en el POS, THE Sistema SHALL retornar resultados que coincidan con el nombre o descripción del Producto en menos de 500ms desde que el usuario deja de escribir.
2. WHEN un vendedor agrega un Producto al Carrito, THE Sistema SHALL verificar que el stock disponible sea mayor a cero antes de permitir la adición.
3. IF el stock disponible de un Producto es insuficiente para la cantidad solicitada en el Carrito, THEN THE POS SHALL mostrar un mensaje de alerta indicando el stock disponible y no permitir continuar con esa cantidad.
4. WHEN el vendedor modifica la cantidad de un ítem en el Carrito, THE POS SHALL recalcular el subtotal del ítem y el total de la Venta en tiempo real.
5. THE POS SHALL permitir aplicar un Descuento al total de la Venta expresado como porcentaje o como monto fijo en soles.
6. WHEN se aplica un Descuento de tipo porcentaje, THE POS SHALL calcular el monto de descuento como `subtotal × (porcentaje / 100)` redondeado a dos decimales.
7. WHEN se aplica un Descuento de tipo monto fijo, THE POS SHALL verificar que el monto fijo no supere el subtotal de la Venta antes de aplicarlo.
8. THE POS SHALL aceptar los siguientes Metodos_Pago: `efectivo`, `tarjeta`, `yape`, `plin` y `transferencia`.
9. WHEN el Metodo_Pago seleccionado es `efectivo`, THE POS SHALL calcular y mostrar el vuelto como `monto_recibido − total` en tiempo real mientras el vendedor escribe el monto recibido.
10. WHEN el vendedor confirma la venta, THE API SHALL ejecutar la operación de registro de forma atómica: descontar el stock de cada Producto, crear el documento Venta y crear los documentos Detalle_Venta correspondientes.
11. IF durante el registro de la venta el stock de algún Producto resulta insuficiente, THEN THE API SHALL retornar HTTP 409 con el nombre del Producto afectado y no realizar ningún cambio en la base de datos.
12. WHEN la venta se registra exitosamente, THE Sistema SHALL registrar un Movimiento_Inventario de tipo `salida` por cada Producto vendido.
13. WHEN la venta se registra exitosamente, THE POS SHALL limpiar el Carrito y mostrar un resumen de la venta con el total cobrado y el vuelto.
14. THE POS SHALL permitir asociar un Cliente existente a la Venta de forma opcional; si no se asocia ningún Cliente, THE Sistema SHALL registrar la venta con cliente `Público general`.
15. WHEN un usuario con rol `admin` solicita anular una Venta con estado `completada`, THE API SHALL cambiar el estado a `anulada`, registrar el motivo de anulación y restaurar el stock de cada Producto involucrado.
16. IF se intenta anular una Venta que ya tiene estado `anulada`, THEN THE API SHALL retornar HTTP 409 indicando que la venta ya fue anulada.
17. WHEN se anula una Venta, THE Sistema SHALL registrar un Movimiento_Inventario de tipo `devolucion` por cada Producto de la venta anulada.

---

### Requisito 6: Gestión de Clientes

**User Story:** Como vendedor o administrador, quiero gestionar la base de clientes y consultar sus datos por DNI usando la API RENIEC, para agilizar el registro y asociar ventas a clientes identificados.

#### Criterios de Aceptación

1. THE Sistema SHALL permitir crear un Cliente con los campos obligatorios DNI (8 dígitos) y teléfono; los campos nombre, apellido paterno, apellido materno, email y dirección son opcionales.
2. WHEN se intenta crear un Cliente con un DNI que ya existe en el sistema, THE API SHALL retornar HTTP 409 con un mensaje descriptivo.
3. WHEN un usuario ingresa un DNI de 8 dígitos en el formulario de cliente, THE Sistema SHALL consultar la RENIEC_API usando las credenciales `RENIEC_API_URL` y `RENIEC_API_KEY` del archivo `.env` y autocompletar los campos opcionales de nombre y apellidos con la respuesta recibida.
4. IF la RENIEC_API retorna un error o no encuentra el DNI, THEN THE Sistema SHALL mostrar un mensaje informativo y permitir al usuario ingresar los datos manualmente.
5. THE Sistema SHALL permitir editar los datos de un Cliente existente.
6. WHEN se elimina un Cliente, THE Sistema SHALL aplicar Soft_Delete marcando el campo `eliminado: true`.
7. THE Sistema SHALL permitir buscar Clientes por nombre, apellido o DNI.
8. WHEN se consulta el detalle de un Cliente, THE Sistema SHALL mostrar el historial de ventas asociadas a ese Cliente ordenadas de más reciente a más antigua.

---

### Requisito 7: Pedidos a Proveedores

**User Story:** Como administrador o encargado de almacén, quiero registrar pedidos a proveedores y actualizar el stock automáticamente al recibirlos, para mantener el inventario reabastecido sin procesos manuales.

#### Criterios de Aceptación

1. THE Sistema SHALL permitir crear un Proveedor con los campos: nombre, teléfono de contacto y correo electrónico.
2. THE Sistema SHALL permitir editar los datos de un Proveedor existente.
3. THE Sistema SHALL permitir crear un Pedido asociado a un Proveedor, especificando una lista de Productos con sus cantidades solicitadas.
4. WHEN se crea un Pedido, THE Sistema SHALL asignarle el estado `pendiente` y registrar la fecha de creación.
5. WHEN un usuario con rol `admin` o `almacen` marca un Pedido como `recibido`, THE API SHALL incrementar el stock de cada Producto incluido en el Pedido según las cantidades registradas.
6. WHEN un Pedido es marcado como `recibido`, THE Sistema SHALL registrar un Movimiento_Inventario de tipo `entrada` por cada Producto del Pedido, referenciando el identificador del Pedido.
7. WHEN un Pedido es marcado como `recibido`, THE Sistema SHALL registrar la fecha de recepción en el documento del Pedido.
8. IF se intenta marcar como `recibido` un Pedido que ya tiene estado `recibido`, THEN THE API SHALL retornar HTTP 409 indicando que el pedido ya fue recibido.
9. THE Sistema SHALL permitir listar todos los Pedidos filtrados por estado (`pendiente` o `recibido`) y por Proveedor.
10. WHERE el rol del usuario es `admin` o `almacen`, THE Sistema SHALL permitir crear Pedidos y marcarlos como recibidos.

---

### Requisito 8: Reportes

**User Story:** Como administrador, quiero generar reportes de ventas y stock, para analizar el desempeño de la tienda y tomar decisiones de reposición.

#### Criterios de Aceptación

1. WHEN un usuario con rol `admin` solicita el reporte de ventas del día, THE Sistema SHALL retornar el total de ventas completadas, el monto total, y el desglose de ingresos por Metodo_Pago para la fecha indicada.
2. WHEN un usuario con rol `admin` solicita el reporte de ventas del mes, THE Sistema SHALL retornar el total de ventas completadas, el monto total y el desglose diario de ingresos para el mes y año indicados.
3. WHEN un usuario con rol `admin` solicita el reporte de productos más vendidos, THE Sistema SHALL retornar los 10 Productos con mayor cantidad de unidades vendidas en el período indicado, ordenados de mayor a menor.
4. WHEN un usuario con rol `admin` solicita el reporte de stock valorizado, THE Sistema SHALL retornar la lista de Productos activos con su stock actual, precio de compra y el valor total de inventario calculado como `stock_actual × precio_compra`.
5. IF un usuario con rol `vendedor` o `almacen` intenta acceder a los endpoints de reportes, THEN THE API SHALL retornar HTTP 403.

---

### Requisito 9: Gestión de Usuarios

**User Story:** Como administrador, quiero gestionar las cuentas de usuario con sus roles, para controlar quién puede acceder a cada parte del sistema.

#### Criterios de Aceptación

1. THE Sistema SHALL permitir crear un Usuario con los campos: nombre completo, nombre de usuario (único), correo electrónico (único), contraseña y rol (`admin`, `vendedor` o `almacen`).
2. WHEN se crea un Usuario, THE Auth_Service SHALL almacenar la contraseña como hash bcryptjs y nunca en texto plano.
3. WHEN se intenta crear un Usuario con un nombre de usuario o correo electrónico que ya existe, THE API SHALL retornar HTTP 409 con un mensaje descriptivo.
4. THE Sistema SHALL permitir editar el nombre completo, correo electrónico y rol de un Usuario existente.
5. THE Sistema SHALL permitir activar o desactivar un Usuario sin eliminarlo.
6. WHEN un Usuario está desactivado e intenta iniciar sesión, THE Auth_Service SHALL retornar HTTP 401 con un mensaje indicando que la cuenta está inactiva.
7. WHEN se elimina un Usuario, THE Sistema SHALL aplicar Soft_Delete marcando el campo `eliminado: true`.
8. IF un usuario con rol `vendedor` o `almacen` intenta acceder a los endpoints de gestión de usuarios, THEN THE API SHALL retornar HTTP 403.
9. THE Sistema SHALL garantizar que siempre exista al menos un Usuario con rol `admin` activo; si se intenta desactivar o eliminar al último admin activo, THE API SHALL retornar HTTP 409 con un mensaje descriptivo.

---

### Requisito 10: Configuración de la Tienda

**User Story:** Como administrador, quiero configurar los datos de la tienda y parámetros generales del sistema, para que la información aparezca correctamente en reportes y comprobantes.

#### Criterios de Aceptación

1. THE Sistema SHALL permitir al usuario con rol `admin` guardar y editar los datos de la tienda: nombre, RUC, dirección, teléfono y correo electrónico.
2. WHEN se guardan los datos de Configuracion, THE API SHALL validar que el RUC tenga exactamente 11 dígitos numéricos antes de persistir el documento.
3. IF el campo RUC no tiene 11 dígitos numéricos, THEN THE API SHALL retornar HTTP 400 con un mensaje descriptivo.
4. THE Sistema SHALL exponer un endpoint público (sin autenticación) que retorne el nombre y los datos básicos de la tienda para mostrarlos en la pantalla de login.
5. IF un usuario con rol `vendedor` o `almacen` intenta modificar la Configuracion, THEN THE API SHALL retornar HTTP 403.

---

### Requisito 11: Integridad de Datos y Migración

**User Story:** Como administrador técnico, quiero que el sistema garantice la consistencia de los datos en MongoDB y que los datos actuales en JSON puedan migrarse, para no perder el historial de ventas y productos existentes.

#### Criterios de Aceptación

1. WHEN se registra una Venta, THE API SHALL ejecutar la operación de descuento de stock y creación de documentos dentro de una transacción MongoDB, de modo que si cualquier paso falla, ningún cambio quede persistido.
2. WHEN se marca un Pedido como `recibido`, THE API SHALL ejecutar el incremento de stock y la creación de Movimientos_Inventario dentro de una transacción MongoDB.
3. THE Sistema SHALL exponer un script de migración que lea los archivos `data/productos.json`, `data/categorias.json`, `data/ventas.json` y `data/detalles_venta.json` del sistema actual e inserte los documentos correspondientes en las colecciones de MongoDB, asignando identificadores ObjectId nuevos y preservando los datos históricos.
4. WHEN el script de migración encuentra un registro con datos incompletos o inválidos, THE Sistema SHALL registrar el registro problemático en un log de errores y continuar con los demás registros sin interrumpir la migración completa.
5. FOR ALL documentos migrados desde los archivos JSON, THE Sistema SHALL verificar que el documento puede ser leído y deserializado correctamente desde MongoDB después de la inserción (propiedad de round-trip de migración).

---

### Requisito 12: Frontend Modular

**User Story:** Como desarrollador, quiero que el frontend esté organizado en módulos ES6 independientes por funcionalidad, para reemplazar el `app.js` monolítico actual y facilitar el mantenimiento.

#### Criterios de Aceptación

1. THE Sistema SHALL organizar el código JavaScript del frontend en módulos ES6 separados por funcionalidad: `auth.js`, `api.js`, `dashboard.js`, `productos.js`, `ventas.js`, `clientes.js`, `pedidos.js`, `reportes.js`, `usuarios.js` y `configuracion.js`.
2. THE Sistema SHALL centralizar todas las llamadas HTTP al API en un módulo `api.js` que adjunte automáticamente el JWT del almacenamiento local en el header `Authorization` de cada petición.
3. WHEN el API retorna HTTP 401, THE `api.js` SHALL limpiar el JWT del almacenamiento local y redirigir al usuario a la pantalla de login.
4. THE Sistema SHALL mostrar indicadores de carga (skeleton screens o spinners) mientras se esperan respuestas del API, para que el usuario perciba que la aplicación está procesando su solicitud.
5. WHEN ocurre un error en una operación del frontend, THE Sistema SHALL mostrar una notificación toast con el mensaje de error durante al menos 4 segundos sin interrumpir el flujo de trabajo del usuario.
6. THE Sistema SHALL garantizar que todos los elementos interactivos del frontend sean accesibles mediante teclado y cumplan con un contraste mínimo de 4.5:1 entre texto y fondo.
