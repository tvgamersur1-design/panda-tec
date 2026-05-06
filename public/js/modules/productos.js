/**
 * productos.js — Módulo de gestión de productos
 * CRUD completo con imagen, filtros y badges de stock.
 */

import { api } from '../api.js';

let _categorias = [];
let _productos = [];
let _filtroSearch = '';
let _filtroCategoria = '';

export async function init(container, user) {
  const puedeEditar = user && (user.rol === 'admin' || user.rol === 'almacen');

  container.innerHTML = `
    <style>
      .prod-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:1.25rem; flex-wrap:wrap; gap:0.75rem; }
      .prod-filters { display:flex; gap:0.75rem; flex-wrap:wrap; }
      .prod-filters input, .prod-filters select { padding:0.5rem 0.75rem; border:1px solid #E2E8F0; border-radius:8px; font-size:0.875rem; background:#fff; color:#1E293B; outline:none; }
      .prod-filters input:focus, .prod-filters select:focus { border-color:#2563EB; }
      .btn-primary { display:inline-flex; align-items:center; gap:0.5rem; padding:0.5rem 1rem; background:#2563EB; color:#fff; border:none; border-radius:8px; font-size:0.875rem; font-weight:600; cursor:pointer; transition:background 0.15s; }
      .btn-primary:hover { background:#1D4ED8; }
      .btn-secondary { display:inline-flex; align-items:center; gap:0.5rem; padding:0.5rem 1rem; background:#F1F5F9; color:#1E293B; border:1px solid #E2E8F0; border-radius:8px; font-size:0.875rem; font-weight:500; cursor:pointer; }
      .btn-danger { display:inline-flex; align-items:center; gap:0.5rem; padding:0.4rem 0.75rem; background:#FEE2E2; color:#DC2626; border:none; border-radius:6px; font-size:0.8125rem; font-weight:500; cursor:pointer; }
      .btn-edit { display:inline-flex; align-items:center; gap:0.5rem; padding:0.4rem 0.75rem; background:#EFF6FF; color:#2563EB; border:none; border-radius:6px; font-size:0.8125rem; font-weight:500; cursor:pointer; }
      .prod-table-wrap { background:#fff; border-radius:12px; border:1px solid #E2E8F0; overflow:auto; }
      table { width:100%; border-collapse:collapse; font-size:0.875rem; }
      th { padding:0.75rem 1rem; text-align:left; font-size:0.75rem; font-weight:600; text-transform:uppercase; letter-spacing:0.04em; color:#64748B; border-bottom:1px solid #E2E8F0; white-space:nowrap; }
      td { padding:0.75rem 1rem; border-bottom:1px solid #F1F5F9; vertical-align:middle; }
      tr:last-child td { border-bottom:none; }
      tr:hover td { background:#F8FAFC; }
      .prod-img { width:44px; height:44px; object-fit:cover; border-radius:8px; background:#F1F5F9; }
      .prod-img-placeholder { width:44px; height:44px; border-radius:8px; background:#F1F5F9; display:flex; align-items:center; justify-content:center; color:#94A3B8; font-size:1.25rem; }
      .badge { display:inline-flex; align-items:center; gap:0.25rem; padding:0.2rem 0.6rem; border-radius:999px; font-size:0.75rem; font-weight:600; }
      .badge-ok      { background:#DCFCE7; color:#16A34A; }
      .badge-warning { background:#FEF3C7; color:#D97706; }
      .badge-danger  { background:#FEE2E2; color:#DC2626; }
      .empty-state { text-align:center; padding:3rem; color:#64748B; }
      .empty-state i { font-size:2.5rem; margin-bottom:1rem; display:block; opacity:0.35; }
      /* Modal */
      .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.45); z-index:1000; display:flex; align-items:center; justify-content:center; padding:1rem; }
      .modal { background:#fff; border-radius:14px; width:100%; max-width:540px; max-height:90vh; overflow-y:auto; box-shadow:0 20px 60px rgba(0,0,0,0.2); animation:slideUp 0.2s ease; }
      @keyframes slideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
      .modal-header { display:flex; align-items:center; justify-content:space-between; padding:1.25rem 1.5rem; border-bottom:1px solid #E2E8F0; }
      .modal-header h2 { font-size:1.125rem; font-weight:700; }
      .modal-body { padding:1.5rem; display:flex; flex-direction:column; gap:1rem; }
      .modal-footer { display:flex; justify-content:flex-end; gap:0.75rem; padding:1rem 1.5rem; border-top:1px solid #E2E8F0; }
      .form-group { display:flex; flex-direction:column; gap:0.375rem; }
      .form-group label { font-size:0.8125rem; font-weight:600; color:#374151; }
      .form-group input, .form-group select, .form-group textarea { padding:0.5rem 0.75rem; border:1px solid #E2E8F0; border-radius:8px; font-size:0.875rem; color:#1E293B; outline:none; font-family:inherit; }
      .form-group input:focus, .form-group select:focus, .form-group textarea:focus { border-color:#2563EB; }
      .form-row { display:grid; grid-template-columns:1fr 1fr; gap:1rem; }
      .btn-close { background:none; border:none; font-size:1.25rem; cursor:pointer; color:#64748B; padding:0.25rem; }
    </style>

    <div class="prod-header">
      <div class="prod-filters">
        <input type="text" id="searchInput" placeholder="🔍 Buscar producto..." style="min-width:200px;" />
        <select id="catFilter"><option value="">Todas las categorías</option></select>
      </div>
      ${puedeEditar ? `<button class="btn-primary" id="btnNuevo"><i class="fas fa-plus"></i> Nuevo Producto</button>` : ''}
    </div>
    <div class="prod-table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Foto</th>
            <th>Nombre</th>
            <th>Categoría</th>
            <th>Precio venta</th>
            <th>Stock</th>
            ${puedeEditar ? '<th>Acciones</th>' : ''}
          </tr>
        </thead>
        <tbody id="prodTbody"></tbody>
      </table>
    </div>
    <div id="modalContainer"></div>
  `;

  // Cargar categorías
  const catRes = await api.get('/categorias');
  _categorias = catRes.ok ? (catRes.data.categorias || catRes.data || []) : [];
  const catFilter = container.querySelector('#catFilter');
  _categorias.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c._id;
    opt.textContent = c.nombre;
    catFilter.appendChild(opt);
  });

  // Cargar productos
  await cargarProductos(container, puedeEditar);

  // Eventos filtros
  let searchTimer;
  container.querySelector('#searchInput').addEventListener('input', e => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      _filtroSearch = e.target.value.trim();
      renderTabla(container, puedeEditar);
    }, 300);
  });

  catFilter.addEventListener('change', e => {
    _filtroCategoria = e.target.value;
    renderTabla(container, puedeEditar);
  });

  if (puedeEditar) {
    container.querySelector('#btnNuevo').addEventListener('click', () => abrirModal(container, null, user));
  }
}

async function cargarProductos(container, puedeEditar) {
  const res = await api.get('/productos');
  _productos = res.ok ? (res.data.productos || res.data || []) : [];
  renderTabla(container, puedeEditar);
}

function renderTabla(container, puedeEditar) {
  const tbody = container.querySelector('#prodTbody');
  let lista = _productos;

  if (_filtroSearch) {
    const q = _filtroSearch.toLowerCase();
    lista = lista.filter(p => p.nombre.toLowerCase().includes(q) || (p.descripcion || '').toLowerCase().includes(q));
  }
  if (_filtroCategoria) {
    lista = lista.filter(p => {
      const catId = p.categoria_id?._id || p.categoria_id;
      return catId === _filtroCategoria;
    });
  }

  if (lista.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${puedeEditar ? 6 : 5}"><div class="empty-state"><i class="fas fa-mobile-screen"></i><p>No hay productos que mostrar</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = lista.map(p => {
    const catNombre = p.categoria_id?.nombre || _categorias.find(c => c._id === p.categoria_id)?.nombre || '—';
    const stockBadge = p.stock_actual === 0
      ? `<span class="badge badge-danger"><i class="fas fa-times-circle"></i> Agotado (${p.stock_actual})</span>`
      : p.stock_actual <= (p.stock_minimo || 0)
        ? `<span class="badge badge-warning"><i class="fas fa-exclamation-triangle"></i> Bajo (${p.stock_actual})</span>`
        : `<span class="badge badge-ok"><i class="fas fa-check-circle"></i> ${p.stock_actual}</span>`;

    const imgHtml = p.imagen
      ? `<img src="${p.imagen}" alt="${p.nombre}" class="prod-img" loading="lazy" />`
      : `<div class="prod-img-placeholder"><i class="fas fa-mobile-alt"></i></div>`;

    return `
      <tr>
        <td data-label="Foto">${imgHtml}</td>
        <td data-label="Nombre"><div style="font-weight:500;">${p.nombre}</div><div style="font-size:0.75rem;color:#64748B;">${p.descripcion ? p.descripcion.substring(0,50) + (p.descripcion.length > 50 ? '…' : '') : ''}</div></td>
        <td data-label="Categoría">${catNombre}</td>
        <td data-label="Precio" style="font-weight:600;">S/ ${Number(p.precio_venta).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</td>
        <td data-label="Stock">${stockBadge}</td>
        ${puedeEditar ? `
          <td data-label="Acciones">
            <div style="display:flex;gap:0.5rem;">
              <button class="btn-edit" data-id="${p._id}" data-action="editar"><i class="fas fa-pen"></i> Editar</button>
              <button class="btn-danger" data-id="${p._id}" data-action="eliminar"><i class="fas fa-trash"></i></button>
            </div>
          </td>
        ` : ''}
      </tr>
    `;
  }).join('');

  if (puedeEditar) {
    tbody.querySelectorAll('[data-action="editar"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const prod = _productos.find(p => p._id === btn.dataset.id);
        if (prod) abrirModal(container, prod);
      });
    });
    tbody.querySelectorAll('[data-action="eliminar"]').forEach(btn => {
      btn.addEventListener('click', () => confirmarEliminar(container, btn.dataset.id));
    });
  }
}

function abrirModal(container, producto = null) {
  const esEdicion = Boolean(producto);
  const modalContainer = container.querySelector('#modalContainer');

  modalContainer.innerHTML = `
    <div class="modal-overlay" id="prodModal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
      <div class="modal">
        <div class="modal-header">
          <h2 id="modalTitle">${esEdicion ? 'Editar Producto' : 'Nuevo Producto'}</h2>
          <button class="btn-close" id="btnCerrarModal" aria-label="Cerrar"><i class="fas fa-times"></i></button>
        </div>
        <form id="prodForm">
          <div class="modal-body">
            <div class="form-group">
              <label for="fNombre">Nombre *</label>
              <input id="fNombre" name="nombre" type="text" required value="${producto?.nombre || ''}" />
            </div>
            <div class="form-group">
              <label for="fDesc">Descripción</label>
              <textarea id="fDesc" name="descripcion" rows="2">${producto?.descripcion || ''}</textarea>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="fPrecioVenta">Precio venta (S/) *</label>
                <input id="fPrecioVenta" name="precio_venta" type="number" min="0" step="0.01" required value="${producto?.precio_venta ?? ''}" />
              </div>
              <div class="form-group">
                <label for="fPrecioCompra">Precio compra (S/) *</label>
                <input id="fPrecioCompra" name="precio_compra" type="number" min="0" step="0.01" required value="${producto?.precio_compra ?? ''}" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="fStock">Stock actual *</label>
                <input id="fStock" name="stock_actual" type="number" min="0" required value="${producto?.stock_actual ?? ''}" />
              </div>
              <div class="form-group">
                <label for="fStockMin">Stock mínimo</label>
                <input id="fStockMin" name="stock_minimo" type="number" min="0" value="${producto?.stock_minimo ?? 0}" />
              </div>
            </div>
            <div class="form-group">
              <label for="fCategoria">Categoría *</label>
              <select id="fCategoria" name="categoria_id" required>
                <option value="">Seleccionar categoría</option>
                ${_categorias.map(c => `<option value="${c._id}" ${(producto?.categoria_id?._id || producto?.categoria_id) === c._id ? 'selected' : ''}>${c.nombre}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Imagen del producto</label>
              <div style="display:flex;gap:0.5rem;margin-bottom:0.5rem;">
                <button type="button" id="btnDesdeArchivo" style="flex:1;padding:0.5rem;border:1px solid #E2E8F0;border-radius:8px;background:#F8FAFC;cursor:pointer;font-size:0.8125rem;font-weight:600;color:#374151;display:flex;align-items:center;justify-content:center;gap:0.4rem;">
                  <i class="fas fa-folder-open"></i> Cargar archivo
                </button>
                <button type="button" id="btnDesdeCamara" style="flex:1;padding:0.5rem;border:1px solid #E2E8F0;border-radius:8px;background:#F8FAFC;cursor:pointer;font-size:0.8125rem;font-weight:600;color:#374151;display:flex;align-items:center;justify-content:center;gap:0.4rem;">
                  <i class="fas fa-camera"></i> Usar cámara
                </button>
              </div>
              <input id="fImagen" name="imagen" type="file" accept="image/jpeg,image/png,image/webp" style="display:none;" />
              <div id="camaraContainer" style="display:none;flex-direction:column;align-items:center;gap:0.5rem;">
                <video id="camaraVideo" autoplay playsinline style="width:100%;max-height:220px;border-radius:8px;background:#000;"></video>
                <div style="display:flex;gap:0.5rem;">
                  <button type="button" id="btnCapturar" style="padding:0.4rem 1rem;background:#2563EB;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:0.8125rem;font-weight:600;"><i class="fas fa-circle"></i> Capturar</button>
                  <button type="button" id="btnCerrarCamara" style="padding:0.4rem 1rem;background:#F1F5F9;color:#374151;border:none;border-radius:8px;cursor:pointer;font-size:0.8125rem;">Cancelar</button>
                </div>
                <canvas id="camaraCanvas" style="display:none;"></canvas>
              </div>
              <div id="imagenPreview" style="margin-top:0.5rem;">
                ${producto?.imagen ? `<img src="${producto.imagen}" alt="Imagen actual" style="width:80px;height:80px;object-fit:cover;border-radius:8px;" />` : ''}
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn-secondary" id="btnCancelarModal">Cancelar</button>
            <button type="submit" class="btn-primary" id="btnGuardar">
              <i class="fas fa-save"></i> ${esEdicion ? 'Guardar cambios' : 'Crear producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  let streamActivo = null;

  const cerrar = () => {
    if (streamActivo) streamActivo.getTracks().forEach(t => t.stop());
    modalContainer.innerHTML = '';
  };
  modalContainer.querySelector('#btnCerrarModal').addEventListener('click', cerrar);
  modalContainer.querySelector('#btnCancelarModal').addEventListener('click', cerrar);
  modalContainer.querySelector('#prodModal').addEventListener('click', e => { if (e.target.id === 'prodModal') cerrar(); });
  document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { cerrar(); document.removeEventListener('keydown', esc); } });

  // Lógica de imagen: archivo o cámara
  const btnArchivo = modalContainer.querySelector('#btnDesdeArchivo');
  const btnCamara = modalContainer.querySelector('#btnDesdeCamara');
  const inputFile = modalContainer.querySelector('#fImagen');
  const camaraContainer = modalContainer.querySelector('#camaraContainer');
  const video = modalContainer.querySelector('#camaraVideo');
  const canvas = modalContainer.querySelector('#camaraCanvas');
  const preview = modalContainer.querySelector('#imagenPreview');

  btnArchivo.addEventListener('click', () => inputFile.click());

  inputFile.addEventListener('change', () => {
    const file = inputFile.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    preview.innerHTML = `<img src="${url}" style="width:80px;height:80px;object-fit:cover;border-radius:8px;" />`;
  });

  btnCamara.addEventListener('click', async () => {
    try {
      streamActivo = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      video.srcObject = streamActivo;
      camaraContainer.style.display = 'flex';
      btnCamara.style.background = '#DBEAFE';
      btnCamara.style.color = '#2563EB';
    } catch {
      window.showToast('No se pudo acceder a la cámara', 'error');
    }
  });

  modalContainer.querySelector('#btnCerrarCamara').addEventListener('click', () => {
    if (streamActivo) { streamActivo.getTracks().forEach(t => t.stop()); streamActivo = null; }
    camaraContainer.style.display = 'none';
    btnCamara.style.background = '';
    btnCamara.style.color = '';
  });

  modalContainer.querySelector('#btnCapturar').addEventListener('click', () => {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob(blob => {
      const file = new File([blob], 'captura.jpg', { type: 'image/jpeg' });
      // Reemplazar el input file con el archivo capturado
      const dt = new DataTransfer();
      dt.items.add(file);
      inputFile.files = dt.files;
      const url = URL.createObjectURL(blob);
      preview.innerHTML = `<img src="${url}" style="width:80px;height:80px;object-fit:cover;border-radius:8px;" />`;
      if (streamActivo) { streamActivo.getTracks().forEach(t => t.stop()); streamActivo = null; }
      camaraContainer.style.display = 'none';
      btnCamara.style.background = '';
      btnCamara.style.color = '';
    }, 'image/jpeg', 0.9);
  });

  modalContainer.querySelector('#prodForm').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = modalContainer.querySelector('#btnGuardar');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando…';

    const form = e.target;
    const fd = new FormData(form);

    let res;
    if (esEdicion) {
      res = await api.putForm(`/productos/${producto._id}`, fd);
    } else {
      res = await api.postForm('/productos', fd);
    }

    if (res.ok) {
      window.showToast(esEdicion ? 'Producto actualizado correctamente' : 'Producto creado correctamente', 'success');
      cerrar();
      if (esEdicion) {
        const idx = _productos.findIndex(p => p._id === producto._id);
        if (idx !== -1) _productos[idx] = res.data;
      } else {
        _productos.push(res.data);
      }
      renderTabla(container, true);
    } else {
      window.showToast(res.data?.error || 'Error al guardar el producto', 'error');
      btn.disabled = false;
      btn.innerHTML = `<i class="fas fa-save"></i> ${esEdicion ? 'Guardar cambios' : 'Crear producto'}`;
    }
  });
}

async function confirmarEliminar(container, id) {
  const prod = _productos.find(p => p._id === id);
  if (!prod) return;

  const modalContainer = container.querySelector('#modalContainer');
  modalContainer.innerHTML = `
    <div class="modal-overlay" id="delModal" role="dialog" aria-modal="true">
      <div class="modal" style="max-width:400px;">
        <div class="modal-header">
          <h2>Eliminar producto</h2>
          <button class="btn-close" id="btnCerrarDel"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
          <p>¿Estás seguro de que deseas eliminar <strong>${prod.nombre}</strong>? Esta acción no se puede deshacer.</p>
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
    const res = await api.delete(`/productos/${id}`);
    if (res.ok) {
      window.showToast('Producto eliminado', 'success');
      cerrar();
      _productos = _productos.filter(p => p._id !== id);
      renderTabla(container, true);
    } else {
      window.showToast(res.data?.error || 'Error al eliminar', 'error');
    }
  });
}
