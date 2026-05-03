const fs = require('fs').promises;
const path = require('path');

const ventasPath = path.join(__dirname, '../../data/ventas.json');
const detallesPath = path.join(__dirname, '../../data/detalles_venta.json');
const productosPath = path.join(__dirname, '../../data/productos.json');

const leerArchivo = async (filePath) => {
  const data = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(data);
};

const guardarArchivo = async (filePath, data) => {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
};

const normalizarVenta = (venta) => ({
  ...venta,
  estado: venta.estado || 'completada',
  metodo_pago: venta.metodo_pago || 'efectivo',
  subtotal: venta.subtotal != null ? venta.subtotal : venta.total,
  descuento_total: venta.descuento_total != null ? venta.descuento_total : 0,
  descuento_tipo: venta.descuento_tipo || null,
  descuento_valor: venta.descuento_valor || 0,
  nota: venta.nota || ''
});

exports.registrarVenta = async (req, res) => {
  try {
    const {
      cliente,
      productos: productosVenta,
      metodo_pago = 'efectivo',
      descuento_tipo = null,
      descuento_valor = 0,
      nota = ''
    } = req.body;
    
    if (!productosVenta || productosVenta.length === 0) {
      return res.status(400).json({ error: 'Debe incluir al menos un producto' });
    }

    const productos = await leerArchivo(productosPath);
    const ventas = await leerArchivo(ventasPath);
    const detalles = await leerArchivo(detallesPath);

    // Validar stock
    for (const item of productosVenta) {
      const producto = productos.find(p => p.id === item.producto_id);
      if (!producto) {
        return res.status(404).json({ error: `Producto ${item.producto_id} no encontrado` });
      }
      if (producto.stock < item.cantidad) {
        return res.status(400).json({ 
          error: `Stock insuficiente para ${producto.nombre}. Disponible: ${producto.stock}` 
        });
      }
    }

    // Crear venta
    const nuevaVentaId = ventas.length > 0 ? Math.max(...ventas.map(v => v.id)) + 1 : 1;
    let subtotal = 0;

    const nuevosDetalles = [];
    
    for (const item of productosVenta) {
      const producto = productos.find(p => p.id === item.producto_id);
      const descuentoItem = item.descuento_item || 0;
      const subtotalItem = parseFloat((producto.precio * item.cantidad - descuentoItem).toFixed(2));
      subtotal += subtotalItem;

      // Crear detalle
      const nuevoDetalleId = detalles.length + nuevosDetalles.length + 1;
      nuevosDetalles.push({
        id: nuevoDetalleId,
        venta_id: nuevaVentaId,
        producto_id: item.producto_id,
        cantidad: item.cantidad,
        precio_unitario: producto.precio,
        descuento_item: descuentoItem,
        subtotal: subtotalItem
      });

      // Actualizar stock
      producto.stock -= item.cantidad;
    }

    subtotal = parseFloat(subtotal.toFixed(2));

    let descuento_total = 0;
    if (descuento_tipo === 'porcentaje') {
      descuento_total = parseFloat((subtotal * (descuento_valor / 100)).toFixed(2));
    } else if (descuento_tipo === 'monto_fijo') {
      descuento_total = parseFloat(descuento_valor.toFixed(2));
    }

    const total = parseFloat((subtotal - descuento_total).toFixed(2));

    const nuevaVenta = {
      id: nuevaVentaId,
      fecha: new Date().toISOString(),
      cliente: cliente || 'Cliente general',
      metodo_pago,
      estado: 'completada',
      descuento_tipo,
      descuento_valor,
      subtotal,
      descuento_total,
      total,
      nota
    };

    ventas.push(nuevaVenta);
    detalles.push(...nuevosDetalles);

    await guardarArchivo(ventasPath, ventas);
    await guardarArchivo(detallesPath, detalles);
    await guardarArchivo(productosPath, productos);

    res.status(201).json({
      venta: nuevaVenta,
      detalles: nuevosDetalles
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al registrar venta' });
  }
};

exports.anularVenta = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;

    if (!motivo || !motivo.trim()) {
      return res.status(400).json({ error: 'El motivo de anulación es obligatorio' });
    }

    const ventas = await leerArchivo(ventasPath);
    const detalles = await leerArchivo(detallesPath);
    const productos = await leerArchivo(productosPath);

    const venta = ventas.find(v => v.id === parseInt(id));

    if (!venta) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }

    if (venta.estado === 'anulada') {
      return res.status(400).json({ error: 'La venta ya está anulada' });
    }

    venta.estado = 'anulada';
    venta.motivo_anulacion = motivo.trim();
    venta.fecha_anulacion = new Date().toISOString();

    // Restaurar stock
    const detallesVenta = detalles.filter(d => d.venta_id === venta.id);
    for (const detalle of detallesVenta) {
      const producto = productos.find(p => p.id === detalle.producto_id);
      if (producto) {
        producto.stock += detalle.cantidad;
      }
    }

    await guardarArchivo(ventasPath, ventas);
    await guardarArchivo(productosPath, productos);

    res.json(normalizarVenta(venta));
  } catch (error) {
    res.status(500).json({ error: 'Error al anular venta' });
  }
};

exports.listarVentas = async (req, res) => {
  try {
    const { desde, hasta, cliente, estado, metodo_pago } = req.query;

    const ventas = await leerArchivo(ventasPath);
    const detalles = await leerArchivo(detallesPath);
    const productos = await leerArchivo(productosPath);

    let resultado = ventas.map(normalizarVenta);

    if (desde) {
      resultado = resultado.filter(v => v.fecha >= desde);
    }
    if (hasta) {
      resultado = resultado.filter(v => v.fecha <= hasta + 'T23:59:59.999Z');
    }
    if (cliente) {
      resultado = resultado.filter(v => v.cliente.toLowerCase().includes(cliente.toLowerCase()));
    }
    if (estado) {
      resultado = resultado.filter(v => v.estado === estado);
    }
    if (metodo_pago) {
      resultado = resultado.filter(v => v.metodo_pago === metodo_pago);
    }

    resultado.sort((a, b) => b.fecha.localeCompare(a.fecha));

    const ventasConDetalles = resultado.map(venta => ({
      ...venta,
      detalles: detalles
        .filter(d => d.venta_id === venta.id)
        .map(d => ({
          ...d,
          producto: productos.find(p => p.id === d.producto_id)?.nombre || 'Desconocido'
        }))
    }));

    res.json(ventasConDetalles);
  } catch (error) {
    res.status(500).json({ error: 'Error al listar ventas' });
  }
};

exports.obtenerVenta = async (req, res) => {
  try {
    const { id } = req.params;
    const ventas = await leerArchivo(ventasPath);
    const detalles = await leerArchivo(detallesPath);
    const productos = await leerArchivo(productosPath);

    const venta = ventas.find(v => v.id === parseInt(id));
    
    if (!venta) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }

    const ventaNormalizada = normalizarVenta(venta);

    const ventaConDetalles = {
      ...ventaNormalizada,
      detalles: detalles
        .filter(d => d.venta_id === venta.id)
        .map(d => {
          const producto = productos.find(p => p.id === d.producto_id);
          return {
            ...d,
            producto_nombre: producto?.nombre || 'Desconocido',
            subtotal: d.cantidad * d.precio_unitario
          };
        })
    };

    res.json(ventaConDetalles);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener venta' });
  }
};