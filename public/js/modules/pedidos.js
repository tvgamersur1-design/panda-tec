/**
 * pedidos.js — Módulo de Pedidos a Proveedores
 * Tabs: Pedidos y Proveedores.
 */

import { api } from '../api.js';

let _proveedores = [];
let _productos = [];
let _pedidos = [];
let _pedPagina = 1;
let _pedTotalPaginas = 1;
let _pedTotal = 0;

export async function init(container, user) {
  const puedeEditar = user && (user.rol === 'admin' || user.rol === 'almacen');

  container.innerHTML = `
    <style>
      .tabs { display:flex; border-bottom:1px solid #E2E8F0; margin-bottom:1.25rem; }
      .tab-btn { padding:0.625rem 1.25rem; border:none; background:none; font-size:0.875rem; font-weight:500; cursor:pointer; color:#64748B; border-bottom:2px solid transparent; margin-bottom:-1px; }
      .tab-btn.active { color:#2563EB; border-bottom-color:#2563EB; }
      .btn-primary { display:inline-flex; align-items:center; gap:0.5rem; padding:0.5rem 1rem; background:#2563EB; color:#fff; border:none; border-radius:8px; font-size:0.875rem; font-weight:600; cursor:pointer; }
      .btn-primary:hover { background:#1D4ED8; }
      .btn-secondary { display:inline-flex; align-items:center; gap:0.5rem; padding:0.5rem 1rem; background:#F1F5F9; color:#1E293B; border:1px solid #E2E8F0; border-radius:8px; font-size:0.875rem; font-weight:500; cursor:pointer; }
      .btn-success { display:inline-flex; align-items:center; gap:0.5rem; padding:0.4rem 0.75rem; background:#DCFCE7; color:#16A34A; border:none; border-radius:6px; font-size:0.8125rem; font-weight:500; cursor:pointer; }
      .btn-edit { display:inline-flex; align-items:center; gap:0.5rem; padding:0.4rem 0.75rem; background:#EFF6FF; color:#2563EB; border:none; border-radius:6px; font-size:0.8125rem; font-weight:500; cursor:pointer; }
      .btn-danger { display:inline-flex; align-items:center; gap:0.5rem; padding:0.4rem 0.75rem; background:#FEE2E2; color:#DC2626; border:none; border-radius:6px; font-size:0.8125rem; font-weight:500; cursor:pointer; }
      .section-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:1rem; flex-wrap:wrap; gap:0.75rem; }
      .filters { display:flex; gap:0.75rem; flex-wrap:wrap; }
      .filters select { padding:0.5rem 0.75rem; border:1px solid #E2E8F0; border-radius:8px; font-size:0.875rem; background:#fff; outline:none; }
      .table-wrap { background:#fff; border-radius:12px; border:1px solid #E2E8F0; overflow:auto; }
      table { width:100%; border-collapse:collapse; font-size:0.875rem; }
      th { padding:0.75rem 1rem; text-align:left; font-size:0.75rem; font-weight:600; text-transform:uppercase; color:#64748B; border-bottom:1px solid #E2E8F0; }
      td { padding:0.75rem 1rem; border-bottom:1px solid #F1F5F9; vertical-align:middle; }
      tr:last-child td { border-bottom:none; }
      tr:hover td { background:#F8FAFC; }
      .badge { display:inline-flex; align-items:center; gap:0.25rem; padding:0.2rem 0.6rem; border-radius:999px; font-size:0.75rem; font-weight:600; }
      .badge-warning { background:#FEF3C7; color:#D97706; }
      .badge-ok { background:#DCFCE7; color:#16A34A; }
      .empty-state { text-align:center; padding:3rem; color:#64748B; }
      .empty-state i { font-size:2.5rem; margin-bottom:1rem; display:block; opacity:0.35; }
      .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.45); z-index:1000; display:flex; align-items:center; justify-content:center; padding:1rem; }
      .modal { background:#fff; border-radius:14px; width:100%; max-width:560px; max-height:90vh; overflow-y:auto; box-shadow:0 20px 60px rgba(0,0,0,0.2); animation:slideUp 0.2s ease; }
      @keyframes slideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
      .modal-header { display:flex; align-items:center; justify-content:space-between; padding:1.25rem 1.5rem; border-bottom:1px solid #E2E8F0; }
      .modal-header h2 { font-size:1.125rem; font-weight:700; }
      .modal-body { padding:1.5rem; display:flex; flex-direction:column; gap:1rem; }
      .modal-footer { display:flex; justify-content:flex-end; gap:0.75rem; padding:1rem 1.5rem; border-top:1px solid #E2E8F0; }
      .form-group { display:flex; flex-direction:column; gap:0.375rem; }
      .form-group label { font-size:0.8125rem; font-weight:600; color:#374151; }
      .form-group input, .form-group select { padding:0.5rem 0.75rem; border:1px solid #E2E8F0; border-radius:8px; font-size:0.875rem; color:#1E293B; outline:none; }
      .form-group input:focus, .form-group select:focus { border-color:#2563EB; }
      .form-row { display:grid; grid-template-columns:1fr 1fr; gap:1rem; }
      .btn-close { background:none; border:none; font-size:1.25rem; cursor:pointer; color:#64748B; }
      .item-row { display:flex; align-items:center; gap:0.75rem; padding:0.5rem; border:1px solid #F1F5F9; border-radius:8px; }
      .item-row select { flex:1; padding:0.375rem 0.5rem; border:1px solid #E2E8F0; border-radius:6px; font-size:0.875rem; }
      .item-row input { width:80px; padding:0.375rem 0.5rem; border:1px solid #E2E8F0; border-radius:6px; font-size:0.875rem; }
      .btn-rm-item { background:none; border:none; color:#DC2626; cursor:pointer; font-size:0.875rem; }
    </style>

    <div class="tabs">
      <button class="tab-btn active" data-tab="pedidos">Pedidos</button>
      <button class="tab-btn" data-tab="proveedores">Proveedores</button>
    </div>

    <div id="viewPedidos"></div>
    <div id="viewProveedores" style="display:none;"></div>
    <div id="modalContainer"></div>
  `;

  // Cargar datos base
  const [provRes, prodRes] = await Promise.all([api.get('/proveedores?limit=200'), api.get('/productos?limit=200')]);
  _proveedores = provRes.ok ? (provRes.data.proveedores || provRes.data || []) : [];
  _productos = prodRes.ok ? (prodRes.data.productos || prodRes.data || []) : [];

  // Tabs
  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (btn.dataset.tab === 'pedidos') {
        container.querySelector('#viewPedidos').style.display = '';
        container.querySelector('#viewProveedores').style.display = 'none';
        renderPedidos(container, puedeEditar);
      } else {
        container.querySelector('#viewPedidos').style.display = 'none';
        container.querySelector('#viewProveedores').style.display = '';
        renderProveedores(container, puedeEditar);
      }
    });
  });

  renderPedidos(container, puedeEditar);
}

async function renderPedidos(container, puedeEditar) {
  const view = container.querySelector('#viewPedidos');
  view.innerHTML = `
    <div class="section-header">
      <div class="filters">
        <select id="filtroEstado">
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="recibido">Recibido</option>
        </select>
        <select id="filtroProveedor">
          <option value="">Todos los proveedores</option>
          ${_proveedores.map(p => `<option value="${p._id}">${p.nombre}</option>`).join('')}
        </select>
        <button class="btn-secondary" id="btnFiltrar"><i class="fas fa-filter"></i> Filtrar</button>
      </div>
      ${puedeEditar ? `<button class="btn-primary" id="btnNuevoPedido"><i class="fas fa-plus"></i> Nuevo Pedido</button>` : ''}
    </div>
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr><th>ID</th><th>Proveedor</th><th>Productos</th><th>Estado</th><th>Fecha</th>${puedeEditar?'<th>Acciones</th>':''}</tr></thead>
        <tbody id="pedidosTbody"><tr><td colspan="${puedeEditar?6:5}" style="text-align:center;padding:2rem;color:#94A3B8;"><i class="fas fa-spinner fa-spin"></i></td></tr></tbody>
      </table>
    </div>
    <div id="pedPaginacion" style="display:flex;align-items:center;justify-content:space-between;padding:0.75rem 1rem;border-top:1px solid #E2E8F0;font-size:0.8125rem;color:#64748B;"></div>
  `;

  await cargarPedidos(container, puedeEditar);

  view.querySelector('#btnFiltrar').addEventListener('click', () => cargarPedidos(container, puedeEditar, 1));
  if (puedeEditar) {
    view.querySelector('#btnNuevoPedido').addEventListener('click', () => abrirModalPedido(container, puedeEditar));
  }
}

async function cargarPedidos(container, puedeEditar, pagina = 1) {
  const tbody = container.querySelector('#pedidosTbody');
  const estado = container.querySelector('#filtroEstado')?.value || '';
  const provId = container.querySelector('#filtroProveedor')?.value || '';
  let url = `/pedidos?page=${pagina}&limit=15`;
  if (estado) url += `&estado=${estado}`;
  if (provId) url += `&proveedor_id=${provId}`;

  const res = await api.get(url);
  if (res.ok && res.data.pedidos) {
    _pedidos = res.data.pedidos;
    _pedPagina = res.data.page || 1;
    _pedTotalPaginas = res.data.totalPages || 1;
    _pedTotal = res.data.total || 0;
  } else {
    _pedidos = res.ok ? (res.data.pedidos || res.data || []) : [];
    _pedPagina = 1;
    _pedTotalPaginas = 1;
    _pedTotal = _pedidos.length;
  }

  renderPedidosTbody(container, puedeEditar);
}

function renderPedidosTbody(container, puedeEditar) {
  const tbody = container.querySelector('#pedidosTbody');

  if (_pedidos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${puedeEditar?6:5}"><div class="empty-state"><i class="fas fa-truck"></i><p>No hay pedidos registrados</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = _pedidos.map(p => {
    const provNombre = p.proveedor_id?.nombre || _proveedores.find(x => x._id === p.proveedor_id)?.nombre || '—';
    const itemsCount = p.items?.length || 0;
    return `
      <tr>
        <td data-label="ID" style="font-size:0.75rem;color:#64748B;">${p._id.slice(-6).toUpperCase()}</td>
        <td data-label="Proveedor" style="font-weight:500;">${provNombre}</td>
        <td data-label="Productos">${itemsCount} producto(s)</td>
        <td data-label="Estado"><span class="badge ${p.estado==='recibido'?'badge-ok':'badge-warning'}">${p.estado}</span></td>
        <td data-label="Fecha">${new Date(p.fecha_creacion).toLocaleDateString('es-PE')}</td>
        ${puedeEditar ? `
          <td data-label="Acciones">
            ${p.estado === 'pendiente' ? `<button class="btn-success" data-id="${p._id}" data-action="recibir"><i class="fas fa-check"></i> Marcar recibido</button>` : '—'}
          </td>
        ` : ''}
      </tr>
    `;
  }).join('');

  if (puedeEditar) {
    tbody.querySelectorAll('[data-action="recibir"]').forEach(btn => {
      btn.addEventListener('click', () => confirmarRecibir(container, btn.dataset.id, puedeEditar));
    });
  }

  // Paginación
  const pagDiv = container.querySelector('#pedPaginacion');
  if (pagDiv) {
    if (_pedTotalPaginas <= 1) {
      pagDiv.innerHTML = `<span>${_pedTotal} pedido(s)</span><span></span>`;
    } else {
      const desde = (_pedPagina - 1) * 15 + 1;
      const hasta = Math.min(_pedPagina * 15, _pedTotal);
      let botones = '';
      botones += `<button data-page="${_pedPagina - 1}" ${_pedPagina <= 1 ? 'disabled' : ''} style="padding:0.25rem 0.5rem;border:1px solid #E2E8F0;border-radius:4px;background:#fff;cursor:pointer;font-size:0.75rem;">← Ant</button>`;
      for (let i = 1; i <= _pedTotalPaginas; i++) {
        if (i === 1 || i === _pedTotalPaginas || Math.abs(i - _pedPagina) <= 1) {
          botones += `<button data-page="${i}" style="padding:0.25rem 0.5rem;border:1px solid ${i === _pedPagina ? '#2563EB' : '#E2E8F0'};border-radius:4px;background:${i === _pedPagina ? '#2563EB' : '#fff'};color:${i === _pedPagina ? '#fff' : '#374151'};cursor:pointer;font-size:0.75rem;font-weight:${i === _pedPagina ? '600' : '400'};">${i}</button>`;
        } else if (Math.abs(i - _pedPagina) === 2) {
          botones += `<span style="padding:0.25rem 0.25rem;font-size:0.75rem;color:#94A3B8;">…</span>`;
        }
      }
      botones += `<button data-page="${_pedPagina + 1}" ${_pedPagina >= _pedTotalPaginas ? 'disabled' : ''} style="padding:0.25rem 0.5rem;border:1px solid #E2E8F0;border-radius:4px;background:#fff;cursor:pointer;font-size:0.75rem;">Sig →</button>`;
      pagDiv.innerHTML = `<span>Mostrando ${desde}-${hasta} de ${_pedTotal}</span><div style="display:flex;gap:0.25rem;align-items:center;">${botones}</div>`;
      pagDiv.querySelectorAll('[data-page]').forEach(btn => {
        btn.addEventListener('click', () => {
          const p = parseInt(btn.dataset.page);
          if (p >= 1 && p <= _pedTotalPaginas) cargarPedidos(container, puedeEditar, p);
        });
      });
    }
  }
}

function abrirModalPedido(container, puedeEditar) {
  const modalContainer = container.querySelector('#modalContainer');
  let items = [{ producto_id: '', cantidad: 1 }];

  const renderItems = () => {
    const itemsEl = modalContainer.querySelector('#itemsContainer');
    itemsEl.innerHTML = items.map((item, idx) => `
      <div class="item-row">
        <select data-idx="${idx}" data-field="producto_id">
          <option value="">Seleccionar producto</option>
          ${_productos.map(p => `<option value="${p._id}" ${item.producto_id === p._id ? 'selected' : ''}>${p.nombre}</option>`).join('')}
        </select>
        <input type="number" min="1" value="${item.cantidad}" data-idx="${idx}" data-field="cantidad" placeholder="Cant." />
        ${items.length > 1 ? `<button class="btn-rm-item" data-idx="${idx}" data-action="rm"><i class="fas fa-times"></i></button>` : ''}
      </div>
    `).join('');

    itemsEl.querySelectorAll('[data-field]').forEach(el => {
      el.addEventListener('change', () => {
        const idx = parseInt(el.dataset.idx);
        items[idx][el.dataset.field] = el.dataset.field === 'cantidad' ? parseInt(el.value) || 1 : el.value;
      });
      el.addEventListener('input', () => {
        const idx = parseInt(el.dataset.idx);
        items[idx][el.dataset.field] = el.dataset.field === 'cantidad' ? parseInt(el.value) || 1 : el.value;
      });
    });
    itemsEl.querySelectorAll('[data-action="rm"]').forEach(btn => {
      btn.addEventListener('click', () => { items.splice(parseInt(btn.dataset.idx), 1); renderItems(); });
    });
  };

  modalContainer.innerHTML = `
    <div class="modal-overlay" id="pedModal" role="dialog" aria-modal="true">
      <div class="modal">
        <div class="modal-header">
          <h2>Nuevo Pedido</h2>
          <button class="btn-close" id="btnCerrarPed"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="fProveedor">Proveedor *</label>
            <select id="fProveedor" required>
              <option value="">Seleccionar proveedor</option>
              ${_proveedores.map(p => `<option value="${p._id}">${p.nombre}</option>`).join('')}
            </select>
          </div>
          <div>
            <div style="font-size:0.8125rem;font-weight:600;color:#374151;margin-bottom:0.5rem;">Productos *</div>
            <div id="itemsContainer"></div>
            <button type="button" class="btn-secondary" id="btnAgregarItem" style="margin-top:0.5rem;font-size:0.8125rem;padding:0.375rem 0.75rem;">
              <i class="fas fa-plus"></i> Agregar producto
            </button>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" id="btnCancelarPed">Cancelar</button>
          <button class="btn-primary" id="btnGuardarPed"><i class="fas fa-save"></i> Crear Pedido</button>
        </div>
      </div>
    </div>
  `;

  renderItems();

  const cerrar = () => { modalContainer.innerHTML = ''; };
  modalContainer.querySelector('#btnCerrarPed').addEventListener('click', cerrar);
  modalContainer.querySelector('#btnCancelarPed').addEventListener('click', cerrar);
  modalContainer.querySelector('#btnAgregarItem').addEventListener('click', () => {
    items.push({ producto_id: '', cantidad: 1 });
    renderItems();
  });

  modalContainer.querySelector('#btnGuardarPed').addEventListener('click', async () => {
    const provId = modalContainer.querySelector('#fProveedor').value;
    if (!provId) { window.showToast('Selecciona un proveedor', 'warning'); return; }
    const itemsValidos = items.filter(i => i.producto_id && i.cantidad > 0);
    if (itemsValidos.length === 0) { window.showToast('Agrega al menos un producto', 'warning'); return; }

    const btn = modalContainer.querySelector('#btnGuardarPed');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando…';

    const res = await api.post('/pedidos', { proveedor_id: provId, items: itemsValidos });
    if (res.ok) {
      window.showToast('Pedido creado correctamente', 'success');
      cerrar();
      const nuevoPedido = res.data.pedido || res.data;
      _pedidos.unshift(nuevoPedido);
      renderPedidosTbody(container, puedeEditar);
      api.invalidatePrefix('/pedidos');
    } else {
      window.showToast(res.data?.error || 'Error al crear el pedido', 'error');
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-save"></i> Crear Pedido';
    }
  });
}

function confirmarRecibir(container, id, puedeEditar) {
  const modalContainer = container.querySelector('#modalContainer');
  modalContainer.innerHTML = `
    <div class="modal-overlay" id="recModal" role="dialog" aria-modal="true">
      <div class="modal" style="max-width:400px;">
        <div class="modal-header">
          <h2>Marcar como Recibido</h2>
          <button class="btn-close" id="btnCerrarRec"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
          <p>¿Confirmas que este pedido fue recibido? El stock de los productos se actualizará automáticamente.</p>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" id="btnCancelarRec">Cancelar</button>
          <button class="btn-success" id="btnConfirmarRec" style="padding:0.5rem 1rem;"><i class="fas fa-check"></i> Confirmar recepción</button>
        </div>
      </div>
    </div>
  `;
  const cerrar = () => { modalContainer.innerHTML = ''; };
  modalContainer.querySelector('#btnCerrarRec').addEventListener('click', cerrar);
  modalContainer.querySelector('#btnCancelarRec').addEventListener('click', cerrar);
  modalContainer.querySelector('#btnConfirmarRec').addEventListener('click', async () => {
    const res = await api.put(`/pedidos/${id}/recibir`, {});
    if (res.ok) {
      window.showToast('Pedido marcado como recibido. Stock actualizado.', 'success');
      cerrar();
      api.invalidatePrefix('/productos');
      api.invalidatePrefix('/dashboard');
      const idx = _pedidos.findIndex(p => p._id === id);
      if (idx !== -1) {
        _pedidos[idx] = { ..._pedidos[idx], estado: 'recibido' };
      }
      renderPedidosTbody(container, puedeEditar);
    } else {
      window.showToast(res.data?.error || 'Error al actualizar el pedido', 'error');
    }
  });
}

async function renderProveedores(container, puedeEditar) {
  const view = container.querySelector('#viewProveedores');
  view.innerHTML = `
    <div class="section-header">
      <h3 style="font-size:1rem;font-weight:600;">Proveedores</h3>
      ${puedeEditar ? `<button class="btn-primary" id="btnNuevoProv"><i class="fas fa-plus"></i> Nuevo Proveedor</button>` : ''}
    </div>
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr><th>Nombre</th><th>Teléfono</th><th>Correo</th>${puedeEditar?'<th>Acciones</th>':''}</tr></thead>
        <tbody id="provTbody"></tbody>
      </table>
    </div>
  `;

  renderProvTbody(container, puedeEditar);

  if (puedeEditar) {
    view.querySelector('#btnNuevoProv').addEventListener('click', () => abrirModalProveedor(container, null, puedeEditar));
  }
}

function renderProvTbody(container, puedeEditar) {
  const tbody = container.querySelector('#provTbody');
  if (!tbody) return;
  if (_proveedores.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${puedeEditar?4:3}"><div class="empty-state"><i class="fas fa-building"></i><p>No hay proveedores registrados</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = _proveedores.map(p => `
    <tr>
      <td data-label="Nombre" style="font-weight:500;">${p.nombre}</td>
      <td data-label="Teléfono">${p.telefono}</td>
      <td data-label="Correo">${p.correo}</td>
      ${puedeEditar ? `
        <td data-label="Acciones">
          <button class="btn-edit" data-id="${p._id}" data-action="editar"><i class="fas fa-pen"></i> Editar</button>
        </td>
      ` : ''}
    </tr>
  `).join('');

  if (puedeEditar) {
    tbody.querySelectorAll('[data-action="editar"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const prov = _proveedores.find(x => x._id === btn.dataset.id);
        if (prov) abrirModalProveedor(container, prov, puedeEditar);
      });
    });
  }
}

function abrirModalProveedor(container, proveedor = null, puedeEditar) {
  const esEdicion = Boolean(proveedor);
  const modalContainer = container.querySelector('#modalContainer');
  modalContainer.innerHTML = `
    <div class="modal-overlay" id="provModal" role="dialog" aria-modal="true">
      <div class="modal" style="max-width:440px;">
        <div class="modal-header">
          <h2>${esEdicion ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h2>
          <button class="btn-close" id="btnCerrarProv"><i class="fas fa-times"></i></button>
        </div>
        <form id="provForm">
          <div class="modal-body">
            <div class="form-group">
              <label for="fNombreProv">Nombre *</label>
              <input id="fNombreProv" name="nombre" type="text" required value="${proveedor?.nombre || ''}" />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="fTelProv">Teléfono *</label>
                <input id="fTelProv" name="telefono" type="text" required value="${proveedor?.telefono || ''}" />
              </div>
              <div class="form-group">
                <label for="fCorreoProv">Correo *</label>
                <input id="fCorreoProv" name="correo" type="email" required value="${proveedor?.correo || ''}" />
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn-secondary" id="btnCancelarProv">Cancelar</button>
            <button type="submit" class="btn-primary"><i class="fas fa-save"></i> ${esEdicion ? 'Guardar' : 'Crear'}</button>
          </div>
        </form>
      </div>
    </div>
  `;
  const cerrar = () => { modalContainer.innerHTML = ''; };
  modalContainer.querySelector('#btnCerrarProv').addEventListener('click', cerrar);
  modalContainer.querySelector('#btnCancelarProv').addEventListener('click', cerrar);
  modalContainer.querySelector('#provForm').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = Object.fromEntries(fd.entries());
    const res = esEdicion ? await api.put(`/proveedores/${proveedor._id}`, body) : await api.post('/proveedores', body);
    if (res.ok) {
      window.showToast(esEdicion ? 'Proveedor actualizado' : 'Proveedor creado', 'success');
      const provData = res.data.proveedor || res.data;
      if (esEdicion) {
        const idx = _proveedores.findIndex(x => x._id === proveedor._id);
        if (idx !== -1) _proveedores[idx] = provData;
      } else {
        _proveedores.push(provData);
      }
      cerrar();
      renderProvTbody(container, puedeEditar);
      api.invalidatePrefix('/proveedores');
    } else {
      window.showToast(res.data?.error || 'Error al guardar', 'error');
    }
  });
}
