/**
 * categorias.js — Módulo de gestión de categorías
 * Solo accesible para admin.
 */

import { api } from '../api.js';

let _categorias = [];

export async function init(container, user) {
  const puedeEditar = user && user.rol === 'admin';

  container.innerHTML = `
    <style>
      .cat-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:1.25rem; flex-wrap:wrap; gap:0.75rem; }
      .btn-primary { display:inline-flex; align-items:center; gap:0.5rem; padding:0.5rem 1rem; background:#2563EB; color:#fff; border:none; border-radius:8px; font-size:0.875rem; font-weight:600; cursor:pointer; }
      .btn-primary:hover { background:#1D4ED8; }
      .btn-secondary { display:inline-flex; align-items:center; gap:0.5rem; padding:0.5rem 1rem; background:#F1F5F9; color:#1E293B; border:1px solid #E2E8F0; border-radius:8px; font-size:0.875rem; font-weight:500; cursor:pointer; }
      .btn-edit { display:inline-flex; align-items:center; gap:0.5rem; padding:0.4rem 0.75rem; background:#EFF6FF; color:#2563EB; border:none; border-radius:6px; font-size:0.8125rem; font-weight:500; cursor:pointer; }
      .btn-danger { display:inline-flex; align-items:center; gap:0.5rem; padding:0.4rem 0.75rem; background:#FEE2E2; color:#DC2626; border:none; border-radius:6px; font-size:0.8125rem; font-weight:500; cursor:pointer; }
      .cat-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:1rem; }
      .cat-card { background:#fff; border:1px solid #E2E8F0; border-radius:12px; padding:1.25rem; display:flex; flex-direction:column; gap:0.75rem; }
      .cat-card-name { font-size:1rem; font-weight:600; color:#1E293B; }
      .cat-card-desc { font-size:0.8125rem; color:#64748B; flex:1; }
      .cat-card-actions { display:flex; gap:0.5rem; }
      .empty-state { text-align:center; padding:3rem; color:#64748B; }
      .empty-state i { font-size:2.5rem; margin-bottom:1rem; display:block; opacity:0.35; }
      .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.45); z-index:1000; display:flex; align-items:center; justify-content:center; padding:1rem; }
      .modal { background:#fff; border-radius:14px; width:100%; max-width:440px; box-shadow:0 20px 60px rgba(0,0,0,0.2); animation:slideUp 0.2s ease; }
      @keyframes slideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
      .modal-header { display:flex; align-items:center; justify-content:space-between; padding:1.25rem 1.5rem; border-bottom:1px solid #E2E8F0; }
      .modal-header h2 { font-size:1.125rem; font-weight:700; }
      .modal-body { padding:1.5rem; display:flex; flex-direction:column; gap:1rem; }
      .modal-footer { display:flex; justify-content:flex-end; gap:0.75rem; padding:1rem 1.5rem; border-top:1px solid #E2E8F0; }
      .form-group { display:flex; flex-direction:column; gap:0.375rem; }
      .form-group label { font-size:0.8125rem; font-weight:600; color:#374151; }
      .form-group input, .form-group textarea { padding:0.5rem 0.75rem; border:1px solid #E2E8F0; border-radius:8px; font-size:0.875rem; color:#1E293B; outline:none; font-family:inherit; }
      .form-group input:focus, .form-group textarea:focus { border-color:#2563EB; }
      .btn-close { background:none; border:none; font-size:1.25rem; cursor:pointer; color:#64748B; }
    </style>

    <div class="cat-header">
      <h2 style="font-size:1rem;font-weight:600;">Gestión de Categorías</h2>
      ${puedeEditar ? `<button class="btn-primary" id="btnNueva"><i class="fas fa-plus"></i> Nueva Categoría</button>` : ''}
    </div>
    <div class="cat-grid" id="catGrid"></div>
    <div id="modalContainer"></div>
  `;

  await cargarCategorias(container, puedeEditar);

  if (puedeEditar) {
    container.querySelector('#btnNueva').addEventListener('click', () => abrirModal(container, null));
  }
}

async function cargarCategorias(container, puedeEditar) {
  const grid = container.querySelector('#catGrid');
  grid.innerHTML = `<p style="color:#94A3B8;font-size:0.875rem;"><i class="fas fa-spinner fa-spin"></i> Cargando…</p>`;

  const res = await api.get('/categorias');
  _categorias = res.ok ? (res.data.categorias || res.data || []) : [];

  renderCategorias(container, puedeEditar);
}

function renderCategorias(container, puedeEditar) {
  const grid = container.querySelector('#catGrid');

  if (_categorias.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <i class="fas fa-tags"></i>
        <p>No hay categorías registradas</p>
        ${puedeEditar ? `<p style="font-size:0.8125rem;margin-top:0.5rem;">Crea la primera categoría para organizar tus productos</p>` : ''}
      </div>
    `;
    return;
  }

  grid.innerHTML = _categorias.map(c => `
    <div class="cat-card">
      <div class="cat-card-name"><i class="fas fa-tag" style="color:#2563EB;margin-right:0.375rem;"></i>${c.nombre}</div>
      <div class="cat-card-desc">${c.descripcion || 'Sin descripción'}</div>
      ${puedeEditar ? `
        <div class="cat-card-actions">
          <button class="btn-edit" data-id="${c._id}" data-action="editar"><i class="fas fa-pen"></i> Editar</button>
          <button class="btn-danger" data-id="${c._id}" data-action="eliminar"><i class="fas fa-trash"></i></button>
        </div>
      ` : ''}
    </div>
  `).join('');

  if (puedeEditar) {
    grid.querySelectorAll('[data-action="editar"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const cat = _categorias.find(c => c._id === btn.dataset.id);
        if (cat) abrirModal(container, cat);
      });
    });
    grid.querySelectorAll('[data-action="eliminar"]').forEach(btn => {
      btn.addEventListener('click', () => confirmarEliminar(container, btn.dataset.id));
    });
  }
}

function abrirModal(container, categoria = null) {
  const esEdicion = Boolean(categoria);
  const modalContainer = container.querySelector('#modalContainer');

  modalContainer.innerHTML = `
    <div class="modal-overlay" id="catModal" role="dialog" aria-modal="true">
      <div class="modal">
        <div class="modal-header">
          <h2>${esEdicion ? 'Editar Categoría' : 'Nueva Categoría'}</h2>
          <button class="btn-close" id="btnCerrar"><i class="fas fa-times"></i></button>
        </div>
        <form id="catForm">
          <div class="modal-body">
            <div class="form-group">
              <label for="fNombre">Nombre *</label>
              <input id="fNombre" name="nombre" type="text" required value="${categoria?.nombre || ''}" placeholder="Ej: Smartphones" />
            </div>
            <div class="form-group">
              <label for="fDesc">Descripción</label>
              <textarea id="fDesc" name="descripcion" rows="2" placeholder="Descripción opcional">${categoria?.descripcion || ''}</textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn-secondary" id="btnCancelar">Cancelar</button>
            <button type="submit" class="btn-primary" id="btnGuardar">
              <i class="fas fa-save"></i> ${esEdicion ? 'Guardar cambios' : 'Crear categoría'}
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  const cerrar = () => { modalContainer.innerHTML = ''; };
  modalContainer.querySelector('#btnCerrar').addEventListener('click', cerrar);
  modalContainer.querySelector('#btnCancelar').addEventListener('click', cerrar);
  modalContainer.querySelector('#catModal').addEventListener('click', e => { if (e.target.id === 'catModal') cerrar(); });

  modalContainer.querySelector('#catForm').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = modalContainer.querySelector('#btnGuardar');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando…';

    const fd = new FormData(e.target);
    const body = Object.fromEntries(fd.entries());

    const res = esEdicion
      ? await api.put(`/categorias/${categoria._id}`, body)
      : await api.post('/categorias', body);

    if (res.ok) {
      window.showToast(esEdicion ? 'Categoría actualizada' : 'Categoría creada correctamente', 'success');
      cerrar();
      if (esEdicion) {
        const idx = _categorias.findIndex(c => c._id === categoria._id);
        if (idx !== -1) _categorias[idx] = res.data;
      } else {
        _categorias.push(res.data);
      }
      renderCategorias(container, true);
      api.invalidatePrefix('/categorias');
    } else {
      window.showToast(res.data?.error || 'Error al guardar', 'error');
      btn.disabled = false;
      btn.innerHTML = `<i class="fas fa-save"></i> ${esEdicion ? 'Guardar cambios' : 'Crear categoría'}`;
    }
  });
}

async function confirmarEliminar(container, id) {
  const cat = _categorias.find(c => c._id === id);
  if (!cat) return;

  const modalContainer = container.querySelector('#modalContainer');
  modalContainer.innerHTML = `
    <div class="modal-overlay" id="delModal" role="dialog" aria-modal="true">
      <div class="modal" style="max-width:400px;">
        <div class="modal-header">
          <h2>Eliminar Categoría</h2>
          <button class="btn-close" id="btnCerrarDel"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
          <p>¿Eliminar la categoría <strong>${cat.nombre}</strong>?</p>
          <p style="font-size:0.8125rem;color:#D97706;margin-top:0.5rem;"><i class="fas fa-exclamation-triangle"></i> No se puede eliminar si tiene productos asociados.</p>
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
    const res = await api.delete(`/categorias/${id}`);
    if (res.ok) {
      window.showToast('Categoría eliminada', 'success');
      cerrar();
      _categorias = _categorias.filter(c => c._id !== id);
      renderCategorias(container, true);
      api.invalidatePrefix('/categorias');
    } else {
      window.showToast(res.data?.error || 'Error al eliminar', 'error');
    }
  });
}
