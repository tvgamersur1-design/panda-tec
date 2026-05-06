const axios = require('axios');
const Cliente = require('../models/Cliente');
const Venta = require('../models/Venta');

/**
 * GET /api/clientes?search=
 * Listar clientes activos con búsqueda opcional por nombre, apellido_paterno o DNI.
 */
exports.listar = async (req, res) => {
  try {
    const { search } = req.query;

    const filtro = { eliminado: false };

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      filtro.$or = [
        { nombre: regex },
        { apellido_paterno: regex },
        { dni: regex },
      ];
    }

    const clientes = await Cliente.find(filtro).sort({ apellido_paterno: 1 });

    res.json(clientes);
  } catch (error) {
    console.error('Error al listar clientes:', error);
    res.status(500).json({ error: 'Error al listar clientes' });
  }
};

/**
 * POST /api/clientes
 * Crear un nuevo cliente. DNI (8 dígitos) y teléfono son obligatorios.
 */
exports.crear = async (req, res) => {
  try {
    const { dni, telefono, nombre, apellido_paterno, apellido_materno, email, direccion } = req.body;

    // Validar campos obligatorios
    if (!dni || !telefono) {
      return res.status(400).json({ error: 'El DNI y el teléfono son obligatorios' });
    }

    // Validar formato DNI
    if (!/^\d{8}$/.test(dni)) {
      return res.status(400).json({ error: 'El DNI debe tener exactamente 8 dígitos numéricos' });
    }

    // Verificar DNI duplicado
    const existente = await Cliente.findOne({ dni });
    if (existente) {
      return res.status(409).json({ error: 'Ya existe un cliente con ese DNI' });
    }

    const cliente = await Cliente.create({
      dni,
      telefono,
      nombre,
      apellido_paterno,
      apellido_materno,
      email,
      direccion,
    });

    res.status(201).json(cliente);
  } catch (error) {
    console.error('Error al crear cliente:', error);
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Ya existe un cliente con ese DNI' });
    }
    res.status(500).json({ error: 'Error al crear cliente' });
  }
};

/**
 * GET /api/clientes/:id
 * Detalle del cliente + historial de ventas ordenadas por fecha_venta desc.
 */
exports.detalle = async (req, res) => {
  try {
    const { id } = req.params;

    const cliente = await Cliente.findOne({ _id: id, eliminado: false });
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    // Historial de ventas del cliente, ordenadas por fecha_venta desc
    const ventas = await Venta.find({ cliente_id: cliente._id })
      .sort({ fecha_venta: -1 })
      .populate('vendedor_id', 'nombre_completo usuario');

    res.json({ cliente, ventas });
  } catch (error) {
    console.error('Error al obtener detalle del cliente:', error);
    res.status(500).json({ error: 'Error al obtener detalle del cliente' });
  }
};

/**
 * PUT /api/clientes/:id
 * Actualizar campos del cliente. HTTP 404 si no existe o está eliminado.
 */
exports.editar = async (req, res) => {
  try {
    const { id } = req.params;
    const { dni, telefono, nombre, apellido_paterno, apellido_materno, email, direccion } = req.body;

    // Verificar que el cliente existe y no está eliminado
    const clienteExistente = await Cliente.findOne({ _id: id, eliminado: false });
    if (!clienteExistente) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    // Si se cambia el DNI, verificar que no esté en uso por otro cliente
    if (dni && dni !== clienteExistente.dni) {
      if (!/^\d{8}$/.test(dni)) {
        return res.status(400).json({ error: 'El DNI debe tener exactamente 8 dígitos numéricos' });
      }
      const duplicado = await Cliente.findOne({ dni, _id: { $ne: id } });
      if (duplicado) {
        return res.status(409).json({ error: 'Ya existe un cliente con ese DNI' });
      }
    }

    const campos = {};
    if (dni !== undefined) campos.dni = dni;
    if (telefono !== undefined) campos.telefono = telefono;
    if (nombre !== undefined) campos.nombre = nombre;
    if (apellido_paterno !== undefined) campos.apellido_paterno = apellido_paterno;
    if (apellido_materno !== undefined) campos.apellido_materno = apellido_materno;
    if (email !== undefined) campos.email = email;
    if (direccion !== undefined) campos.direccion = direccion;

    const cliente = await Cliente.findOneAndUpdate(
      { _id: id, eliminado: false },
      campos,
      { new: true, runValidators: true }
    );

    res.json(cliente);
  } catch (error) {
    console.error('Error al editar cliente:', error);
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Ya existe un cliente con ese DNI' });
    }
    res.status(500).json({ error: 'Error al editar cliente' });
  }
};

/**
 * DELETE /api/clientes/:id
 * Soft delete: marcar eliminado: true. Solo admin.
 */
exports.eliminar = async (req, res) => {
  try {
    const { id } = req.params;

    const cliente = await Cliente.findOneAndUpdate(
      { _id: id, eliminado: false },
      { eliminado: true },
      { new: true }
    );

    if (!cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    res.json({ mensaje: 'Cliente eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar cliente:', error);
    res.status(500).json({ error: 'Error al eliminar cliente' });
  }
};

/**
 * GET /api/clientes/dni/:dni
 * Consultar datos de persona en RENIEC por DNI usando API Decolecta.
 * Endpoint: GET https://api.decolecta.com/v1/reniec/dni?numero=<dni>
 * Header: Authorization: Bearer <API_KEY>
 * Respuesta: { first_name, first_last_name, second_last_name, full_name, document_number }
 */
exports.consultarDNI = async (req, res) => {
  try {
    const { dni } = req.params;

    if (!dni || !/^\d{8}$/.test(dni)) {
      return res.status(400).json({ error: 'El DNI debe tener exactamente 8 dígitos numéricos' });
    }

    const apiUrl  = process.env.RENIEC_API_URL;  // https://api.decolecta.com/v1/reniec/dni
    const apiKey  = process.env.RENIEC_API_KEY;  // tu token de Decolecta

    if (!apiUrl || !apiKey) {
      console.error('[RENIEC] RENIEC_API_URL o RENIEC_API_KEY no configurados en .env');
      return res.status(200).json({ encontrado: false, mensaje: 'Servicio RENIEC no configurado' });
    }

    let respuesta;
    try {
      respuesta = await axios.get(apiUrl, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: apiKey.startsWith('Bearer ') ? apiKey : `Bearer ${apiKey}`,
        },
        params: { numero: dni },
        timeout: 10000,
      });
    } catch (err) {
      const status  = err.response?.status;
      const errData = err.response?.data;
      console.error(`[RENIEC] Error HTTP ${status}:`, errData || err.message);
      return res.status(200).json({
        encontrado: false,
        mensaje: 'No se encontró información para ese DNI',
      });
    }

    const data = respuesta.data;

    // Campos de Decolecta: first_name, first_last_name, second_last_name
    const nombre           = data.first_name        || null;
    const apellido_paterno = data.first_last_name   || null;
    const apellido_materno = data.second_last_name  || null;

    if (!nombre && !apellido_paterno && !apellido_materno) {
      return res.status(200).json({ encontrado: false, mensaje: 'No se encontró información para ese DNI' });
    }

    return res.status(200).json({
      encontrado: true,
      nombre,
      apellido_paterno,
      apellido_materno,
    });
  } catch (error) {
    console.error('[RENIEC] Error inesperado:', error.message);
    return res.status(200).json({ encontrado: false, mensaje: 'Error al consultar RENIEC' });
  }
};
