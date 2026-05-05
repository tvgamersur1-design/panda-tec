'use strict';

/**
 * scripts/migrate.js
 * Migración única de archivos JSON → MongoDB Atlas
 * Uso: node scripts/migrate.js
 */

// Cargar variables de entorno al inicio
require('dotenv').config();

const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

// ─── Modelos ────────────────────────────────────────────────────────────────
const Categoria   = require('../src/models/Categoria');
const Producto    = require('../src/models/Producto');
const Venta       = require('../src/models/Venta');
const DetalleVenta = require('../src/models/DetalleVenta');
const Usuario     = require('../src/models/Usuario');

// ─── Rutas de archivos JSON ──────────────────────────────────────────────────
const DATA_DIR = path.join(__dirname, '..', 'data');
const LOG_FILE = path.join(__dirname, 'migration-errors.log');

// ─── Utilidades de log ───────────────────────────────────────────────────────

/**
 * Escribe una línea en el archivo de log de errores.
 * @param {string} coleccion
 * @param {number|string} id_json
 * @param {string} mensaje
 */
function logError(coleccion, id_json, mensaje) {
  const linea = `[${new Date().toISOString()}] [${coleccion}] id_json=${id_json} error=${mensaje}\n`;
  fs.appendFileSync(LOG_FILE, linea, 'utf8');
  console.error(`  ✗ [${coleccion}] id_json=${id_json} → ${mensaje}`);
}

/**
 * Escribe una advertencia en el log (sin id_json específico).
 * @param {string} coleccion
 * @param {string} mensaje
 */
function logWarning(coleccion, mensaje) {
  const linea = `[${new Date().toISOString()}] [${coleccion}] ADVERTENCIA: ${mensaje}\n`;
  fs.appendFileSync(LOG_FILE, linea, 'utf8');
  console.warn(`  ⚠ [${coleccion}] ${mensaje}`);
}

// ─── Lectura de JSON ─────────────────────────────────────────────────────────

/**
 * Lee y parsea un archivo JSON. Lanza error si no existe o es inválido.
 * @param {string} nombreArchivo
 * @returns {Array}
 */
function leerJSON(nombreArchivo) {
  const ruta = path.join(DATA_DIR, nombreArchivo);
  const contenido = fs.readFileSync(ruta, 'utf8');
  return JSON.parse(contenido);
}

// ─── Migración de Categorías ─────────────────────────────────────────────────

/**
 * Migra categorias.json → colección `categorias`.
 * Retorna mapeo { id_json → ObjectId_mongo } y estadísticas.
 */
async function migrarCategorias() {
  console.log('\n📂 Migrando categorías...');
  const registros = leerJSON('categorias.json');
  const mapeo = {};           // { id_json: ObjectId }
  let migrados = 0;
  let errores = 0;
  const idsInsertados = [];

  for (const reg of registros) {
    try {
      const doc = new Categoria({
        nombre:      reg.nombreMostrar,
        descripcion: '',
        activo:      true,
      });
      await doc.save();
      mapeo[reg.id] = doc._id;
      idsInsertados.push(doc._id);
      migrados++;
    } catch (err) {
      logError('categorias', reg.id, err.message);
      errores++;
    }
  }

  // Verificación round-trip (tarea 15.2)
  const registrosValidos = migrados;
  if (idsInsertados.length > 0) {
    const insertados = await Categoria.countDocuments({ _id: { $in: idsInsertados } });
    if (insertados !== registrosValidos) {
      logWarning('categorias', `Round-trip mismatch: esperados ${registrosValidos}, encontrados ${insertados}`);
    } else {
      console.log(`  ✔ Round-trip OK: ${insertados}/${registrosValidos} documentos verificados`);
    }
  }

  return { mapeo, migrados, errores };
}

// ─── Migración de Productos ──────────────────────────────────────────────────

/**
 * Migra productos.json → colección `productos`.
 * Requiere el mapeo de categorías para resolver categoria_id.
 */
async function migrarProductos(mapCategorias) {
  console.log('\n📦 Migrando productos...');
  const registros = leerJSON('productos.json');

  // Construir mapeo inverso: nombre_slug → ObjectId de categoría
  // El mapeo de categorías es { id_json → ObjectId }, necesitamos slug → ObjectId.
  // Leemos categorias.json de nuevo para obtener el slug.
  const categoriasJSON = leerJSON('categorias.json');
  const mapSlugAObjectId = {};
  for (const cat of categoriasJSON) {
    if (mapCategorias[cat.id]) {
      mapSlugAObjectId[cat.nombre] = mapCategorias[cat.id]; // cat.nombre es el slug, ej: "smartphones"
    }
  }

  const mapeo = {};
  let migrados = 0;
  let errores = 0;
  const idsInsertados = [];

  for (const reg of registros) {
    try {
      const categoriaObjectId = mapSlugAObjectId[reg.categoria];
      if (!categoriaObjectId) {
        throw new Error(`categoria "${reg.categoria}" no encontrada en mapeo`);
      }

      const doc = new Producto({
        nombre:            reg.nombre,
        descripcion:       reg.descripcion || '',
        precio_venta:      reg.precio,
        precio_compra:     0,
        stock_actual:      reg.stock,
        stock_minimo:      0,
        categoria_id:      categoriaObjectId,
        estado:            reg.stock > 0 ? 'activo' : 'agotado',
        eliminado:         false,
      });
      await doc.save();
      mapeo[reg.id] = doc._id;
      idsInsertados.push(doc._id);
      migrados++;
    } catch (err) {
      logError('productos', reg.id, err.message);
      errores++;
    }
  }

  // Verificación round-trip (tarea 15.2)
  const registrosValidos = migrados;
  if (idsInsertados.length > 0) {
    const insertados = await Producto.countDocuments({ _id: { $in: idsInsertados } });
    if (insertados !== registrosValidos) {
      logWarning('productos', `Round-trip mismatch: esperados ${registrosValidos}, encontrados ${insertados}`);
    } else {
      console.log(`  ✔ Round-trip OK: ${insertados}/${registrosValidos} documentos verificados`);
    }
  }

  return { mapeo, migrados, errores };
}

// ─── Obtener o crear vendedor para migración ─────────────────────────────────

/**
 * Busca el primer usuario admin activo. Si no existe ningún usuario,
 * crea un usuario admin temporal de migración.
 * @returns {ObjectId}
 */
async function obtenerVendedorMigracion() {
  // Intentar encontrar un admin activo
  let usuario = await Usuario.findOne({ rol: 'admin', activo: true, eliminado: false });
  if (usuario) {
    console.log(`  ℹ Usando usuario admin existente: ${usuario.usuario} (${usuario._id})`);
    return usuario._id;
  }

  // Intentar encontrar cualquier usuario
  usuario = await Usuario.findOne({ eliminado: false });
  if (usuario) {
    logWarning('ventas', `No hay usuario admin activo. Usando usuario existente: ${usuario.usuario} (rol: ${usuario.rol})`);
    return usuario._id;
  }

  // No hay ningún usuario — crear uno temporal de migración
  logWarning('ventas', 'No hay usuarios en la base de datos. Creando usuario admin temporal de migración.');
  const temporal = new Usuario({
    nombre_completo: 'Admin Migración',
    usuario:         'admin_migracion',
    correo:          'admin_migracion@pantatec.local',
    clave:           'MigracionTemporal2026!',
    rol:             'admin',
    activo:          true,
    eliminado:       false,
  });
  await temporal.save();
  console.log(`  ✔ Usuario temporal creado: ${temporal.usuario} (${temporal._id})`);
  return temporal._id;
}

// ─── Migración de Ventas ─────────────────────────────────────────────────────

/**
 * Migra ventas.json → colección `ventas`.
 */
async function migrarVentas(vendedorId) {
  console.log('\n🧾 Migrando ventas...');
  const registros = leerJSON('ventas.json');
  const mapeo = {};
  let migrados = 0;
  let errores = 0;
  const idsInsertados = [];

  for (const reg of registros) {
    try {
      const numero_venta = 'V-MIGR-' + String(reg.id).padStart(3, '0');

      const doc = new Venta({
        numero_venta,
        cliente_id:       null,
        vendedor_id:      vendedorId,
        metodo_pago:      reg.metodo_pago,
        subtotal:         reg.subtotal !== undefined ? reg.subtotal : reg.total,
        descuento_tipo:   reg.descuento_tipo || null,
        descuento_valor:  reg.descuento_valor || 0,
        descuento_total:  reg.descuento_total || 0,
        total:            reg.total,
        estado:           reg.estado,
        motivo_anulacion: reg.motivo_anulacion || undefined,
        fecha_anulacion:  reg.fecha_anulacion  ? new Date(reg.fecha_anulacion) : undefined,
        notas:            reg.nota || '',
        fecha_venta:      new Date(reg.fecha),
      });
      await doc.save();
      mapeo[reg.id] = doc._id;
      idsInsertados.push(doc._id);
      migrados++;
    } catch (err) {
      logError('ventas', reg.id, err.message);
      errores++;
    }
  }

  // Verificación round-trip (tarea 15.2)
  const registrosValidos = migrados;
  if (idsInsertados.length > 0) {
    const insertados = await Venta.countDocuments({ _id: { $in: idsInsertados } });
    if (insertados !== registrosValidos) {
      logWarning('ventas', `Round-trip mismatch: esperados ${registrosValidos}, encontrados ${insertados}`);
    } else {
      console.log(`  ✔ Round-trip OK: ${insertados}/${registrosValidos} documentos verificados`);
    }
  }

  return { mapeo, migrados, errores };
}

// ─── Migración de Detalles de Venta ─────────────────────────────────────────

/**
 * Migra detalles_venta.json → colección `detalle_ventas`.
 */
async function migrarDetallesVenta(mapVentas, mapProductos) {
  console.log('\n📋 Migrando detalles de venta...');
  const registros = leerJSON('detalles_venta.json');
  let migrados = 0;
  let errores = 0;
  const idsInsertados = [];

  for (const reg of registros) {
    try {
      const ventaObjectId = mapVentas[reg.venta_id];
      if (!ventaObjectId) {
        throw new Error(`venta_id=${reg.venta_id} no encontrada en mapeo de ventas`);
      }

      const productoObjectId = mapProductos[reg.producto_id];
      if (!productoObjectId) {
        throw new Error(`producto_id=${reg.producto_id} no encontrado en mapeo de productos`);
      }

      const subtotal = reg.cantidad * reg.precio_unitario;

      const doc = new DetalleVenta({
        venta_id:       ventaObjectId,
        producto_id:    productoObjectId,
        cantidad:       reg.cantidad,
        precio_unitario: reg.precio_unitario,
        descuento_item: reg.descuento_item || 0,
        subtotal,
      });
      await doc.save();
      idsInsertados.push(doc._id);
      migrados++;
    } catch (err) {
      logError('detalle_ventas', reg.id, err.message);
      errores++;
    }
  }

  // Verificación round-trip (tarea 15.2)
  const registrosValidos = migrados;
  if (idsInsertados.length > 0) {
    const insertados = await DetalleVenta.countDocuments({ _id: { $in: idsInsertados } });
    if (insertados !== registrosValidos) {
      logWarning('detalle_ventas', `Round-trip mismatch: esperados ${registrosValidos}, encontrados ${insertados}`);
    } else {
      console.log(`  ✔ Round-trip OK: ${insertados}/${registrosValidos} documentos verificados`);
    }
  }

  return { migrados, errores };
}

// ─── Función principal ───────────────────────────────────────────────────────

async function main() {
  // Inicializar archivo de log (sobreescribir si existe de una ejecución anterior)
  fs.writeFileSync(LOG_FILE, `=== Migración iniciada: ${new Date().toISOString()} ===\n`, 'utf8');

  // 1. Conectar a MongoDB
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ La variable de entorno MONGODB_URI no está definida.');
    process.exit(1);
  }

  console.log('🔌 Conectando a MongoDB Atlas...');
  await mongoose.connect(uri);
  console.log('✅ Conectado a MongoDB Atlas.');

  // 2. Ejecutar migraciones en orden
  const resCategorias   = await migrarCategorias();
  const resProductos    = await migrarProductos(resCategorias.mapeo);
  const vendedorId      = await obtenerVendedorMigracion();
  const resVentas       = await migrarVentas(vendedorId);
  const resDetalles     = await migrarDetallesVenta(resVentas.mapeo, resProductos.mapeo);

  // 3. Resumen final
  const pad = (n) => String(n).padStart(2, ' ');
  console.log('\n=== MIGRACIÓN COMPLETADA ===');
  console.log(`categorias:     ${pad(resCategorias.migrados)} migrados, ${pad(resCategorias.errores)} errores`);
  console.log(`productos:      ${pad(resProductos.migrados)} migrados, ${pad(resProductos.errores)} errores`);
  console.log(`ventas:         ${pad(resVentas.migrados)} migrados, ${pad(resVentas.errores)} errores`);
  console.log(`detalle_ventas: ${pad(resDetalles.migrados)} migrados, ${pad(resDetalles.errores)} errores`);

  const totalErrores = resCategorias.errores + resProductos.errores + resVentas.errores + resDetalles.errores;
  if (totalErrores > 0) {
    console.log(`\n⚠  Se registraron ${totalErrores} error(es). Revisar: scripts/migration-errors.log`);
  } else {
    console.log('\n✅ Migración completada sin errores.');
  }

  await mongoose.disconnect();
  console.log('🔌 Desconectado de MongoDB.');
}

// Solo ejecutar main() si el script se invoca directamente (no con require)
if (require.main === module) {
  main().catch((err) => {
    console.error('❌ Error fatal en la migración:', err.message);
    logError('FATAL', 'N/A', err.message);
    mongoose.disconnect().finally(() => process.exit(1));
  });
}
