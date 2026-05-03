const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Rutas
app.use('/api/productos', require('./routes/productos'));
app.use('/api/ventas', require('./routes/ventas'));
app.use('/api/categorias', require('./routes/categorias'));

// Ruta API info
app.get('/api', (req, res) => {
  res.json({
    mensaje: 'API Sistema de Ventas de Sellos',
    endpoints: {
      productos: {
        'GET /api/productos': 'Listar todos los productos',
        'POST /api/productos': 'Crear producto',
        'PUT /api/productos/:id': 'Actualizar producto',
        'DELETE /api/productos/:id': 'Eliminar producto'
      },
      ventas: {
        'POST /api/ventas': 'Registrar venta',
        'GET /api/ventas': 'Listar ventas',
        'GET /api/ventas/:id': 'Obtener detalle de venta'
      }
    }
  });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
