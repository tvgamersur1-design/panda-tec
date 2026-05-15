/**
 * Script de migración: Agregar precio_compra a DetalleVenta existentes
 * 
 * Este script actualiza todos los DetalleVenta que no tienen precio_compra
 * usando el precio_compra actual del producto.
 * 
 * Uso: node scripts/migrate-precio-compra.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const DetalleVenta = require('../src/models/DetalleVenta');
const Producto = require('../src/models/Producto');
const connectDB = require('../src/config/db');

async function migrar() {
  try {
    console.log('🔄 Conectando a MongoDB...');
    await connectDB();
    console.log('✅ Conectado a MongoDB\n');

    // Buscar todos los DetalleVenta sin precio_compra
    const detallesSinPrecio = await DetalleVenta.find({
      $or: [
        { precio_compra: { $exists: false } },
        { precio_compra: null }
      ]
    }).populate('producto_id');

    console.log(`📊 Encontrados ${detallesSinPrecio.length} detalles sin precio_compra\n`);

    if (detallesSinPrecio.length === 0) {
      console.log('✅ No hay detalles para migrar');
      await mongoose.connection.close();
      return;
    }

    let actualizados = 0;
    let errores = 0;

    for (const detalle of detallesSinPrecio) {
      try {
        if (!detalle.producto_id) {
          console.log(`⚠️  Detalle ${detalle._id} sin producto asociado - omitido`);
          errores++;
          continue;
        }

        const precioCompra = detalle.producto_id.precio_compra || 0;
        
        await DetalleVenta.updateOne(
          { _id: detalle._id },
          { $set: { precio_compra: precioCompra } }
        );

        actualizados++;
        
        if (actualizados % 100 === 0) {
          console.log(`   Procesados: ${actualizados}/${detallesSinPrecio.length}`);
        }
      } catch (error) {
        console.error(`❌ Error al actualizar detalle ${detalle._id}:`, error.message);
        errores++;
      }
    }

    console.log('\n📈 Resumen de migración:');
    console.log(`   ✅ Actualizados: ${actualizados}`);
    console.log(`   ❌ Errores: ${errores}`);
    console.log(`   📊 Total procesados: ${detallesSinPrecio.length}\n`);

    console.log('✅ Migración completada');
    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error en la migración:', error);
    process.exit(1);
  }
}

migrar();
