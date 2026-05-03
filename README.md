# Panta Tec - Sistema de Ventas de Celulares

Sistema completo de gestión de ventas de celulares y accesorios con Node.js + Express usando JSON como almacenamiento.

## Instalación

```bash
npm install
```

## Ejecutar

```bash
# Modo normal
npm start

# Modo desarrollo (con nodemon)
npm run dev
```

El servidor corre en `http://localhost:3000`

**IMPORTANTE:** Si agregaste nuevas rutas o modificaste archivos del servidor, debes reiniciar:
1. Presiona `Ctrl+C` para detener el servidor
2. Ejecuta `npm start` nuevamente
3. Recarga el navegador con `Ctrl+F5` (recarga forzada sin caché)

## Frontend

Abre tu navegador en `http://localhost:3000` para acceder a la interfaz web profesional.

El frontend incluye:
- Dashboard con estadísticas en tiempo real
- Alertas de stock bajo
- Gestión completa de productos con modal
- Interfaz para registrar ventas con cálculo automático
- Historial de ventas detallado
- Diseño profesional con sidebar y iconos Font Awesome
- Responsive para móviles y tablets

## Endpoints

### Productos

- `GET /api/productos` - Listar todos los productos
- `POST /api/productos` - Crear producto
  ```json
  {
    "nombre": "Sello Personalizado",
    "descripcion": "Sello con diseño personalizado",
    "precio": 30.00,
    "stock": 15
  }
  ```
- `PUT /api/productos/:id` - Actualizar producto
- `DELETE /api/productos/:id` - Eliminar producto

### Ventas

- `POST /api/ventas` - Registrar venta
  ```json
  {
    "cliente": "Juan Pérez",
    "productos": [
      {
        "producto_id": 1,
        "cantidad": 2
      },
      {
        "producto_id": 2,
        "cantidad": 1
      }
    ]
  }
  ```
- `GET /api/ventas` - Listar todas las ventas con detalles
- `GET /api/ventas/:id` - Obtener detalle de una venta específica

## Estructura

```
├── data/                    # Archivos JSON (base de datos)
│   ├── productos.json
│   ├── ventas.json
│   └── detalles_venta.json
├── src/
│   ├── controllers/         # Lógica de negocio
│   ├── routes/             # Definición de rutas
│   └── app.js              # Servidor Express
└── package.json
```

## Funcionalidades

- CRUD completo de productos
- Registro de ventas con validación de stock
- Actualización automática de inventario
- Cálculo automático de totales
- Historial de ventas con detalles
