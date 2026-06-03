const multer = require('multer');
const cloudinary = require('../config/cloudinary');

// Tipos MIME permitidos
const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'];

// Configurar multer con almacenamiento en memoria
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB
  },
  fileFilter(req, file, cb) {
    if (TIPOS_PERMITIDOS.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes JPG, PNG o WEBP'));
    }
  },
});

/**
 * Middleware que procesa la subida de imagen al campo 'imagen'.
 * - Si hay archivo: lo sube a Cloudinary y adjunta la URL segura a req.cloudinaryUrl.
 * - Si no hay archivo: req.cloudinaryUrl = null y continúa.
 * - Si el archivo supera 2MB: HTTP 413.
 * - Si el tipo no está permitido: HTTP 415.
 * - Si Cloudinary falla: HTTP 500.
 */
function uploadImagen(req, res, next) {
  const multerSingle = upload.single('imagen');

  multerSingle(req, res, async function (err) {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'La imagen no puede superar 2MB' });
      }
      // Error de tipo de archivo no permitido
      return res.status(415).json({ error: err.message });
    }

    // Sin archivo adjunto
    if (!req.file) {
      req.cloudinaryUrl = null;
      return next();
    }

    // Subir buffer a Cloudinary
    try {
      const url = await subirACloudinary(req.file.buffer, req.file.mimetype);
      req.cloudinaryUrl = url;
      next();
    } catch (cloudErr) {
      console.error('Error Cloudinary:', cloudErr.message || cloudErr);
      return res.status(500).json({ error: 'Error al subir imagen: ' + (cloudErr.message || 'verifica las credenciales de Cloudinary en .env') });
    }
  });
}

/**
 * Sube un buffer a Cloudinary usando upload_stream.
 *
 * @param {Buffer} buffer - Buffer del archivo.
 * @param {string} mimetype - Tipo MIME del archivo.
 * @returns {Promise<string>} URL segura del recurso subido.
 */
function subirACloudinary(buffer, mimetype, folder = 'pantatec/productos') {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}

/**
 * Middleware para subir foto de perfil de usuario.
 * Usa la carpeta 'pantatec/avatars' en Cloudinary.
 */
function uploadAvatar(req, res, next) {
  const multerSingle = upload.single('imagen');

  multerSingle(req, res, async function (err) {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'La imagen no puede superar 2MB' });
      }
      return res.status(415).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Debes seleccionar una imagen' });
    }

    try {
      const url = await subirACloudinary(req.file.buffer, req.file.mimetype, 'pantatec/avatars');
      req.cloudinaryUrl = url;
      next();
    } catch (cloudErr) {
      console.error('Error Cloudinary avatar:', cloudErr.message || cloudErr);
      return res.status(500).json({ error: 'Error al subir imagen' });
    }
  });
}

module.exports = uploadImagen;
module.exports.uploadAvatar = uploadAvatar;
