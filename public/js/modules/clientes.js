/**
 * clientes.js — Módulo de gestión de clientes
 * CRUD con autocompletado RENIEC y detalle con historial de ventas.
 */

import { api } from '../api.js';

let _clientes = [];
let _dniTimer = null;

export async function init(container, user) {
  const puedeEditar = user && (user.rol === 'admin' || user.rol === 'vendedor');
  const puedeEliminar = user && user.rol === 'admin';

  container.innerHTML = `
    <style>
      .cli-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:1.25rem; flex-wrap:wrap; gap:0.75rem; }
      .btn-primary { display:inline-flex; align-items:center; gap:0.5rem; padding:0.5rem 1rem; background:#2563EB; color:#fff; border:none; border-radius:8px; font-size:0.875rem; font-weight:600; cursor:pointer; }
      .btn-primary:hover { background:#1D4ED8; }
      .btn-secondary { display:inline-flex; align-items:center; gap:0.5rem; padding:0.5rem 1rem; background:#F1F5F9; color:#1E293B; border:1px solid #E2E8F0; border-radius:8px; font-size:0.875rem; font-weight:500; cursor:pointer; }
      .btn-danger { display:inline-flex; align-items:center; gap:0.5rem; padding:0.4rem 0.75rem; background:#FEE2E2; color:#DC2626; border:none; border-radius:6px; font-size:0.8125rem; font-weight:500; cursor:pointer; }
      .btn-info { display:inline-flex; align-items:center; gap:0.5rem; padding:0.4rem 0.75rem; background:#EFF6FF; color:#2563EB; border:none; border-radius:6px; font-size:0.8125rem; font-weight:500; cursor:pointer; }
      .search-input { padding:0.5rem 0.75rem; border:1px solid #E2E8F0; border-radius:8px; font-size:0.875rem; outline:none; min-width:220px; }
      .search-input:focus { border-color:#2563EB; }
      .table-wrap { background:#fff; border-radius:12px; border:1px solid #E2E8F0; overflow:auto; }
      table { width:100%; border-collapse:collapse; font-size:0.875rem; }
      th { padding:0.75rem 1rem; text-align:left; font-size:0.75rem; font-weight:600; text-transform:uppercase; letter-spacing:0.04em; color:#64748B; border-bottom:1px solid #E2E8F0; }
      td { padding:0.75rem 1rem; border-bottom:1px solid #F1F5F9; vertical-align:middle; }
      tr:last-child td { border-bottom:none; }
      tr:hover td { background:#F8FAFC; }
      .empty-state { text-align:center; padding:3rem; color:#64748B; }
      .empty-state i { font-size:2.5rem; margin-bottom:1rem; display:block; opacity:0.35; }
      .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.45); z-index:1000; display:flex; align-items:center; justify-content:center; padding:1rem; }
      .modal { background:#fff; border-radius:14px; width:100%; max-width:520px; max-height:90vh; overflow-y:auto; box-shadow:0 20px 60px rgba(0,0,0,0.2); animation:slideUp 0.2s ease; }
      .modal-lg { max-width:680px; }
      @keyframes slideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
      .modal-header { display:flex; align-items:center; justify-content:space-between; padding:1.25rem 1.5rem; border-bottom:1px solid #E2E8F0; }
      .modal-header h2 { font-size:1.125rem; font-weight:700; }
      .modal-body { padding:1.5rem; display:flex; flex-direction:column; gap:1rem; }
      .modal-footer { display:flex; justify-content:flex-end; gap:0.75rem; padding:1rem 1.5rem; border-top:1px solid #E2E8F0; }
      .form-group { display:flex; flex-direction:column; gap:0.375rem; }
      .form-group label { font-size:0.8125rem; font-weight:600; color:#374151; }
      .form-group input, .form-group textarea { padding:0.5rem 0.75rem; border:1px solid #E2E8F0; border-radius:8px; font-size:0.875rem; color:#1E293B; outline:none; font-family:inherit; }
      .form-group input:focus { border-color:#2563EB; }
      .form-row { display:grid; grid-template-columns:1fr 1fr; gap:1rem; }
      .btn-close { background:none; border:none; font-size:1.25rem; cursor:pointer; color:#64748B; }
      .reniec-hint { font-size:0.75rem; color:#64748B; margin-top:0.25rem; }
      .reniec-loading { font-size:0.75rem; color:#2563EB; margin-top:0.25rem; display:none; }
      .reniec-aviso { font-size:0.75rem; color:#D97706; margin-top:0.25rem; display:none; }
    </style>

    <div class="cli-header">
      <input type="text" id="searchInput" class="search-input" placeholder="🔍 Buscar por nombre o DNI..." />
      ${puedeEditar ? `<button class="btn-primary" id="btnNuevo"><i class="fas fa-plus"></i> Nuevo Cliente</button>` : ''}
    </div>
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>DNI</th>
            <th>Nombre</th>
            <th>Teléfono</th>
            <th>Email</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody id="cliTbody"></tbody>
      </table>
    </div>
    <div id="modalContainer"></div>
  `;

  await cargarClientes(container, puedeEditar, puedeEliminar);

  let searchTimer;
  container.querySelector('#searchInput').addEventListener('input', e => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => cargarClientes(container, puedeEditar, puedeEliminar, e.target.value), 400);
  });

  if (puedeEditar) {
    container.querySelector('#btnNuevo').addEventListener('click', () => abrirModal(container, null, puedeEditar));
  }
}

async function cargarClientes(container, puedeEditar, puedeEliminar, search = '') {
  const tbody = container.querySelector('#cliTbody');
  tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:2rem;color:#94A3B8;"><i class="fas fa-spinner fa-spin"></i></td></tr>`;
  const url = search ? `/clientes?search=${encodeURIComponent(search)}` : '/clientes';
  const res = await api.get(url);
  _clientes = res.ok ? (res.data.clientes || res.data || []) : [];

  renderClientes(container, puedeEditar, puedeEliminar);
}

function renderClientes(container, puedeEditar, puedeEliminar) {
  const tbody = container.querySelector('#cliTbody');

  if (_clientes.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><i class="fas fa-users"></i><p>No hay clientes registrados</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = _clientes.map(c => `
    <tr>
      <td data-label="DNI" style="font-weight:500;">${c.dni}</td>
      <td data-label="Nombre">${[c.nombre, c.apellido_paterno, c.apellido_materno].filter(Boolean).join(' ') || '—'}</td>
      <td data-label="Teléfono">${c.telefono || '—'}</td>
      <td data-label="Email">${c.email || '—'}</td>
      <td data-label="Acciones">
        <div style="display:flex;gap:0.5rem;">
          <button class="btn-info" data-id="${c._id}" data-action="ver"><i class="fas fa-eye"></i> Ver</button>
          ${puedeEditar ? `<button class="btn-info" data-id="${c._id}" data-action="editar" style="background:#F0FDF4;color:#16A34A;"><i class="fas fa-pen"></i></button>` : ''}
          ${puedeEliminar ? `<button class="btn-danger" data-id="${c._id}" data-action="eliminar"><i class="fas fa-trash"></i></button>` : ''}
        </div>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('[data-action="ver"]').forEach(btn => {
    btn.addEventListener('click', () => verDetalle(container, btn.dataset.id));
  });
  if (puedeEditar) {
    tbody.querySelectorAll('[data-action="editar"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const c = _clientes.find(x => x._id === btn.dataset.id);
        if (c) abrirModal(container, c, puedeEditar);
      });
    });
  }
  if (puedeEliminar) {
    tbody.querySelectorAll('[data-action="eliminar"]').forEach(btn => {
      btn.addEventListener('click', () => confirmarEliminar(container, btn.dataset.id, puedeEditar, puedeEliminar));
    });
  }
}

function abrirModal(container, cliente = null, puedeEditar) {
  const esEdicion = Boolean(cliente);
  const modalContainer = container.querySelector('#modalContainer');

  modalContainer.innerHTML = `
    <div class="modal-overlay" id="cliModal" role="dialog" aria-modal="true">
      <div class="modal">
        <div class="modal-header">
          <h2>${esEdicion ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
          <button class="btn-close" id="btnCerrar"><i class="fas fa-times"></i></button>
        </div>
        <form id="cliForm">
          <div class="modal-body">
            <div class="form-group">
              <label for="fDni">DNI * (8 dígitos)</label>
              <input id="fDni" name="dni" type="text" maxlength="8" pattern="\\d{8}" required value="${cliente?.dni || ''}" placeholder="12345678" />
              <span class="reniec-loading" id="reniecLoading"><i class="fas fa-spinner fa-spin"></i> Consultando RENIEC…</span>
              <span class="reniec-aviso" id="reniecAviso"><i class="fas fa-exclamation-triangle"></i> No encontrado en RENIEC. Ingresa los datos manualmente.</span>
              <span class="reniec-hint" id="reniecHint">Al ingresar 8 dígitos se consultará RENIEC automáticamente</span>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="fNombre">Nombre</label>
                <input id="fNombre" name="nombre" type="text" value="${cliente?.nombre || ''}" />
              </div>
              <div class="form-group">
                <label for="fApPat">Apellido paterno</label>
                <input id="fApPat" name="apellido_paterno" type="text" value="${cliente?.apellido_paterno || ''}" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="fApMat">Apellido materno</label>
                <input id="fApMat" name="apellido_materno" type="text" value="${cliente?.apellido_materno || ''}" />
              </div>
              <div class="form-group">
                <label for="fTel">Teléfono *</label>
                <input id="fTel" name="telefono" type="text" required value="${cliente?.telefono || ''}" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="fEmail">Email</label>
                <input id="fEmail" name="correo" type="email" value="${cliente?.email || ''}" />
              </div>
              <div class="form-group">
                <label for="fDir">Dirección</label>
                <input id="fDir" name="direccion" type="text" value="${cliente?.direccion || ''}" />
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn-secondary" id="btnCancelar">Cancelar</button>
            <button type="submit" class="btn-primary" id="btnGuardar">
              <i class="fas fa-save"></i> ${esEdicion ? 'Guardar cambios' : 'Crear cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  const cerrar = () => { modalContainer.innerHTML = ''; };
  modalContainer.querySelector('#btnCerrar').addEventListener('click', cerrar);
  modalContainer.querySelector('#btnCancelar').addEventListener('click', cerrar);
  modalContainer.querySelector('#cliModal').addEventListener('click', e => { if (e.target.id === 'cliModal') cerrar(); });

  // Autocompletado RENIEC al ingresar 8 dígitos
  const dniInput = modalContainer.querySelector('#fDni');
  dniInput.addEventListener('input', () => {
    const val = dniInput.value.trim();
    clearTimeout(_dniTimer);
    if (val.length === 8 && /^\d{8}$/.test(val)) {
      _dniTimer = setTimeout(() => consultarRENIEC(modalContainer, val), 300);
    }
  });

  modalContainer.querySelector('#cliForm').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = modalContainer.querySelector('#btnGuardar');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando…';

    const fd = new FormData(e.target);
    const body = Object.fromEntries(fd.entries());

    let res;
    if (esEdicion) {
      res = await api.put(`/clientes/${cliente._id}`, body);
    } else {
      res = await api.post('/clientes', body);
    }

    if (res.ok) {
      window.showToast(esEdicion ? 'Cliente actualizado' : 'Cliente creado correctamente', 'success');
      cerrar();
      const clienteData = res.data.cliente || res.data;
      if (esEdicion) {
        const idx = _clientes.findIndex(x => x._id === cliente._id);
        if (idx !== -1) _clientes[idx] = clienteData;
      } else {
        _clientes.push(clienteData);
      }
      renderClientes(container, puedeEditar, true);
    } else {
      window.showToast(res.data?.error || 'Error al guardar', 'error');
      btn.disabled = false;
      btn.innerHTML = `<i class="fas fa-save"></i> ${esEdicion ? 'Guardar cambios' : 'Crear cliente'}`;
    }
  });
}

async function consultarRENIEC(modalContainer, dni) {
  const loadingEl = modalContainer.querySelector('#reniecLoading');
  const avisoEl = modalContainer.querySelector('#reniecAviso');
  const hintEl = modalContainer.querySelector('#reniecHint');
  loadingEl.style.display = 'block';
  avisoEl.style.display = 'none';
  hintEl.style.display = 'none';

  const res = await api.get(`/clientes/dni/${dni}`);
  loadingEl.style.display = 'none';

  if (res.ok && res.data.encontrado !== false) {
    const d = res.data;
    if (d.nombre) modalContainer.querySelector('#fNombre').value = d.nombre;
    if (d.apellido_paterno) modalContainer.querySelector('#fApPat').value = d.apellido_paterno;
    if (d.apellido_materno) modalContainer.querySelector('#fApMat').value = d.apellido_materno;
    hintEl.style.display = 'block';
    hintEl.textContent = '✓ Datos completados desde RENIEC';
    hintEl.style.color = '#16A34A';
  } else {
    avisoEl.style.display = 'block';
  }
}

async function verDetalle(container, id) {
  const modalContainer = container.querySelector('#modalContainer');
  modalContainer.innerHTML = `
    <div class="modal-overlay" id="detModal" role="dialog" aria-modal="true">
      <div class="modal modal-lg">
        <div class="modal-header">
          <h2>Detalle del Cliente</h2>
          <button class="btn-close" id="btnCerrarDet"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body" id="detBody">
          <div style="text-align:center;padding:2rem;color:#94A3B8;"><i class="fas fa-spinner fa-spin" style="font-size:1.5rem;"></i></div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" id="btnCerrarDet2">Cerrar</button>
        </div>
      </div>
    </div>
  `;
  const cerrar = () => { modalContainer.innerHTML = ''; };
  modalContainer.querySelector('#btnCerrarDet').addEventListener('click', cerrar);
  modalContainer.querySelector('#btnCerrarDet2').addEventListener('click', cerrar);
  modalContainer.querySelector('#detModal').addEventListener('click', e => { if (e.target.id === 'detModal') cerrar(); });

  const res = await api.get(`/clientes/${id}`);
  const detBody = modalContainer.querySelector('#detBody');
  if (!res.ok) {
    detBody.innerHTML = `<p style="color:#DC2626;">Error al cargar el cliente.</p>`;
    return;
  }
  const c = res.data.cliente || res.data;
  const ventas = res.data.ventas || [];

  detBody.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-bottom:1.25rem;">
      <div><span style="font-size:0.75rem;color:#64748B;font-weight:600;">DNI</span><div style="font-weight:500;">${c.dni}</div></div>
      <div><span style="font-size:0.75rem;color:#64748B;font-weight:600;">Nombre completo</span><div style="font-weight:500;">${[c.nombre,c.apellido_paterno,c.apellido_materno].filter(Boolean).join(' ')||'—'}</div></div>
      <div><span style="font-size:0.75rem;color:#64748B;font-weight:600;">Teléfono</span><div>${c.telefono||'—'}</div></div>
      <div><span style="font-size:0.75rem;color:#64748B;font-weight:600;">Email</span><div>${c.email||'—'}</div></div>
      <div><span style="font-size:0.75rem;color:#64748B;font-weight:600;">Dirección</span><div>${c.direccion||'—'}</div></div>
    </div>
    <div style="font-weight:600;margin-bottom:0.75rem;">Historial de ventas (${ventas.length})</div>
    ${ventas.length === 0 ? '<p style="color:#94A3B8;font-size:0.875rem;">Sin ventas registradas</p>' : `
      <div style="overflow-x:auto;">
        <table>
          <thead><tr><th>N° Venta</th><th>Total</th><th>Método</th><th>Estado</th><th>Fecha</th></tr></thead>
          <tbody>
            ${ventas.map(v => `
              <tr>
                <td style="font-weight:500;">${v.numero_venta||'—'}</td>
                <td>S/ ${Number(v.total).toLocaleString('es-PE',{minimumFractionDigits:2})}</td>
                <td style="text-transform:capitalize;">${v.metodo_pago}</td>
                <td><span style="padding:0.15rem 0.5rem;border-radius:999px;font-size:0.75rem;font-weight:600;background:${v.estado==='completada'?'#DCFCE7':'#FEE2E2'};color:${v.estado==='completada'?'#16A34A':'#DC2626'};">${v.estado}</span></td>
                <td>${new Date(v.fecha_venta).toLocaleDateString('es-PE')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `}
  `;
}

async function confirmarEliminar(container, id, puedeEditar, puedeEliminar) {
  const c = _clientes.find(x => x._id === id);
  if (!c) return;
  const modalContainer = container.querySelector('#modalContainer');
  modalContainer.innerHTML = `
    <div class="modal-overlay" id="delModal" role="dialog" aria-modal="true">
      <div class="modal" style="max-width:400px;">
        <div class="modal-header">
          <h2>Eliminar Cliente</h2>
          <button class="btn-close" id="btnCerrarDel"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
          <p>¿Eliminar a <strong>${[c.nombre,c.apellido_paterno].filter(Boolean).join(' ')||c.dni}</strong>? Esta acción no se puede deshacer.</p>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" id="btnCancelarDel">Cancelar</button>
          <button class="btn-danger" id="btnConfirmarDel" style="padding:0.5rem 1rem;"><i class="fas fa-trash"></i> Eliminar</button>
        </div>
      </div>
    </div>
  `;
  const cerrar = () => { modalContainer.innerHTML = ''; };
  modalContainer.querySelector('#btnCerrarDel').addEventListener('click', cerrar);
  modalContainer.querySelector('#btnCancelarDel').addEventListener('click', cerrar);
  modalContainer.querySelector('#btnConfirmarDel').addEventListener('click', async () => {
    const res = await api.delete(`/clientes/${id}`);
    if (res.ok) {
      window.showToast('Cliente eliminado', 'success');
      cerrar();
      _clientes = _clientes.filter(x => x._id !== id);
      renderClientes(container, puedeEditar, puedeEliminar);
    } else {
      window.showToast(res.data?.error || 'Error al eliminar', 'error');
    }
  });
}
