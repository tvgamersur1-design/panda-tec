/**
 * clientes.js — Módulo de gestión de clientes
 * CRUD con autocompletado RENIEC y detalle con historial de ventas.
 */

import { api } from '../api.js';

let _clientes = [];
let _dniTimer = null;
let _cliPagina = 1;
let _cliTotalPaginas = 1;
let _cliTotal = 0;

export async function init(container, user) {
  const puedeEditar = user && (user.rol === 'admin' || user.rol === 'vendedor');
  const puedeEliminar = user && user.rol === 'admin';

  container.innerHTML = `
    <div class="cli-header">
      <div class="cli-search-wrap">
        <i class="fas fa-search cli-search-icon"></i>
        <input type="text" id="searchInput" class="search-input cli-search-input" placeholder="Buscar por nombre o DNI..." />
      </div>
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
    <div id="cliPaginacion" class="cli-pag"></div>
    <div id="modalContainer"></div>
  `;

  await cargarClientes(container, puedeEditar, puedeEliminar);

  let searchTimer;
  container.querySelector('#searchInput').addEventListener('input', e => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => cargarClientes(container, puedeEditar, puedeEliminar, e.target.value, 1), 400);
  });

  if (puedeEditar) {
    container.querySelector('#btnNuevo').addEventListener('click', () => abrirModal(container, null, puedeEditar));
  }
}

async function cargarClientes(container, puedeEditar, puedeEliminar, search = '', pagina = 1) {
  const tbody = container.querySelector('#cliTbody');
  tbody.innerHTML = `<tr><td colspan="5" class="cli-spinner"><i class="fas fa-spinner fa-spin"></i></td></tr>`;
  let url = search ? `/clientes?search=${encodeURIComponent(search)}&page=${pagina}&limit=15` : `/clientes?page=${pagina}&limit=15`;
  const res = await api.get(url);
  if (res.ok && res.data.clientes) {
    _clientes = res.data.clientes;
    _cliPagina = res.data.page || 1;
    _cliTotalPaginas = res.data.totalPages || 1;
    _cliTotal = res.data.total || 0;
  } else {
    _clientes = res.ok ? (res.data.clientes || res.data || []) : [];
    _cliPagina = 1;
    _cliTotalPaginas = 1;
    _cliTotal = _clientes.length;
  }

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
      <td data-label="DNI" class="cli-name">${c.dni}</td>
      <td data-label="Nombre">${[c.nombre, c.apellido_paterno, c.apellido_materno].filter(Boolean).join(' ') || '—'}</td>
      <td data-label="Teléfono">${c.telefono || '—'}</td>
      <td data-label="Email">${c.email || '—'}</td>
      <td data-label="Acciones">
        <div class="cli-actions">
          <button class="btn-info" data-id="${c._id}" data-action="ver"><i class="fas fa-eye"></i> Ver</button>
          ${puedeEditar ? `<button class="btn-info cli-edit-btn" data-id="${c._id}" data-action="editar"><i class="fas fa-pen"></i></button>` : ''}
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

  // Paginación
  const pagDiv = container.querySelector('#cliPaginacion');
  if (pagDiv) {
    const searchVal = container.querySelector('#searchInput')?.value || '';
    if (_cliTotalPaginas <= 1) {
      pagDiv.innerHTML = `<span>${_cliTotal} cliente(s)</span><span></span>`;
    } else {
      const desde = (_cliPagina - 1) * 15 + 1;
      const hasta = Math.min(_cliPagina * 15, _cliTotal);
      let botones = '';
      botones += `<button data-page="${_cliPagina - 1}" class="pag-btn-sm" ${_cliPagina <= 1 ? 'disabled' : ''}>← Ant</button>`;
      for (let i = 1; i <= _cliTotalPaginas; i++) {
        if (i === 1 || i === _cliTotalPaginas || Math.abs(i - _cliPagina) <= 1) {
          const active = i === _cliPagina;
          botones += `<button data-page="${i}" class="pag-btn-sm ${active ? 'pag-btn-sm--active' : ''}" ${active ? '' : ''}>${i}</button>`;
        } else if (Math.abs(i - _cliPagina) === 2) {
          botones += `<span class="pag-ellipsis">…</span>`;
        }
      }
      botones += `<button data-page="${_cliPagina + 1}" class="pag-btn-sm" ${_cliPagina >= _cliTotalPaginas ? 'disabled' : ''}>Sig →</button>`;
      pagDiv.innerHTML = `<span>Mostrando ${desde}-${hasta} de ${_cliTotal}</span><div class="cli-pag-btns">${botones}</div>`;
      pagDiv.querySelectorAll('[data-page]').forEach(btn => {
        btn.addEventListener('click', () => {
          const p = parseInt(btn.dataset.page);
          if (p >= 1 && p <= _cliTotalPaginas) cargarClientes(container, puedeEditar, puedeEliminar, searchVal, p);
        });
      });
    }
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
      api.invalidatePrefix('/clientes');
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
          <div class="cli-spinner"><i class="fas fa-spinner fa-spin"></i></div>
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
    detBody.innerHTML = `<p class="cli-error">Error al cargar el cliente.</p>`;
    return;
  }
  const c = res.data.cliente || res.data;
  const ventas = res.data.ventas || [];

  detBody.innerHTML = `
    <div class="cli-detail-grid">
      <div><span class="cli-detail-label">DNI</span><div class="cli-detail-value">${c.dni}</div></div>
      <div><span class="cli-detail-label">Nombre completo</span><div class="cli-detail-value">${[c.nombre,c.apellido_paterno,c.apellido_materno].filter(Boolean).join(' ')||'—'}</div></div>
      <div><span class="cli-detail-label">Teléfono</span><div>${c.telefono||'—'}</div></div>
      <div><span class="cli-detail-label">Email</span><div>${c.email||'—'}</div></div>
      <div><span class="cli-detail-label">Dirección</span><div>${c.direccion||'—'}</div></div>
    </div>
    <div class="cli-hist-title">Historial de ventas (${ventas.length})</div>
    ${ventas.length === 0 ? '<p class="cli-hist-empty">Sin ventas registradas</p>' : `
      <div class="cli-hist-table">
        <table>
          <thead><tr><th>N° Venta</th><th>Total</th><th>Método</th><th>Estado</th><th>Fecha</th></tr></thead>
          <tbody>
            ${ventas.map(v => `
              <tr>
                <td class="cli-hist-num">${v.numero_venta||'—'}</td>
                <td>S/ ${Number(v.total).toLocaleString('es-PE',{minimumFractionDigits:2})}</td>
                <td style="text-transform:capitalize;">${v.metodo_pago}</td>
                <td><span class="cli-hist-estado" style="background:${v.estado==='completada'?'#DCFCE7':'#FEE2E2'};color:${v.estado==='completada'?'#16A34A':'#DC2626'};">${v.estado}</span></td>
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
      <div class="modal cli-modal-max">
        <div class="modal-header">
          <h2>Eliminar Cliente</h2>
          <button class="btn-close" id="btnCerrarDel"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
          <p>¿Eliminar a <strong>${[c.nombre,c.apellido_paterno].filter(Boolean).join(' ')||c.dni}</strong>? Esta acción no se puede deshacer.</p>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" id="btnCancelarDel">Cancelar</button>
          <button class="btn-danger usr-btn-pad" id="btnConfirmarDel"><i class="fas fa-trash"></i> Eliminar</button>
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
      api.invalidatePrefix('/clientes');
    } else {
      window.showToast(res.data?.error || 'Error al eliminar', 'error');
    }
  });
}
