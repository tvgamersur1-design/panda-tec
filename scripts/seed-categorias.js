require('dotenv').config();
const mongoose = require('mongoose');
const Categoria = require('../src/models/Categoria');

const categorias = [
  { nombre: 'Smartphones', descripcion: 'Teléfonos inteligentes de todas las marcas', activo: true },
  { nombre: 'Tablets', descripcion: 'Tabletas y iPads', activo: true },
  { nombre: 'Accesorios', descripcion: 'Fundas, cargadores, cables y más', activo: true },
  { nombre: 'Laptops', descripcion: 'Computadoras portátiles', activo: true },
  { nombre: 'Smartwatches', descripcion: 'Relojes inteligentes y wearables', activo: true },
  { nombre: 'Audífonos', descripcion: 'Auriculares, earbuds y headsets', activo: true },
  { nombre: 'Cámaras', descripcion: 'Cámaras digitales y de acción', activo: true },
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Conectado a MongoDB');

  for (const cat of categorias) {
    const existe = await Categoria.findOne({ nombre: cat.nombre });
    if (existe) {
      console.log(`Ya existe: ${cat.nombre}`);
    } else {
      await Categoria.create(cat);
      console.log(`Insertada: ${cat.nombre}`);
    }
  }

  await mongoose.disconnect();
  console.log('Listo.');
}

seed().catch(err => { console.error(err); process.exit(1); });
