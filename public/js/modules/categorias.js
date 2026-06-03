/**
 * categorias.js — Módulo de gestión de categorías
 * Solo accesible para admin.
 */

import { api } from '../api.js';

let _categorias = [];

export async function init(container, user) {
  const puedeEditar = user && user.rol === 'admin';

  container.innerHTML = `
    <div class="cat-header">
      <h2 class="cat-title">Gestión de Categorías</h2>
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
  grid.innerHTML = `<p class="cat-loading"><i class="fas fa-spinner fa-spin"></i> Cargando…</p>`;

  const res = await api.get('/categorias');
  _categorias = res.ok ? (res.data.categorias || res.data || []) : [];

  renderCategorias(container, puedeEditar);
}

function renderCategorias(container, puedeEditar) {
  const grid = container.querySelector('#catGrid');

  if (_categorias.length === 0) {
    grid.innerHTML = `
      <div class="empty-state cat-empty-full">
        <i class="fas fa-tags"></i>
        <p>No hay categorías registradas</p>
        ${puedeEditar ? `<p class="cat-empty-note">Crea la primera categoría para organizar tus productos</p>` : ''}
      </div>
    `;
    return;
  }

  grid.innerHTML = _categorias.map(c => `
    <div class="cat-card">
      <div class="cat-card-name"><i class="fas fa-tag cat-icon-tag"></i>${c.nombre}</div>
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
      <div class="modal cat-modal-max">
        <div class="modal-header">
          <h2>Eliminar Categoría</h2>
          <button class="btn-close" id="btnCerrarDel"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
          <p>¿Eliminar la categoría <strong>${cat.nombre}</strong>?</p>
          <p class="cat-warning-text"><i class="fas fa-exclamation-triangle"></i> No se puede eliminar si tiene productos asociados.</p>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" id="btnCancelarDel">Cancelar</button>
          <button class="btn-danger cat-btn-pad" id="btnConfirmarDel"><i class="fas fa-trash"></i> Eliminar</button>
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
