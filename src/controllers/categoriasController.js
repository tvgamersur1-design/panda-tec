const fs = require('fs').promises;
const path = require('path');

const categoriasPath = path.join(__dirname, '../../data/categorias.json');

const leerCategorias = async () => {
  const data = await fs.readFile(categoriasPath, 'utf-8');
  return JSON.parse(data);
};

const guardarCategorias = async (categorias) => {
  await fs.writeFile(categoriasPath, JSON.stringify(categorias, null, 2));
};

exports.listarCategorias = async (req, res) => {
  try {
    const categorias = await leerCategorias();
    res.json(categorias);
  } catch (error) {
    res.status(500).json({ error: 'Error al leer categorías' });
  }
};

exports.crearCategoria = async (req, res) => {
  try {
    const { nombre, nombreMostrar, icono } = req.body;
    
    if (!nombre || !nombreMostrar || !icono) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    const categorias = await leerCategorias();
    
    // Verificar si ya existe
    if (categorias.find(c => c.nombre === nombre)) {
      return res.status(400).json({ error: 'La categoría ya existe' });
    }
    
    const nuevoId = categorias.length > 0 ? Math.max(...categorias.map(c => c.id)) + 1 : 1;
    
    const nuevaCategoria = {
      id: nuevoId,
      nombre: nombre.toLowerCase().replace(/\s+/g, '_'),
      nombreMostrar,
      icono
    };

    categorias.push(nuevaCategoria);
    await guardarCategorias(categorias);
    
    res.status(201).json(nuevaCategoria);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear categoría' });
  }
};

exports.actualizarCategoria = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, nombreMostrar, icono } = req.body;
    
    const categorias = await leerCategorias();
    const index = categorias.findIndex(c => c.id === parseInt(id));
    
    if (index === -1) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    categorias[index] = {
      ...categorias[index],
      nombre: nombre ? nombre.toLowerCase().replace(/\s+/g, '_') : categorias[index].nombre,
      nombreMostrar: nombreMostrar || categorias[index].nombreMostrar,
      icono: icono || categorias[index].icono
    };

    await guardarCategorias(categorias);
    res.json(categorias[index]);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar categoría' });
  }
};

exports.eliminarCategoria = async (req, res) => {
  try {
    const { id } = req.params;
    const categorias = await leerCategorias();
    const categoriasFiltradas = categorias.filter(c => c.id !== parseInt(id));
    
    if (categorias.length === categoriasFiltradas.length) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    await guardarCategorias(categoriasFiltradas);
    res.json({ mensaje: 'Categoría eliminada' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar categoría' });
  }
};
