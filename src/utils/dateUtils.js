/**
 * Utilidades de fecha para zona horaria de Perú (UTC-5).
 * Usadas en dashboardController y reportesController.
 */

const OFFSET_MS = 5 * 60 * 60 * 1000;

/**
 * Retorna inicio y fin del día en hora de Perú (UTC-5)
 * para una fecha dada (o hoy si no se pasa).
 */
function rangoDiaPeru(fecha) {
  const base = fecha ? new Date(fecha) : new Date();
  const localMs = base.getTime() - OFFSET_MS;
  const localDate = new Date(localMs);
  const y = localDate.getUTCFullYear();
  const m = localDate.getUTCMonth();
  const d = localDate.getUTCDate();
  return {
    inicio: new Date(Date.UTC(y, m, d, 0, 0, 0, 0) + OFFSET_MS),
    fin: new Date(Date.UTC(y, m, d, 23, 59, 59, 999) + OFFSET_MS),
  };
}

/**
 * Retorna inicio y fin del mes en hora de Perú (UTC-5).
 * @param {number} mes0 - Mes 0-indexed (0 = enero)
 * @param {number} anio - Año completo (ej: 2026)
 */
function rangoMesPeru(mes0, anio) {
  return {
    inicio: new Date(Date.UTC(anio, mes0, 1, 0, 0, 0, 0) + OFFSET_MS),
    fin: new Date(Date.UTC(anio, mes0 + 1, 0, 23, 59, 59, 999) + OFFSET_MS),
  };
}

module.exports = { rangoDiaPeru, rangoMesPeru };
