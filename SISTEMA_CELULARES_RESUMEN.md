# Sistema de Gestión - Tienda de Celulares
## Resumen Ejecutivo

---

## ¿Qué es este sistema?

Un sistema web para gestionar una tienda de venta de celulares. Cubre desde el punto de venta diario hasta el control de inventario, clientes, proveedores y reportes.

---

## Stack (mismo que el sistema de reparaciones)

- **Backend**: Node.js + Express + Netlify Functions
- **Base de datos**: MongoDB Atlas
- **Auth**: JWT + bcryptjs
- **Frontend**: HTML + CSS + JavaScript ES6 Modules
- **Deploy**: Netlify

Reutilizas todo lo que ya sabes. No hay que aprender nada nuevo.

---

## Módulos del sistema

| Módulo | Qué hace |
|--------|---------|
| Punto de Venta (POS) | Registrar ventas rápido, calcular vuelto, emitir boleta |
| Productos | Catálogo con fotos, precios, especificaciones técnicas |
| Inventario | Control de stock, entradas de mercadería, tracking de IMEI |
| Clientes | Base de datos de compradores, historial de compras |
| Proveedores | Gestión de proveedores y condiciones de pago |
| Caja | Apertura y cierre de caja diaria |
| Reportes | Ventas del día/mes, productos más vendidos, stock valorizado |
| Usuarios | Admin, vendedor, almacén con permisos diferenciados |

---

## Diferencias clave vs el sistema de reparaciones

1. **IMEI tracking**: cada celular tiene un IMEI único que se registra al entrar y al venderse
2. **Caja diaria**: apertura con monto inicial, cierre con cuadre
3. **POS optimizado**: diseñado para velocidad, atajos de teclado, búsqueda instantánea
4. **3 roles**: admin, vendedor, almacén (vs 2 en reparaciones)
5. **Cache con TTL**: los datos de productos se cachean 5 min, categorías 30 min
6. **Comprobantes**: boleta y factura en PDF (vs reporte de servicio)
7. **Descuentos**: por item y por venta total

---

## Seguridad (mismo mecanismo, mismo nivel)

- Login con rate limiting (10 intentos / 15 min)
- Contraseñas hasheadas con bcryptjs
- JWT de 8 horas
- Permisos por rol en cada endpoint
- Soft delete en productos y clientes

---

## Documentos generados

- `SISTEMA_CELULARES_ARQUITECTURA.md` → lógica de datos, API, cache, seguridad, estructura de archivos
- `SISTEMA_CELULARES_UX_UI.md` → diseño de pantallas, flujos, componentes, responsive
- `SISTEMA_CELULARES_RESUMEN.md` → este archivo

---

## Próximo paso

Con estos documentos puedes arrancar el proyecto. El orden recomendado:

1. Crear el repo y copiar la estructura base del sistema actual
2. Adaptar `functions/auth.js` (es casi idéntico)
3. Crear las colecciones en MongoDB Atlas
4. Construir el POS primero (es el módulo más crítico)
5. Agregar inventario y reportes después
