/**
 * productos.js — Módulo de gestión de productos
 * CRUD completo con imagen, filtros y badges de stock.
 */

import { api } from '../api.js';

let _categorias = [];
let _productos = [];
let _filtroSearch = '';
let _filtroCategoria = '';
let _paginaActual = 1;
let _totalPaginas = 1;
let _totalProductos = 0;
const _LIMIT = 10;

export async function init(container, user) {
  const puedeEditar = user && (user.rol === 'admin' || user.rol === 'almacen');

  container.innerHTML = `
    <div class="prod-header">
      <div class="prod-filters">
        <div class="prod-search-wrap">
          <i class="fas fa-search prod-search-icon"></i>
          <input type="text" id="searchInput" placeholder="Buscar producto..." class="prod-search-input" autocomplete="one-time-code" />
        </div>
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
    <div id="prodPaginador" class="prod-paginador"></div>
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
      _paginaActual = 1;
      cargarProductos(container, puedeEditar);
    }, 300); // Reducido a 300ms para mayor velocidad de respuesta
  });

  catFilter.addEventListener('change', e => {
    _filtroCategoria = e.target.value;
    _paginaActual = 1;
    cargarProductos(container, puedeEditar);
  });

  if (puedeEditar) {
    container.querySelector('#btnNuevo').addEventListener('click', () => abrirModal(container, null, user));
  }
}

async function cargarProductos(container, puedeEditar) {
  const tbody = container.querySelector('#prodTbody');
  tbody.innerHTML = `<tr><td colspan="6" class="prod-spinner-inline"><i class="fas fa-spinner fa-spin"></i></td></tr>`;

  let url = `/productos?page=${_paginaActual}&limit=${_LIMIT}`;
  if (_filtroSearch)    url += `&search=${encodeURIComponent(_filtroSearch)}`;
  if (_filtroCategoria) url += `&categoria=${_filtroCategoria}`;

  const res = await api.get(url);
  if (res.ok) {
    _productos      = res.data.productos || [];
    _totalProductos = res.data.total     || 0;
    _totalPaginas   = res.data.totalPages || 1;
    _paginaActual   = res.data.page       || 1;
  } else {
    _productos = [];
  }

  renderTabla(container, puedeEditar);
  renderPaginador(container, puedeEditar);
}

function renderPaginador(container, puedeEditar) {
  const el = container.querySelector('#prodPaginador');
  if (!el) return;

  if (_totalPaginas <= 1) { el.innerHTML = ''; return; }

  const desde = (_paginaActual - 1) * _LIMIT + 1;
  const hasta  = Math.min(_paginaActual * _LIMIT, _totalProductos);

  // Generar botones de página (máx 5 visibles)
  const btnCls = (activo) => activo ? 'prod-pag-btn--active' : 'prod-pag-btn';

  let pagBtns = '';
  const rango = 2;
  for (let p = 1; p <= _totalPaginas; p++) {
    if (
      p === 1 || p === _totalPaginas ||
      (p >= _paginaActual - rango && p <= _paginaActual + rango)
    ) {
      pagBtns += `<button data-pag="${p}" class="${btnCls(p === _paginaActual)}" ${p === _paginaActual ? 'disabled' : ''}>${p}</button>`;
    } else if (
      p === _paginaActual - rango - 1 ||
      p === _paginaActual + rango + 1
    ) {
      pagBtns += `<span class="prod-pag-ellipsis">…</span>`;
    }
  }

  el.innerHTML = `
    <span class="prod-pag-info">
      Mostrando <strong>${desde}–${hasta}</strong> de <strong>${_totalProductos}</strong> productos
    </span>
    <div class="prod-pag-btns">
      <button data-pag="${_paginaActual - 1}" ${_paginaActual === 1 ? 'disabled' : ''} class="prod-pag-btn">
        <i class="fas fa-chevron-left"></i>
      </button>
      ${pagBtns}
      <button data-pag="${_paginaActual + 1}" ${_paginaActual === _totalPaginas ? 'disabled' : ''} class="prod-pag-btn">
        <i class="fas fa-chevron-right"></i>
      </button>
    </div>
  `;

  el.querySelectorAll('[data-pag]').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = parseInt(btn.dataset.pag);
      if (p >= 1 && p <= _totalPaginas && p !== _paginaActual) {
        _paginaActual = p;
        cargarProductos(container, puedeEditar);
        container.querySelector('.prod-table-wrap')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

function renderTabla(container, puedeEditar) {
  const tbody = container.querySelector('#prodTbody');
  const lista = _productos;

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
      ? `<img src="${p.imagen}" alt="${p.nombre}" class="prod-img prod-img-zoom" loading="lazy" data-src="${p.imagen}" data-nombre="${p.nombre}" />`
      : `<div class="prod-img-placeholder"><i class="fas fa-mobile-alt"></i></div>`;

    return `
      <tr>
        <td data-label="Foto">${imgHtml}</td>
        <td data-label="Nombre"><div class="prod-name">${p.nombre}</div><div class="prod-desc">${p.descripcion ? p.descripcion.substring(0,50) + (p.descripcion.length > 50 ? '…' : '') : ''}</div></td>
        <td data-label="Categoría">${catNombre}</td>
        <td data-label="Precio" class="prod-price">S/ ${Number(p.precio_venta).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</td>
        <td data-label="Stock">${stockBadge}</td>
        ${puedeEditar ? `
          <td data-label="Acciones">
            <div class="prod-actions">
              <button class="btn-edit" data-id="${p._id}" data-action="editar"><i class="fas fa-pen"></i> Editar</button>
              <button class="btn-danger" data-id="${p._id}" data-action="eliminar"><i class="fas fa-trash"></i></button>
            </div>
          </td>
        ` : ''}
      </tr>
    `;
  }).join('');

  // Lightbox al hacer clic en imagen
  tbody.querySelectorAll('.prod-img-zoom').forEach(img => {
    img.addEventListener('click', () => abrirLightbox(img.dataset.src, img.dataset.nombre));
  });

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

function abrirLightbox(src, nombre) {
  // Reutilizar si ya existe
  let lb = document.getElementById('prodLightbox');
  if (!lb) {
    lb = document.createElement('div');
    lb.id = 'prodLightbox';
    lb.style.cssText = `
      position:fixed;inset:0;z-index:9999;
      background:rgba(0,0,0,0.85);
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      padding:1.5rem;cursor:zoom-out;
      animation:lbFadeIn 0.2s ease;
    `;
    lb.innerHTML = `
      <style>
        @keyframes lbFadeIn { from{opacity:0;transform:scale(0.96)} to{opacity:1;transform:scale(1)} }
      </style>
      <button id="lbClose" style="position:absolute;top:1rem;right:1rem;background:rgba(255,255,255,0.1);border:none;color:#fff;width:40px;height:40px;border-radius:50%;font-size:1.25rem;cursor:pointer;display:flex;align-items:center;justify-content:center;">
        <i class="fas fa-times"></i>
      </button>
      <img id="lbImg" style="max-width:90vw;max-height:80vh;border-radius:10px;object-fit:contain;box-shadow:0 8px 40px rgba(0,0,0,0.5);" />
      <p id="lbNombre" style="color:rgba(255,255,255,0.75);margin-top:1rem;font-size:0.9rem;text-align:center;"></p>
    `;
    document.body.appendChild(lb);

    const cerrar = () => lb.remove();
    lb.addEventListener('click', e => { if (e.target === lb) cerrar(); });
    lb.querySelector('#lbClose').addEventListener('click', cerrar);
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { cerrar(); document.removeEventListener('keydown', esc); }
    });
  }
  lb.querySelector('#lbImg').src = src;
  lb.querySelector('#lbNombre').textContent = nombre;
}

function abrirModal(container, producto = null) {
  const esEdicion = Boolean(producto);
  const modalContainer = container.querySelector('#modalContainer');

  modalContainer.innerHTML = `
    <div class="modal-overlay" id="prodModal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
      <!-- Panda mascota al lado izquierdo del modal -->
      <div class="panda-mascota-container">
        <img src="/img/panda-lado-izquierdo.svg" alt="Panda mascota" class="panda-mascota-img" />
      </div>
      
      <div class="modal">
        <div class="modal-header">
          <h2 id="modalTitle">${esEdicion ? 'Editar Producto' : 'Nuevo Producto'}</h2>
          <button class="btn-close" id="btnCerrarModal" aria-label="Cerrar"><i class="fas fa-times"></i></button>
        </div>
        <form id="prodForm">
          <div class="modal-body">
            <div class="form-group">
              <label for="fNombre">Nombre *</label>
              <input id="fNombre" name="nombre" type="text" required value="${producto?.nombre || ''}" autocomplete="off" />
            </div>
            <div class="form-group">
              <label for="fDesc">Descripción</label>
              <textarea id="fDesc" name="descripcion" rows="2">${producto?.descripcion || ''}</textarea>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="fPrecioVenta">Precio venta *</label>
                <input id="fPrecioVenta" name="precio_venta" type="number" min="0" step="0.01" required value="${producto?.precio_venta ?? ''}" />
              </div>
              <div class="form-group">
                <label for="fPrecioCompra">Precio compra *</label>
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
              <div class="prod-actions">
                <button type="button" id="btnDesdeArchivo" class="prod-btn-file">
                  <i class="fas fa-folder-open"></i> Cargar archivo
                </button>
                <button type="button" id="btnDesdeCamara" class="prod-btn-camara">
                  <i class="fas fa-camera"></i> Usar cámara
                </button>
              </div>
              <input id="fImagen" name="imagen" type="file" accept="image/jpeg,image/png,image/webp" class="prod-input-hidden" />
              <div id="camaraContainer" class="prod-camara-container">
                <video id="camaraVideo" autoplay playsinline class="prod-camara-video"></video>
                <div class="prod-camara-actions">
                  <button type="button" id="btnCapturar" class="prod-camara-capture"><i class="fas fa-circle"></i> Capturar</button>
                  <button type="button" id="btnCerrarCamara" class="prod-camara-cancel">Cancelar</button>
                </div>
                <canvas id="camaraCanvas" class="prod-camara-canvas"></canvas>
              </div>
              <div id="imagenPreview" class="prod-img-preview">
                ${producto?.imagen ? `<img src="${producto.imagen}" alt="Imagen actual" />` : ''}
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
    preview.innerHTML = `<img src="${url}" />`;
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
      preview.innerHTML = `<img src="${url}" />`;
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
      const productoData = res.data.producto || res.data;
      if (esEdicion) {
        const idx = _productos.findIndex(p => p._id === producto._id);
        if (idx !== -1) _productos[idx] = productoData;
      } else {
        _productos.push(productoData);
        _totalProductos++;
      }
      renderTabla(container, true);
      api.invalidatePrefix('/productos');
      api.invalidatePrefix('/dashboard');
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
      <div class="modal prod-del-modal">
        <div class="modal-header">
          <h2>Eliminar producto</h2>
          <button class="btn-close" id="btnCerrarDel"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
          <p>¿Estás seguro de que deseas eliminar <strong>${prod.nombre}</strong>? Esta acción no se puede deshacer.</p>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" id="btnCancelarDel">Cancelar</button>
          <button class="btn-danger prod-del-btn" id="btnConfirmarDel"><i class="fas fa-trash"></i> Eliminar</button>
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
      _totalProductos--;
      renderTabla(container, true);
      api.invalidatePrefix('/productos');
      api.invalidatePrefix('/dashboard');
    } else {
      window.showToast(res.data?.error || 'Error al eliminar', 'error');
    }
  });
}

export async function refresh(container) {
  const puedeEditar = true;
  let url = `/productos?page=${_paginaActual}&limit=${_LIMIT}`;
  if (_filtroSearch) url += `&search=${encodeURIComponent(_filtroSearch)}`;
  if (_filtroCategoria) url += `&categoria=${_filtroCategoria}`;

  api.invalidate(url);
  const res = await api.get(url);
  if (res.ok) {
    const nuevos = res.data.productos || [];
    // Solo actualizar si hay cambios reales
    if (JSON.stringify(nuevos.map(p => p._id + p.stock_actual)) !== JSON.stringify(_productos.map(p => p._id + p.stock_actual))) {
      _productos = nuevos;
      _totalProductos = res.data.total || 0;
      _totalPaginas = res.data.totalPages || 1;
      renderTabla(container, puedeEditar);
      renderPaginador(container, puedeEditar);
    }
  }
}
