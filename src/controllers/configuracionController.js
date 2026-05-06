const Configuracion = require('../models/Configuracion');

const RUC_REGEX = /^\d{11}$/;

/**
 * GET /api/configuracion/publica
 * Endpoint público: retorna solo nombre_tienda y telefono.
 */
exports.publica = async (req, res) => {
  try {
    const config = await Configuracion.findOne();

    if (!config) {
      return res.json({ nombre_tienda: 'Panta Tec', telefono: '' });
    }

    res.json({
      nombre_tienda: config.nombre_tienda,
      telefono: config.telefono || '',
      ruc: config.ruc || '',
      direccion: config.direccion || '',
      correo: config.correo || '',
      terminos: config.terminos || '',
      mensaje_ticket: config.mensaje_ticket || '¡Gracias por su compra!',
    });
  } catch (error) {
    console.error('Error al obtener configuración pública:', error);
    res.status(500).json({ error: 'Error al obtener configuración pública' });
  }
};

/**
 * GET /api/configuracion
 * Retorna el documento completo de configuración (solo admin).
 */
exports.obtener = async (req, res) => {
  try {
    const config = await Configuracion.findOne();

    if (!config) {
      return res.json(null);
    }

    res.json(config);
  } catch (error) {
    console.error('Error al obtener configuración:', error);
    res.status(500).json({ error: 'Error al obtener configuración' });
  }
};

/**
 * PUT /api/configuracion
 * Upsert del documento singleton de configuración.
 * Valida RUC con regex /^\d{11}$/ antes de guardar.
 */
exports.guardar = async (req, res) => {
  try {
    const { nombre_tienda, ruc, direccion, telefono, correo, terminos, mensaje_ticket } = req.body;

    if (ruc !== undefined && !RUC_REGEX.test(ruc)) {
      return res.status(400).json({ error: 'El RUC debe tener exactamente 11 dígitos numéricos', campo: 'ruc' });
    }

    const datos = {};
    if (nombre_tienda  !== undefined) datos.nombre_tienda  = nombre_tienda;
    if (ruc            !== undefined) datos.ruc            = ruc;
    if (direccion      !== undefined) datos.direccion      = direccion;
    if (telefono       !== undefined) datos.telefono       = telefono;
    if (correo         !== undefined) datos.correo         = correo;
    if (terminos       !== undefined) datos.terminos       = terminos;
    if (mensaje_ticket !== undefined) datos.mensaje_ticket = mensaje_ticket;

    // Upsert: actualizar el único documento o crearlo si no existe
    const config = await Configuracion.findOneAndUpdate(
      {},
      { $set: datos },
      { new: true, upsert: true, runValidators: true }
    );

    res.json(config);
  } catch (error) {
    console.error('Error al guardar configuración:', error);
    res.status(500).json({ error: 'Error al guardar configuración' });
  }
};
