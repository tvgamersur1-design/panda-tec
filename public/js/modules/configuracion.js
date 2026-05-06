/**
 * configuracion.js — Módulo de configuración de la tienda
 * Solo accesible para admin.
 */

import { api } from '../api.js';

export async function init(container, user) {
  if (!user || user.rol !== 'admin') {
    container.innerHTML = `<div style="text-align:center;padding:3rem;color:#64748B;"><i class="fas fa-lock" style="font-size:2.5rem;margin-bottom:1rem;display:block;opacity:0.35;"></i><p>Acceso restringido a administradores.</p></div>`;
    return;
  }

  container.innerHTML = `
    <style>
      .conf-card { background:#fff; border-radius:12px; border:1px solid #E2E8F0; padding:2rem; max-width:600px; }
      .conf-card h2 { font-size:1.125rem; font-weight:700; margin-bottom:1.5rem; display:flex; align-items:center; gap:0.5rem; }
      .form-group { display:flex; flex-direction:column; gap:0.375rem; margin-bottom:1rem; }
      .form-group label { font-size:0.8125rem; font-weight:600; color:#374151; }
      .form-group input { padding:0.5rem 0.75rem; border:1px solid #E2E8F0; border-radius:8px; font-size:0.875rem; color:#1E293B; outline:none; }
      .form-group input:focus { border-color:#2563EB; }
      .form-group .hint { font-size:0.75rem; color:#64748B; margin-top:0.25rem; }
      .form-group .error-hint { font-size:0.75rem; color:#DC2626; margin-top:0.25rem; display:none; }
      .form-row { display:grid; grid-template-columns:1fr 1fr; gap:1rem; }
      .btn-primary { display:inline-flex; align-items:center; gap:0.5rem; padding:0.625rem 1.25rem; background:#2563EB; color:#fff; border:none; border-radius:8px; font-size:0.875rem; font-weight:600; cursor:pointer; margin-top:0.5rem; }
      .btn-primary:hover { background:#1D4ED8; }
      .btn-primary:disabled { background:#94A3B8; cursor:not-allowed; }
    </style>

    <div class="conf-card">
      <h2><i class="fas fa-cog" style="color:#2563EB;"></i> Configuración de la Tienda</h2>
      <div id="confContent">
        <div style="text-align:center;padding:2rem;color:#94A3B8;"><i class="fas fa-spinner fa-spin" style="font-size:1.5rem;"></i></div>
      </div>
    </div>
  `;

  const res = await api.get('/configuracion');
  const confContent = container.querySelector('#confContent');

  if (!res.ok) {
    confContent.innerHTML = `<p style="color:#DC2626;">Error al cargar la configuración.</p>`;
    return;
  }

  const conf = res.data || {};

  confContent.innerHTML = `
    <form id="confForm">
      <div class="form-group">
        <label for="fNombreTienda">Nombre de la tienda *</label>
        <input id="fNombreTienda" name="nombre_tienda" type="text" required value="${conf.nombre_tienda || ''}" placeholder="Ej: Panta Tec" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="fRuc">RUC * (11 dígitos)</label>
          <input id="fRuc" name="ruc" type="text" maxlength="11" required value="${conf.ruc || ''}" placeholder="20123456789" />
          <span class="error-hint" id="rucError">El RUC debe tener exactamente 11 dígitos numéricos.</span>
          <span class="hint">Solo números, sin guiones</span>
        </div>
        <div class="form-group">
          <label for="fTelefono">Teléfono</label>
          <input id="fTelefono" name="telefono" type="text" value="${conf.telefono || ''}" placeholder="Ej: 01-234-5678" />
        </div>
      </div>
      <div class="form-group">
        <label for="fDireccion">Dirección</label>
        <input id="fDireccion" name="direccion" type="text" value="${conf.direccion || ''}" placeholder="Ej: Av. Principal 123, Lima" />
      </div>
      <div class="form-group">
        <label for="fCorreo">Correo electrónico</label>
        <input id="fCorreo" name="correo" type="email" value="${conf.correo || ''}" placeholder="contacto@pantatec.com" />
      </div>
      <div class="form-group">
        <label for="fMensaje">Mensaje de cierre del ticket</label>
        <input id="fMensaje" name="mensaje_ticket" type="text" value="${conf.mensaje_ticket || '¡Gracias por su compra!'}" placeholder="¡Gracias por su compra!" />
        <span class="hint">Aparece al final del ticket de venta</span>
      </div>
      <div class="form-group">
        <label for="fTerminos">Términos y condiciones del ticket</label>
        <textarea id="fTerminos" name="terminos" rows="3" style="padding:0.5rem 0.75rem;border:1px solid #E2E8F0;border-radius:8px;font-size:0.875rem;color:#1E293B;outline:none;resize:vertical;font-family:inherit;" placeholder="Ej: No se aceptan devoluciones. Reclamos dentro de las 24h.">${conf.terminos || 'No se aceptan devoluciones de dinero. Cualquier reclamo debe realizarse dentro de las 24 horas de la compra.'}</textarea>
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
