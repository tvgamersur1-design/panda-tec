/**
 * configuracion.js — Módulo de configuración de la tienda
 * Solo accesible para admin.
 */

import { api } from '../api.js';

export async function init(container, user) {
  if (!user || user.rol !== 'admin') {
    container.innerHTML = `<div class="conf-restricted"><i class="fas fa-lock"></i><p>Acceso restringido a administradores.</p></div>`;
    return;
  }

  container.innerHTML = `
    <div class="conf-card">
      <h2><i class="fas fa-cog conf-icon-cog"></i> Configuración de la Tienda</h2>
      <div id="confContent">
        <div class="conf-spinner"><i class="fas fa-spinner fa-spin"></i></div>
      </div>
    </div>
  `;

  const res = await api.get('/configuracion');
  const confContent = container.querySelector('#confContent');

  if (!res.ok) {
    confContent.innerHTML = `<p class="conf-error">Error al cargar la configuración.</p>`;
    return;
  }

  const conf = res.data || {};

  confContent.innerHTML = `
    <form id="confForm">
      <div class="conf-form-group">
        <label for="fNombreTienda">Nombre de la tienda *</label>
        <input id="fNombreTienda" name="nombre_tienda" type="text" required value="${conf.nombre_tienda || ''}" placeholder="Ej: Panda Tec" />
      </div>
      <div class="conf-form-row">
        <div class="conf-form-group">
          <label for="fRuc">RUC * (11 dígitos)</label>
          <input id="fRuc" name="ruc" type="text" maxlength="11" required value="${conf.ruc || ''}" placeholder="20123456789" inputmode="numeric" />
          <span class="error-hint" id="rucError">El RUC debe tener exactamente 11 dígitos numéricos.</span>
          <span class="hint">Solo números, sin guiones</span>
        </div>
        <div class="conf-form-group">
          <label for="fTelefono">Teléfono</label>
          <input id="fTelefono" name="telefono" type="tel" value="${conf.telefono || ''}" placeholder="Ej: 01-234-5678" />
        </div>
      </div>
      <div class="conf-form-group">
        <label for="fDireccion">Dirección</label>
        <input id="fDireccion" name="direccion" type="text" value="${conf.direccion || ''}" placeholder="Ej: Av. Principal 123, Lima" />
      </div>
      <div class="conf-form-group">
        <label for="fCorreo">Correo electrónico</label>
        <input id="fCorreo" name="correo" type="email" value="${conf.correo || ''}" placeholder="contacto@pantatec.com" inputmode="email" />
      </div>
      <div class="conf-form-group">
        <label for="fMensaje">Mensaje de cierre del ticket</label>
        <input id="fMensaje" name="mensaje_ticket" type="text" value="${conf.mensaje_ticket || '¡Gracias por su compra!'}" placeholder="¡Gracias por su compra!" />
        <span class="hint">Aparece al final del ticket de venta</span>
      </div>
      <div class="conf-form-group">
        <label for="fTerminos">Términos y condiciones del ticket</label>
        <textarea id="fTerminos" name="terminos" rows="3" placeholder="Ej: No se aceptan devoluciones. Reclamos dentro de las 24h.">${conf.terminos || 'No se aceptan devoluciones de dinero. Cualquier reclamo debe realizarse dentro de las 24 horas de la compra.'}</textarea>
        <span class="hint">Se imprime al pie del ticket</span>
      </div>
      <button type="submit" class="btn-primary" id="btnGuardar">
        <i class="fas fa-save"></i> Guardar configuración
      </button>
    </form>
  `;

  const rucInput = confContent.querySelector('#fRuc');
  const rucError = confContent.querySelector('#rucError');

  rucInput.addEventListener('input', () => {
    const val = rucInput.value.trim();
    const valido = /^\d{11}$/.test(val);
    rucError.style.display = val.length > 0 && !valido ? 'block' : 'none';
    rucInput.style.borderColor = val.length > 0 && !valido ? '#DC2626' : '';
  });

  confContent.querySelector('#confForm').addEventListener('submit', async e => {
    e.preventDefault();

    const ruc = rucInput.value.trim();
    if (!/^\d{11}$/.test(ruc)) {
      rucError.style.display = 'block';
      rucInput.focus();
      window.showToast('El RUC debe tener exactamente 11 dígitos numéricos', 'warning');
      return;
    }

    const btn = confContent.querySelector('#btnGuardar');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando…';

    const fd = new FormData(e.target);
    const body = Object.fromEntries(fd.entries());

    const res = await api.put('/configuracion', body);
    if (res.ok) {
      api.invalidate('/configuracion');
      window.showToast('Configuración guardada correctamente', 'success');
    } else {
      window.showToast(res.data?.error || 'Error al guardar la configuración', 'error');
    }

    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save"></i> Guardar configuración';
  });
}
