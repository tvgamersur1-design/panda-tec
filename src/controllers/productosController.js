const fs = require('fs').promises;
const path = require('path');

const productosPath = path.join(__dirname, '../../data/productos.json');

const leerProductos = async () => {
  const data = await fs.readFile(productosPath, 'utf-8');
  return JSON.parse(data);
};

const guardarProductos = async (productos) => {
  await fs.writeFile(productosPath, JSON.stringify(productos, null, 2));
};

exports.listarProductos = async (req, res) => {
  try {
    const productos = await leerProductos();
    res.json(productos);
  } catch (error) {
    res.status(500).json({ error: 'Error al leer productos' });
  }
};

exports.crearProducto = async (req, res) => {
  try {
    const { nombre, descripcion, precio, stock } = req.body;
    
    if (!nombre || !precio) {
      return res.status(400).json({ error: 'Nombre y precio son requeridos' });
    }

    const productos = await leerProductos();
    const nuevoId = productos.length > 0 ? Math.max(...productos.map(p => p.id)) + 1 : 1;
    
    const nuevoProducto = {
      id: nuevoId,
      nombre,
      descripcion: descripcion || '',
      precio: parseFloat(precio),
      stock: parseInt(stock) || 0
    };

    productos.push(nuevoProducto);
    await guardarProductos(productos);
    
    res.status(201).json(nuevoProducto);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear producto' });
  }
};

exports.actualizarProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, precio, stock } = req.body;
    
    const productos = await leerProductos();
    const index = productos.findIndex(p => p.id === parseInt(id));
    
    if (index === -1) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    productos[index] = {
      ...productos[index],
      nombre: nombre || productos[index].nombre,
      descripcion: descripcion !== undefined ? descripcion : productos[index].descripcion,
      precio: precio !== undefined ? parseFloat(precio) : productos[index].precio,
      stock: stock !== undefined ? parseInt(stock) : productos[index].stock
    };

    await guardarProductos(productos);
    res.json(productos[index]);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar producto' });
  }
};

exports.eliminarProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const productos = await leerProductos();
    const productosFiltrados = productos.filter(p => p.id !== parseInt(id));
    
    if (productos.length === productosFiltrados.length) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    await guardarProductos(productosFiltrados);
    res.json({ mensaje: 'Producto eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
};
