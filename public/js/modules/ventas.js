/**
 * ventas.js — Módulo POS (Punto de Venta)
 * Layout dos columnas: productos + carrito.
 */

import { api } from '../api.js';
import { generarTicketSVG, mostrarModalTicket } from './ticket.js';

let _carrito = [];
let _categorias = [];
let _descuentoActivo = false;
let _descuentoTipo = 'porcentaje';
let _descuentoValor = 0;
let _metodoPago = 'efectivo';
let _clienteSeleccionado = null;
let _searchTimer = null;
let _clienteTimer = null;
let _historialVentas = [];
let _configTienda = {};
let _histPagina = 1;
let _histTotalPaginas = 1;
let _histTotal = 0;

export async function init(container, user) {
  const puedeAnular = user && user.rol === 'admin';

  // Cargar config de tienda para el ticket
  const cfgRes = await api.get('/configuracion/publica');
  if (cfgRes.ok) _configTienda = cfgRes.data || {};

  container.innerHTML = `


    <div class="ven-flex-row">
      <button class="tab-btn active" id="tabPOS" data-tab="pos">Punto de Venta</button>
      <button class="tab-btn" id="tabHistorial" data-tab="historial">Historial de Ventas</button>
    </div>

    <div id="viewPOS">
      <div class="pos-layout">
        <div class="pos-left">
          <div class="pos-card">
            <div class="pos-card-header"><i class="fas fa-search ven-search-icon"></i> Buscar Producto</div>
            <div class="pos-card-body">
              <div class="ven-flex-gap-sm">
                <div class="ven-search-wrap">
                  <i class="fas fa-search ven-search-icon-abs"></i>
                  <input class="search-input ven-search-input-pl" id="prodSearch" type="text" placeholder="Buscar por nombre o código de barras..." autocomplete="one-time-code" />
                </div>
                <div class="ven-cat-wrap" id="catSelectWrapper">
                  <div id="catSelectDisplay" class="ven-cat-display">
                    <i class="fas fa-tag ven-cat-icon"></i>
                    <span id="catSelectedText" class="ven-cat-text">Todas</span>
                    <i class="fas fa-chevron-down ven-cat-arrow" id="catArrow"></i>
                  </div>
                  <div id="catDropdown" class="ven-cat-dropdown">
                    <div class="ven-cat-search-wrap">
                      <input type="text" id="catSearch" class="ven-cat-search" placeholder="Buscar categoría…" autocomplete="one-time-code" /></div>
                    <div id="catOptions" class="ven-cat-options"></div>
                  </div>
                </div>
              </div>
              <div class="prod-results" id="prodResults">
                <p class="ven-empty-msg">Escribe para buscar productos</p>
              </div>
            </div>
          </div>
          <div class="pos-card">
            <div class="pos-card-header"><i class="fas fa-user ven-icon-muted"></i> Cliente (opcional)</div>
            <div class="pos-card-body">
              <div class="ven-cliente-search-wrap">
                <i class="fas fa-search ven-cliente-icon"></i>
                <input class="search-input ven-cliente-input" id="clienteSearch" type="text" placeholder="Buscar por DNI o nombre..." autocomplete="one-time-code" />
              </div>
              <div id="clienteResults"></div>
              <div id="clienteSeleccionado"></div>
            </div>
          </div>
        </div>
        <div class="pos-right">
          <!-- Panda viajero en la línea del carrito -->
          <div class="panda-viajero">
            <img src="/img/panda-para-top.svg" alt="Panda viajero" />
          </div>
          
          <div class="pos-card ven-card-flex">
            <div class="pos-card-header"><i class="fas fa-shopping-cart ven-search-icon"></i> Carrito</div>
            <div class="pos-card-body ven-card-body-col">
              <div class="carrito-items" id="carritoItems">
                <div class="empty-cart"><i class="fas fa-shopping-cart"></i><p>El carrito está vacío</p></div>
              </div>
              <div class="resumen ven-resumen-hidden" id="resumenCarrito">
                <div class="resumen-row"><span>Subtotal</span><span id="rSubtotal">S/ 0.00</span></div>
                <div>
                  <label class="toggle-desc">
                    <input type="checkbox" id="chkDescuento" /> Aplicar descuento
                  </label>
                  <div id="descuentoPanel" class="descuento-row">
                    <select id="descTipo">
                      <option value="porcentaje">%</option>
                      <option value="monto_fijo">S/</option>
                    </select>
                    <input type="number" id="descValor" min="0" step="0.01" placeholder="0" value="0" />
                  </div>
                </div>
                <div class="resumen-row"><span>Descuento</span><span id="rDescuento" class="ven-desc-text">- S/ 0.00</span></div>
                <div class="resumen-row resumen-total"><span>TOTAL</span><span id="rTotal">S/ 0.00</span></div>
              </div>
              <div id="metodoPagoSection" class="ven-metodo-section">
                <div class="ven-metodo-label">Método de pago</div>
                <div class="metodos-pago">
                  ${['efectivo','tarjeta','yape','plin','transferencia'].map(m => `<button class="metodo-btn${m==='efectivo'?' active':''}" data-metodo="${m}">${m.charAt(0).toUpperCase()+m.slice(1)}</button>`).join('')}
                </div>
                <div id="efectivoPanel" class="ven-efectivo-panel">
                  <label class="ven-efectivo-label">Monto recibido (S/)</label>
                  <input class="search-input ven-efectivo-input" id="montoRecibido" type="number" min="0" step="0.01" placeholder="0.00" />
                  <div class="ven-vuelto-row">
                    <span>Vuelto:</span><span id="vueltoDisplay" class="ven-vuelto-value">S/ 0.00</span>
                  </div>
                </div>
              </div>
              <button class="btn-cobrar" id="btnCobrar" disabled><i class="fas fa-cash-register"></i> Procesar Venta</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div id="viewHistorial" class="ven-hist-hidden">
      <div class="ven-hist-filters">
        <input type="date" id="histDesde" class="ven-hist-input" />
        <input type="date" id="histHasta" class="ven-hist-input" />
        <select id="histEstado" class="ven-hist-select">
          <option value="">Todos los estados</option>
          <option value="completada">Completada</option>
          <option value="anulada">Anulada</option>
        </select>
        <select id="histMetodo" class="ven-hist-select">
          <option value="">Todos los métodos</option>
          ${['efectivo','tarjeta','yape','plin','transferencia'].map(m=>`<option value="${m}">${m.charAt(0).toUpperCase()+m.slice(1)}</option>`).join('')}
        </select>
        <button class="btn-primary" id="btnFiltrarHist"><i class="fas fa-filter"></i> Filtrar</button>
      </div>
      <div class="pos-card">
        <div class="hist-table-wrap">
          <table class="data-table">
            <thead><tr><th>N° Venta</th><th>Cliente</th><th>Total</th><th>Método</th><th>Estado</th><th>Fecha</th>${puedeAnular?'<th>Vendedor</th><th>Acciones</th>':''}</tr></thead>
            <tbody id="histTbody"><tr><td colspan="${puedeAnular?8:6}" class="ven-td-loading">Cargando historial…</td></tr></tbody>
          </table>
        </div>
        <div id="histPaginacion" class="ven-hist-pag"></div>
      </div>
    </div>

    <div id="modalContainer"></div>
  `;

  // Tabs
  container.querySelector('#tabPOS').addEventListener('click', () => {
    container.querySelector('#viewPOS').classList.remove('ven-hist-hidden');
    container.querySelector('#viewHistorial').classList.add('ven-hist-hidden');
    container.querySelector('#tabPOS').classList.add('active');
    container.querySelector('#tabHistorial').classList.remove('active');
  });
  container.querySelector('#tabHistorial').addEventListener('click', () => {
    container.querySelector('#viewPOS').classList.add('ven-hist-hidden');
    container.querySelector('#viewHistorial').classList.remove('ven-hist-hidden');
    container.querySelector('#tabPOS').classList.remove('active');
    container.querySelector('#tabHistorial').classList.add('active');
    cargarHistorial(container, puedeAnular);
  });

  // Cargar categorías para filtro con buscador
  const catRes = await api.get('/categorias');
  _categorias = catRes.ok ? (catRes.data.categorias || catRes.data || []) : [];

  let catActiva = '';
  const wrapper = container.querySelector('#catSelectWrapper');
  const display = container.querySelector('#catSelectDisplay');
  const selectedText = container.querySelector('#catSelectedText');
  const dropdown = container.querySelector('#catDropdown');
  const catSearch = container.querySelector('#catSearch');
  const catOptions = container.querySelector('#catOptions');
  const arrow = container.querySelector('#catArrow');

  function renderCatOptions(filter = '') {
    const items = _categorias.filter(c => !filter || c.nombre.toLowerCase().includes(filter.toLowerCase()));
    catOptions.innerHTML =
      `<div class="cat-opt${!catActiva ? ' cat-opt-active' : ''}" data-cat="">Todas</div>` +
      items.map(c => `<div class="cat-opt${catActiva === c._id ? ' cat-opt-active' : ''}" data-cat="${c._id}">${c.nombre}</div>`).join('');

    catOptions.querySelectorAll('.cat-opt').forEach(el => {
      el.addEventListener('click', () => {
        const catId = el.dataset.cat;
        catActiva = catId;
        const cat = _categorias.find(c => c._id === catId);
        selectedText.textContent = cat ? cat.nombre : 'Todas';
        selectedText.style.color = cat ? '#1E293B' : '#64748B';
        dropdown.style.display = 'none';
        arrow.style.transform = 'rotate(0deg)';
        catSearch.value = '';
        buscarProductos(container, container.querySelector('#prodSearch').value, catActiva);
      });
    });
  }

  renderCatOptions();

  display.addEventListener('click', e => {
    e.stopPropagation();
    const isOpen = dropdown.style.display === 'block';
    dropdown.style.display = isOpen ? 'none' : 'block';
    arrow.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
    if (!isOpen) { catSearch.value = ''; renderCatOptions(); catSearch.focus(); }
  });

  catSearch.addEventListener('input', () => renderCatOptions(catSearch.value));

  document.addEventListener('click', e => {
    if (!wrapper.contains(e.target)) {
      dropdown.style.display = 'none';
      arrow.style.transform = 'rotate(0deg)';
    }
  });

  // Mostrar 5 productos aleatorios al cargar el POS
  buscarProductos(container, '', '');

  // Búsqueda de productos con debounce optimizado a 250ms para POS
  const searchInput = container.querySelector('#prodSearch');
  searchInput.addEventListener('input', e => {
    clearTimeout(_searchTimer);
    const valor = e.target.value;
    
    // Mostrar indicador de búsqueda inmediatamente
    if (valor.trim() || catActiva) {
      const resultsEl = container.querySelector('#prodResults');
      resultsEl.innerHTML = `<p class="ven-loading-msg"><i class="fas fa-spinner fa-spin"></i> Buscando…</p>`;
    }
    
    _searchTimer = setTimeout(() => buscarProductos(container, valor, catActiva), 250);
  });

  // Búsqueda al presionar Enter (instantánea) - útil para lectores de código de barras
  searchInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      clearTimeout(_searchTimer);
      const valor = e.target.value.trim();
      
      // Si es un código numérico largo (posible código de barras), buscar y agregar automáticamente
      if (/^\d{8,}$/.test(valor)) {
        buscarYAgregarPorCodigo(container, valor, catActiva);
      } else {
        buscarProductos(container, valor, catActiva);
      }
    }
  });

  // Búsqueda de cliente con debounce
  container.querySelector('#clienteSearch').addEventListener('input', e => {
    clearTimeout(_clienteTimer);
    const q = e.target.value.trim();
    if (q.length < 2) { container.querySelector('#clienteResults').innerHTML = ''; return; }
    _clienteTimer = setTimeout(() => buscarCliente(container, q), 400);
  });

  // Descuento
  container.querySelector('#chkDescuento').addEventListener('change', e => {
    _descuentoActivo = e.target.checked;
    container.querySelector('#descuentoPanel').style.display = _descuentoActivo ? 'flex' : 'none';
    if (!_descuentoActivo) { _descuentoValor = 0; container.querySelector('#descValor').value = 0; }
    recalcular(container);
  });
  container.querySelector('#descTipo').addEventListener('change', () => {
    _descuentoTipo = container.querySelector('#descTipo').value;
    const input = container.querySelector('#descValor');
    if (_descuentoTipo === 'porcentaje') {
      input.max = 100;
      if (parseFloat(input.value) > 100) { input.value = 100; _descuentoValor = 100; }
    } else {
      const subtotal = _carrito.reduce((s, i) => s + i.precio_venta * i.cantidad, 0);
      input.max = subtotal;
      if (parseFloat(input.value) > subtotal) { input.value = subtotal.toFixed(2); _descuentoValor = subtotal; }
    }
    recalcular(container);
  });
  container.querySelector('#descValor').addEventListener('input', e => {
    const subtotal = _carrito.reduce((s, i) => s + i.precio_venta * i.cantidad, 0);
    let val = parseFloat(e.target.value) || 0;
    if (_descuentoTipo === 'porcentaje') {
      if (val > 100) { val = 100; e.target.value = 100; }
    } else {
      if (val > subtotal) { val = subtotal; e.target.value = subtotal.toFixed(2); }
    }
    _descuentoValor = val;
    recalcular(container);
  });

  // Métodos de pago
  container.querySelectorAll('.metodo-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.metodo-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _metodoPago = btn.dataset.metodo;
      container.querySelector('#efectivoPanel').style.display = _metodoPago === 'efectivo' ? '' : 'none';
    });
  });

  // Vuelto en tiempo real
  container.querySelector('#montoRecibido').addEventListener('input', () => calcularVuelto(container));

  // Botón cobrar
  container.querySelector('#btnCobrar').addEventListener('click', () => mostrarConfirmacion(container, user));

  // Historial filtros
  container.querySelector('#btnFiltrarHist').addEventListener('click', () => cargarHistorial(container, puedeAnular, 1));
}

async function buscarProductos(container, q, catId) {
  const resultsEl = container.querySelector('#prodResults');
  const searchTerm = q?.trim() || '';
  const isDefaultView = !searchTerm && !catId;

  resultsEl.innerHTML = `<p class="ven-loading-msg"><i class="fas fa-spinner fa-spin"></i> ${isDefaultView ? 'Cargando sugerencias…' : 'Buscando…'}</p>`;

  let url = `/productos?limit=30&estado=activo`;
  if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
  if (catId) url += `&categoria=${catId}`;

  const res = await api.get(url);
  let prods = res.ok ? (res.data.productos || res.data || []) : [];

  if (isDefaultView && prods.length > 0) {
    prods = prods.sort(() => Math.random() - 0.5).slice(0, 5);
  }

  if (prods.length === 0) {
    resultsEl.innerHTML = `
      <div style="text-align:center;padding:1.5rem;color:#64748B;">
        <i class="fas fa-search ven-empty-icon"></i>
        <p class="ven-empty-text">${isDefaultView ? 'No hay productos disponibles' : 'No se encontraron productos'}</p>
        ${searchTerm ? `<p class="ven-empty-hint">Intenta con otro término de búsqueda</p>` : ''}
      </div>
    `;
    return;
  }

  resultsEl.innerHTML = prods.map(p => {
    const sinStock = p.stock_actual === 0;
    const stockBajo = p.stock_actual > 0 && p.stock_actual <= (p.stock_minimo || 5);

    const imgHtml = p.imagen
          ? `<img src="${p.imagen}" alt="${p.nombre}" class="prod-thumb ven-img-zoom" loading="lazy" data-src="${p.imagen}" data-nombre="${p.nombre}" />`
      : `<div class="prod-thumb-placeholder"><i class="fas fa-mobile-alt"></i></div>`;

    return `
      <div class="prod-result-item${sinStock ? ' sin-stock' : ''}" data-id="${p._id}">
        ${imgHtml}
        <div class="ven-prod-item">
          <div class="ven-prod-name">${p.nombre}</div>
          <div class="ven-prod-meta">
            <span class="ven-prod-price">S/ ${Number(p.precio_venta).toLocaleString('es-PE',{minimumFractionDigits:2})}</span>
            <span class="ven-prod-stock" style="color:${sinStock ? '#DC2626' : stockBajo ? '#D97706' : '#16A34A'};">
              <i class="fas fa-box ven-stock-icon"></i> ${p.stock_actual}
            </span>
          </div>
        </div>
        <button class="btn-agregar" data-id="${p._id}" ${sinStock ? 'disabled title="Sin stock"' : ''}>
          ${sinStock ? '<i class="fas fa-times"></i> Agotado' : '<i class="fas fa-plus"></i> Agregar'}
        </button>
      </div>
    `;
  }).join('');

  resultsEl.querySelectorAll('.prod-thumb').forEach(img => {
    img.addEventListener('click', e => {
      e.stopPropagation();
      abrirLightbox(img.dataset.src, img.dataset.nombre);
    });
  });

  resultsEl.querySelectorAll('.btn-agregar:not([disabled])').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const prod = prods.find(p => p._id === btn.dataset.id);
      if (prod) agregarAlCarrito(container, prod);
    });
  });

  resultsEl.querySelectorAll('.prod-result-item:not(.sin-stock)').forEach(item => {
    item.style.cursor = 'pointer';
    item.addEventListener('click', e => {
      if (e.target.tagName !== 'BUTTON') {
        const prod = prods.find(p => p._id === item.dataset.id);
        if (prod) agregarAlCarrito(container, prod);
      }
    });
  });
}

// Función para búsqueda rápida por código (útil para código de barras)
async function buscarYAgregarPorCodigo(container, codigo, catId) {
  const searchInput = container.querySelector('#prodSearch');
  const resultsEl = container.querySelector('#prodResults');
  
  resultsEl.innerHTML = `<p class="ven-loading-msg"><i class="fas fa-barcode"></i> Buscando código…</p>`;
  
  let url = `/productos?limit=5&estado=activo&search=${encodeURIComponent(codigo)}`;
  if (catId) url += `&categoria=${catId}`;
  
  const res = await api.get(url);
  const prods = res.ok ? (res.data.productos || res.data || []) : [];
  
  if (prods.length === 1) {
    // Si hay exactamente 1 resultado, agregarlo automáticamente
    agregarAlCarrito(container, prods[0]);
    searchInput.value = '';
    searchInput.focus();
    resultsEl.innerHTML = `
      <div class="ven-code-result">
        <i class="fas fa-check-circle ven-code-icon"></i>
        <p class="ven-code-name">${prods[0].nombre}</p>
        <p class="ven-code-hint">Agregado al carrito</p>
      </div>
    `;
    setTimeout(() => {
      if (resultsEl.innerHTML.includes('Agregado al carrito')) {
        resultsEl.innerHTML = `<p class="ven-empty-msg">Escribe para buscar productos</p>`;
      }
    }, 2000);
  } else {
    // Si hay 0 o múltiples resultados, mostrar búsqueda normal
    buscarProductos(container, codigo, catId);
  }
}

function agregarAlCarrito(container, prod) {
  const existente = _carrito.find(i => i._id === prod._id);
  if (existente) {
    if (existente.cantidad >= prod.stock_actual) {
      window.showToast(`Stock insuficiente para ${prod.nombre}`, 'warning');
      return;
    }
    existente.cantidad++;
  } else {
    _carrito.push({ ...prod, cantidad: 1 });
  }
  renderCarrito(container);
}

function renderCarrito(container) {
  const carritoEl = container.querySelector('#carritoItems');
  const resumenEl = container.querySelector('#resumenCarrito');
  const metodoPagoEl = container.querySelector('#metodoPagoSection');
  const btnCobrar = container.querySelector('#btnCobrar');

  if (_carrito.length === 0) {
    carritoEl.innerHTML = `<div class="empty-cart"><i class="fas fa-shopping-cart"></i><p>El carrito está vacío</p></div>`;
    resumenEl.classList.add('ven-resumen-hidden');
    metodoPagoEl.classList.add('ven-metodo-section');
    btnCobrar.disabled = true;
    return;
  }

  carritoEl.innerHTML = _carrito.map((item, idx) => {
    const cartImgHtml = item.imagen
      ? `<img src="${item.imagen}" alt="${item.nombre}" class="carrito-item-img" data-src="${item.imagen}" data-nombre="${item.nombre}" loading="lazy" />`
      : `<div class="carrito-item-img-placeholder"><i class="fas fa-mobile-alt"></i></div>`;
    return `
    <div class="carrito-item">
      ${cartImgHtml}
      <div class="carrito-item-info">
        <div class="carrito-item-name">${item.nombre}</div>
        <div class="carrito-item-price">S/ ${Number(item.precio_venta).toLocaleString('es-PE',{minimumFractionDigits:2})} c/u</div>
      </div>
      <div class="qty-ctrl">
        <button class="qty-btn" data-idx="${idx}" data-action="dec">−</button>
        <span class="qty-val">${item.cantidad}</span>
        <button class="qty-btn" data-idx="${idx}" data-action="inc">+</button>
      </div>
      <div class="ven-cart-subtotal">
        S/ ${(item.precio_venta * item.cantidad).toLocaleString('es-PE',{minimumFractionDigits:2})}
      </div>
      <button class="btn-rm" data-idx="${idx}" data-action="rm" aria-label="Eliminar"><i class="fas fa-times"></i></button>
    </div>`;
  }).join('');

  carritoEl.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      if (btn.dataset.action === 'inc') {
        if (_carrito[idx].cantidad < _carrito[idx].stock_actual) _carrito[idx].cantidad++;
        else window.showToast('Stock máximo alcanzado', 'warning');
      } else if (btn.dataset.action === 'dec') {
        if (_carrito[idx].cantidad > 1) _carrito[idx].cantidad--;
        else _carrito.splice(idx, 1);
      } else if (btn.dataset.action === 'rm') {
        _carrito.splice(idx, 1);
      }
      renderCarrito(container);
    });
  });

  carritoEl.querySelectorAll('.carrito-item-img').forEach(img => {
    img.addEventListener('click', e => {
      e.stopPropagation();
      abrirLightbox(img.dataset.src, img.dataset.nombre);
    });
  });

  resumenEl.classList.remove('ven-resumen-hidden');
  metodoPagoEl.classList.remove('ven-metodo-section');
  btnCobrar.disabled = false;
  recalcular(container);
}

function recalcular(container) {
  const subtotal = _carrito.reduce((s, i) => s + i.precio_venta * i.cantidad, 0);
  let descuento = 0;
  if (_descuentoActivo && _descuentoValor > 0) {
    if (_descuentoTipo === 'porcentaje') {
      descuento = Math.round(subtotal * (_descuentoValor / 100) * 100) / 100;
    } else {
      descuento = Math.min(_descuentoValor, subtotal);
    }
  }
  const total = subtotal - descuento;
  container.querySelector('#rSubtotal').textContent = `S/ ${subtotal.toLocaleString('es-PE',{minimumFractionDigits:2})}`;
  container.querySelector('#rDescuento').textContent = `- S/ ${descuento.toLocaleString('es-PE',{minimumFractionDigits:2})}`;
  container.querySelector('#rTotal').textContent = `S/ ${total.toLocaleString('es-PE',{minimumFractionDigits:2})}`;
  calcularVuelto(container);

  // Sincronizar max del input de descuento
  const descInput = container.querySelector('#descValor');
  if (_descuentoTipo === 'porcentaje') {
    descInput.max = 100;
    if (_descuentoValor > 100) { descInput.value = 100; _descuentoValor = 100; }
  } else {
    descInput.max = subtotal;
    if (_descuentoValor > subtotal) { descInput.value = subtotal.toFixed(2); _descuentoValor = subtotal; }
  }
}

function calcularVuelto(container) {
  if (_metodoPago !== 'efectivo') return;
  const totalText = container.querySelector('#rTotal').textContent.replace('S/ ','').replace(/,/g,'');
  const total = parseFloat(totalText) || 0;
  const recibido = parseFloat(container.querySelector('#montoRecibido').value) || 0;
  const vuelto = Math.max(0, recibido - total);
  container.querySelector('#vueltoDisplay').textContent = `S/ ${vuelto.toLocaleString('es-PE',{minimumFractionDigits:2})}`;
}

async function buscarCliente(container, q) {
  const resultsEl   = container.querySelector('#clienteResults');
  const searchInput = container.querySelector('#clienteSearch');
  const selEl       = container.querySelector('#clienteSeleccionado');

  // Si son exactamente 8 dígitos, buscar primero en BD local
  const esDNI = /^\d{8}$/.test(q);

  const res = await api.get(`/clientes?search=${encodeURIComponent(q)}`);
  const clientes = res.ok ? (res.data.clientes || res.data || []) : [];

  if (clientes.length > 0) {
    // Encontrado en BD — mostrar lista normal
    resultsEl.innerHTML = clientes.slice(0, 5).map(c => `
      <div class="cliente-result" data-id="${c._id}">
        <i class="fas fa-user ven-cli-selected-icon"></i>
        ${c.nombre || ''} ${c.apellido_paterno || ''} — <strong>DNI: ${c.dni}</strong>
      </div>
    `).join('');

    resultsEl.querySelectorAll('.cliente-result').forEach(el => {
      el.addEventListener('mouseenter', () => el.style.background = '#F8FAFC');
      el.addEventListener('mouseleave', () => el.style.background = '');
      el.addEventListener('click', () => {
        _clienteSeleccionado = clientes.find(c => c._id === el.dataset.id);
        resultsEl.innerHTML = '';
        searchInput.value = '';
        mostrarClienteSeleccionado(selEl, _clienteSeleccionado);
      });
    });
    return;
  }

  // No encontrado en BD
  if (esDNI) {
    // Mostrar botón para consultar RENIEC
    resultsEl.innerHTML = `
      <div class="ven-cli-reniec-box">
        <div class="ven-cli-reniec-msg"><i class="fas fa-exclamation-circle"></i>DNI <strong>${q}</strong> no está registrado.</div>
        <button id="btnBuscarReniec" class="ven-cli-reniec-btn">
          <i class="fas fa-search"></i> Buscar en RENIEC
        </button>
      </div>
    `;
    resultsEl.querySelector('#btnBuscarReniec').addEventListener('click', () => consultarReniecEnVenta(container, q));
  } else {
    resultsEl.innerHTML = `<p class="ven-cli-sinres">Sin resultados</p>`;
  }
}

async function consultarReniecEnVenta(container, dni) {
  const resultsEl = container.querySelector('#clienteResults');
  const selEl     = container.querySelector('#clienteSeleccionado');

  resultsEl.innerHTML = `
    <div class="ven-cli-loading">
      <i class="fas fa-spinner fa-spin ven-cli-loading-icon"></i> Consultando RENIEC…
    </div>
  `;

  const res = await api.get(`/clientes/dni/${dni}`);

  if (!res.ok || res.data.encontrado === false) {
    resultsEl.innerHTML = `
      <div class="ven-cli-error-box">
        <i class="fas fa-times-circle ven-cli-error-icon"></i> No se encontró información en RENIEC para el DNI <strong>${dni}</strong>.
      </div>
    `;
    return;
  }

  const d = res.data;
  const nombreCompleto = [d.nombre, d.apellido_paterno, d.apellido_materno].filter(Boolean).join(' ');

  // Mostrar card de confirmación con los datos obtenidos
  resultsEl.innerHTML = `
    <div class="ven-cli-found-box">
      <div class="ven-cli-found-header"><i class="fas fa-check-circle ven-cli-found-check"></i>Encontrado en RENIEC</div>
      <div class="ven-cli-found-row"><span class="ven-cli-found-label">Nombre:</span> <strong>${nombreCompleto}</strong></div>
      <div style="color:#1E293B;margin-bottom:0.75rem;"><span class="ven-cli-found-label">DNI:</span> <strong>${dni}</strong></div>
      <div class="ven-cli-found-actions">
        <button id="btnUsarReniec" class="ven-cli-found-use">
          <i class="fas fa-user-plus"></i> Usar este cliente
        </button>
        <button id="btnCancelarReniec" class="ven-cli-found-cancel">
          Cancelar
        </button>
      </div>
    </div>
  `;

  resultsEl.querySelector('#btnUsarReniec').addEventListener('click', () => {
    // Guardar en memoria como cliente temporal (sin _id, con flag nuevo)
    _clienteSeleccionado = {
      _id: null,
      esNuevo: true,
      dni,
      nombre: d.nombre || '',
      apellido_paterno: d.apellido_paterno || '',
      apellido_materno: d.apellido_materno || '',
    };
    resultsEl.innerHTML = '';
    container.querySelector('#clienteSearch').value = '';
    mostrarClienteSeleccionado(container.querySelector('#clienteSeleccionado'), _clienteSeleccionado);
  });

  resultsEl.querySelector('#btnCancelarReniec').addEventListener('click', () => {
    resultsEl.innerHTML = '';
    container.querySelector('#clienteSearch').value = '';
  });
}

function mostrarClienteSeleccionado(selEl, cliente) {
  const esNuevo = cliente.esNuevo;
  selEl.innerHTML = `
    <div class="ven-cli-selected-box" style="background:${esNuevo ? '#F0FDF4' : '#EFF6FF'};border-color:${esNuevo ? '#BBF7D0' : '#BFDBFE'};">
      <span class="ven-cli-selected-info">
        <i class="fas fa-user${esNuevo ? '-plus' : ''} ven-cli-selected-icon" style="color:${esNuevo ? '#16A34A' : '#2563EB'};"></i>
        <strong>${cliente.nombre || ''} ${cliente.apellido_paterno || ''}</strong>
        <span class="ven-cli-selected-dni"> — ${cliente.dni}</span>
        ${esNuevo ? '<span class="ven-cli-selected-badge">Nuevo</span>' : ''}
      </span>
      <button id="btnQuitarCliente" class="ven-cli-selected-rm" aria-label="Quitar cliente"><i class="fas fa-times"></i></button>
    </div>
  `;
  selEl.querySelector('#btnQuitarCliente').addEventListener('click', () => {
    _clienteSeleccionado = null;
    selEl.innerHTML = '';
  });
}

function mostrarConfirmacion(container, user) {
  const subtotal = _carrito.reduce((s, i) => s + i.precio_venta * i.cantidad, 0);
  let descuento = 0;
  if (_descuentoActivo && _descuentoValor > 0) {
    descuento = _descuentoTipo === 'porcentaje'
      ? Math.round(subtotal * (_descuentoValor / 100) * 100) / 100
      : Math.min(_descuentoValor, subtotal);
  }
  const total = subtotal - descuento;
  const montoRecibido = parseFloat(container.querySelector('#montoRecibido').value) || 0;

  if (_metodoPago === 'efectivo' && montoRecibido < total) {
    window.showToast('El monto recibido es menor al total', 'warning');
    return;
  }

  const modalContainer = container.querySelector('#modalContainer');
  modalContainer.innerHTML = `
    <div class="modal-overlay" id="confirmModal" role="dialog" aria-modal="true">
      <div class="modal ven-confirm-modal">
        <div class="modal-header">
          <h2 class="ven-confirm-title"><i class="fas fa-cash-register ven-confirm-icon"></i>Confirmar Venta</h2>
          <button class="btn-close" id="btnCerrarConf"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
          <div class="ven-confirm-body">
            <div class="ven-confirm-row"><span>Productos:</span><span>${_carrito.length} ítem(s)</span></div>
            <div class="ven-confirm-row"><span>Subtotal:</span><span>S/ ${subtotal.toLocaleString('es-PE',{minimumFractionDigits:2})}</span></div>
            ${descuento > 0 ? `<div class="ven-confirm-row ven-confirm-desc"><span>Descuento:</span><span>- S/ ${descuento.toLocaleString('es-PE',{minimumFractionDigits:2})}</span></div>` : ''}
            <div class="ven-confirm-total"><span>TOTAL:</span><span>S/ ${total.toLocaleString('es-PE',{minimumFractionDigits:2})}</span></div>
            <div class="ven-confirm-row"><span>Método de pago:</span><span class="ven-confirm-method">${_metodoPago}</span></div>
            ${_metodoPago === 'efectivo' ? `<div class="ven-confirm-row"><span>Vuelto:</span><span class="ven-confirm-vuelto">S/ ${Math.max(0, montoRecibido - total).toLocaleString('es-PE',{minimumFractionDigits:2})}</span></div>` : ''}
            ${_clienteSeleccionado ? `<div class="ven-confirm-row"><span>Cliente:</span><span>${_clienteSeleccionado.nombre || ''} ${_clienteSeleccionado.apellido_paterno || ''} ${_clienteSeleccionado.esNuevo ? '<em class="ven-confirm-cliente-new">(nuevo)</em>' : ''}</span></div>` : ''}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" id="btnCancelarConf">Cancelar</button>
          <button class="btn-primary ven-btn-cobrar-green" id="btnProcesar"><i class="fas fa-check"></i> Confirmar y Cobrar</button>
        </div>
      </div>
    </div>
  `;

  const cerrar = () => { modalContainer.innerHTML = ''; };
  modalContainer.querySelector('#btnCerrarConf').addEventListener('click', cerrar);
  modalContainer.querySelector('#btnCancelarConf').addEventListener('click', cerrar);
  modalContainer.querySelector('#btnProcesar').addEventListener('click', async () => {
    const btn = modalContainer.querySelector('#btnProcesar');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando…';

    const payload = {
      items: _carrito.map(i => ({ producto_id: i._id, cantidad: i.cantidad, precio_unitario: i.precio_venta })),
      metodo_pago: _metodoPago,
      subtotal,
      descuento_tipo: _descuentoActivo && _descuentoValor > 0 ? _descuentoTipo : null,
      descuento_valor: _descuentoActivo ? _descuentoValor : 0,
      descuento_total: descuento,
      total,
      monto_recibido: _metodoPago === 'efectivo' ? montoRecibido : undefined,
      vuelto: _metodoPago === 'efectivo' ? Math.max(0, montoRecibido - total) : undefined,
      cliente_id: _clienteSeleccionado?._id || null,
      cliente_nuevo: _clienteSeleccionado?.esNuevo ? {
        dni: _clienteSeleccionado.dni,
        nombre: _clienteSeleccionado.nombre,
        apellido_paterno: _clienteSeleccionado.apellido_paterno,
        apellido_materno: _clienteSeleccionado.apellido_materno,
      } : null,
    };

    const res = await api.post('/ventas', payload);
    if (res.ok) {
      api.invalidatePrefix('/productos');
      api.invalidatePrefix('/dashboard');
      api.invalidatePrefix('/ventas');

      const ventaData = res.data.venta || res.data;
      // Enriquecer con detalles e info del cliente para el ticket
      ventaData.detalles = res.data.detalles || [];
      ventaData.cliente_id = _clienteSeleccionado;
      ventaData.vendedor   = user?.nombre_completo || user?.usuario || '';

      // Generar SVG del ticket
      const svgTicket = generarTicketSVG(ventaData, _configTienda);

      // Mostrar modal del ticket automáticamente
      cerrar();
      mostrarModalTicket(svgTicket, ventaData.numero_venta);

      window.showToast(
        `Venta ${ventaData.numero_venta || ''} registrada — <a href="#" id="toastVerTicket" class="ven-toast-link">Ver ticket</a>`,
        'success', 6000
      );

      // Listener del link en el toast
      setTimeout(() => {
        document.getElementById('toastVerTicket')?.addEventListener('click', e => {
          e.preventDefault();
          mostrarModalTicket(svgTicket, ventaData.numero_venta);
        });
      }, 100);

      _carrito = [];
      _descuentoActivo = false;
      _descuentoValor = 0;
      _clienteSeleccionado = null;
      renderCarrito(container);
      container.querySelector('#chkDescuento').checked = false;
      container.querySelector('#descuentoPanel').style.display = 'none';
      container.querySelector('#montoRecibido').value = '';
    } else {
      window.showToast(res.data?.error || 'Error al procesar la venta', 'error');
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-check"></i> Confirmar y Cobrar';
    }
  });
}

async function cargarHistorial(container, puedeAnular, pagina = 1) {
  const tbody = container.querySelector('#histTbody');
  tbody.innerHTML = `<tr><td colspan="${puedeAnular?8:6}" class="ven-td-loading"><i class="fas fa-spinner fa-spin"></i> Cargando…</td></tr>`;

  let url = '/ventas?';
  const desde = container.querySelector('#histDesde').value;
  const hasta = container.querySelector('#histHasta').value;
  const estado = container.querySelector('#histEstado').value;
  const metodo = container.querySelector('#histMetodo').value;
  if (desde) url += `desde=${desde}&`;
  if (hasta) url += `hasta=${hasta}&`;
  if (estado) url += `estado=${estado}&`;
  if (metodo) url += `metodo_pago=${metodo}&`;
  url += `page=${pagina}&limit=15`;

  const res = await api.get(url);
  if (res.ok && res.data.ventas) {
    _historialVentas = res.data.ventas;
    _histPagina = res.data.page || 1;
    _histTotalPaginas = res.data.totalPages || 1;
    _histTotal = res.data.total || 0;
  } else {
    _historialVentas = [];
    _histPagina = 1;
    _histTotalPaginas = 1;
    _histTotal = 0;
  }

  renderHistorial(container, puedeAnular);
}

function renderHistorial(container, puedeAnular) {
  const tbody = container.querySelector('#histTbody');

  if (_historialVentas.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${puedeAnular?8:6}" class="ven-td-loading">Sin ventas en el período seleccionado</td></tr>`;
    return;
  }

  tbody.innerHTML = _historialVentas.map(v => `
    <tr>
      <td data-label="N° Venta" class="ven-hist-num">${v.numero_venta || '—'}</td>
      <td data-label="Cliente">${v.cliente_id?.nombre ? `${v.cliente_id.nombre} ${v.cliente_id.apellido_paterno||''}`.trim() : 'Público general'}</td>
      <td data-label="Total" class="ven-hist-total">S/ ${Number(v.total).toLocaleString('es-PE',{minimumFractionDigits:2})}</td>
      <td data-label="Método" class="ven-hist-metodo">${v.metodo_pago}</td>
      <td data-label="Estado"><span class="badge ${v.estado==='completada'?'badge-ok':'badge-danger'}">${v.estado}</span></td>
      <td data-label="Fecha">${new Date(v.fecha_venta).toLocaleDateString('es-PE')}</td>
      ${puedeAnular ? `<td data-label="Vendedor" class="ven-hist-vendedor">${v.vendedor_id?.nombre_completo || v.vendedor_id?.usuario || '—'}</td>
      <td data-label="Acciones">
        <div class="ven-hist-actions">
          <button class="btn-ver-detalle ven-hist-btn ven-hist-btn-detail" data-id="${v._id}"><i class="fas fa-eye"></i> Detalles</button>
          <button class="btn-ticket ven-hist-btn ven-hist-btn-ticket" data-id="${v._id}"><i class="fas fa-receipt"></i> Ticket</button>
          ${v.estado==='completada'?`<button class="btn-danger ven-hist-btn-anular" data-id="${v._id}" data-action="anular"><i class="fas fa-ban"></i> Anular</button>`:''}
        </div>
      </td>` : `<td><div class="ven-hist-actions"><button class="btn-ver-detalle ven-hist-btn ven-hist-btn-detail" data-id="${v._id}"><i class="fas fa-eye"></i> Detalles</button><button class="btn-ticket ven-hist-btn ven-hist-btn-ticket" data-id="${v._id}"><i class="fas fa-receipt"></i> Ticket</button></div></td>`}
    </tr>
  `).join('');

  // Botones ver detalle
  tbody.querySelectorAll('.btn-ver-detalle').forEach(btn => {
    btn.addEventListener('click', async () => {
      const venta = _historialVentas.find(v => v._id === btn.dataset.id);
      if (!venta) return;
      // Obtener detalles completos de la venta
      const detRes = await api.get(`/ventas/${venta._id}`);
      const ventaCompleta = detRes.ok ? (detRes.data.venta || detRes.data) : venta;
      ventaCompleta.detalles = detRes.ok ? (detRes.data.detalles || []) : [];
      mostrarModalDetalleVenta(container, ventaCompleta);
    });
  });

  // Botones ticket del historial
  tbody.querySelectorAll('.btn-ticket').forEach(btn => {
    btn.addEventListener('click', async () => {
      const venta = _historialVentas.find(v => v._id === btn.dataset.id);
      if (!venta) return;
      // Obtener detalles completos de la venta
      const detRes = await api.get(`/ventas/${venta._id}`);
      const ventaCompleta = detRes.ok ? (detRes.data.venta || detRes.data) : venta;
      ventaCompleta.detalles = detRes.ok ? (detRes.data.detalles || []) : [];
      const svgTicket = generarTicketSVG(ventaCompleta, _configTienda);
      mostrarModalTicket(svgTicket, ventaCompleta.numero_venta);
    });
  });

  if (puedeAnular) {
    tbody.querySelectorAll('[data-action="anular"]').forEach(btn => {
      btn.addEventListener('click', () => confirmarAnulacion(container, btn.dataset.id, puedeAnular));
    });
  }

  // Paginación del historial
  const pagDiv = container.querySelector('#histPaginacion');
  if (pagDiv) {
    if (_histTotalPaginas <= 1) {
      pagDiv.innerHTML = `<span>${_histTotal} venta(s)</span><span></span>`;
    } else {
      const desde = (_histPagina - 1) * 15 + 1;
      const hasta = Math.min(_histPagina * 15, _histTotal);
      let botones = '';
      botones += `<button class="btn-sm ven-hist-pag-btn" data-page="${_histPagina - 1}" ${_histPagina <= 1 ? 'disabled' : ''}>← Ant</button>`;
      for (let i = 1; i <= _histTotalPaginas; i++) {
        if (i === 1 || i === _histTotalPaginas || Math.abs(i - _histPagina) <= 1) {
          botones += `<button class="btn-sm ven-hist-pag-num" data-page="${i}" style="border-color:${i === _histPagina ? '#2563EB' : '#E2E8F0'};background:${i === _histPagina ? '#2563EB' : '#fff'};color:${i === _histPagina ? '#fff' : '#374151'};font-weight:${i === _histPagina ? '600' : '400'};">${i}</button>`;
        } else if (Math.abs(i - _histPagina) === 2) {
          botones += `<span class="ven-hist-pag-ellipsis">…</span>`;
        }
      }
      botones += `<button class="btn-sm ven-hist-pag-btn" data-page="${_histPagina + 1}" ${_histPagina >= _histTotalPaginas ? 'disabled' : ''}>Sig →</button>`;
      pagDiv.innerHTML = `<span>Mostrando ${desde}-${hasta} de ${_histTotal}</span><div class="ven-hist-pag-wrap">${botones}</div>`;
      pagDiv.querySelectorAll('[data-page]').forEach(btn => {
        btn.addEventListener('click', () => {
          const p = parseInt(btn.dataset.page);
          if (p >= 1 && p <= _histTotalPaginas) cargarHistorial(container, puedeAnular, p);
        });
      });
    }
  }
}

function mostrarModalDetalleVenta(container, venta) {
  const modalContainer = container.querySelector('#modalContainer');
  
  // Calcular totales
  const subtotal = venta.subtotal || 0;
  const descuento = venta.descuento_total || 0;
  const total = venta.total || 0;
  
  // Formatear fecha
  const fechaVenta = new Date(venta.fecha_venta);
  const fechaFormateada = fechaVenta.toLocaleDateString('es-PE', { 
    year: 'numeric', month: 'long', day: 'numeric' 
  });
  const horaFormateada = fechaVenta.toLocaleTimeString('es-PE', { 
    hour: '2-digit', minute: '2-digit' 
  });
  
  // Cliente
  const cliente = venta.cliente_id;
  const nombreCliente = cliente 
    ? `${cliente.nombre} ${cliente.apellido_paterno || ''} ${cliente.apellido_materno || ''}`.trim()
    : 'Público general';
  
  // Vendedor
  const vendedor = venta.vendedor_id?.nombre_completo || venta.vendedor_id?.usuario || 'No especificado';
  
  // Detalles de productos
  const detalles = venta.detalles || [];
  
  modalContainer.innerHTML = `
    <div class="modal-overlay" id="detalleVentaModal" role="dialog" aria-modal="true">
      <div class="modal ven-det-modal">
        <div class="modal-header">
          <div>
            <h2 class="ven-det-header">
              <i class="fas fa-file-invoice ven-det-icon"></i>
              Detalle de Venta
            </h2>
            <p class="ven-det-subtitle">
              ${venta.numero_venta || 'Sin número'}
            </p>
          </div>
          <button class="btn-close" id="btnCerrarDetalle"><i class="fas fa-times"></i></button>
        </div>
        
        <div class="modal-body ven-det-body-scroll">
          
          <!-- Información General -->
          <div class="ven-det-summary">
            <div class="ven-det-grid">
              <div>
                <div class="ven-det-label">
                  <i class="fas fa-calendar"></i> Fecha
                </div>
                <div class="ven-det-value">${fechaFormateada}</div>
                <div class="ven-det-time">${horaFormateada}</div>
              </div>
              
              <div>
                <div class="ven-det-label">
                  <i class="fas fa-user-tie"></i> Vendedor
                </div>
                <div class="ven-det-vendedor">${vendedor}</div>
              </div>
              
              <div>
                <div class="ven-det-label">
                  <i class="fas fa-info-circle"></i> Estado
                </div>
                <span class="badge ${venta.estado==='completada'?'badge-ok':'badge-danger'} ven-det-badge-lg">
                  ${venta.estado === 'completada' ? 'Completada' : 'Anulada'}
                </span>
              </div>
            </div>
          </div>
          
          <!-- Cliente -->
          <div class="ven-det-section">
            <h3 class="ven-det-section-title">
              <i class="fas fa-user ven-det-section-icon"></i> Cliente
            </h3>
            <div class="ven-det-cliente-card">
              <div class="ven-det-cliente-name">${nombreCliente}</div>
              ${cliente ? `
                <div class="ven-det-cliente-detail">
                  ${cliente.dni ? `<div><i class="fas fa-id-card ven-det-cliente-icon"></i> ${cliente.dni}</div>` : ''}
                  ${cliente.telefono ? `<div><i class="fas fa-phone ven-det-cliente-icon"></i> ${cliente.telefono}</div>` : ''}
                  ${cliente.email ? `<div><i class="fas fa-envelope ven-det-cliente-icon"></i> ${cliente.email}</div>` : ''}
                </div>
              ` : '<div class="ven-det-cliente-empty">Sin información adicional</div>'}
            </div>
          </div>
          
          <!-- Productos -->
          <div class="ven-det-section">
            <h3 class="ven-det-section-title">
              <i class="fas fa-box ven-det-section-icon"></i> Productos (${detalles.length})
            </h3>
            <div class="ven-det-table">
              ${detalles.length > 0 ? detalles.map((det, idx) => `
                <div class="ven-det-row" style="${idx < detalles.length - 1 ? 'border-bottom:1px solid #F1F5F9;' : ''}background:${idx % 2 === 0 ? '#fff' : '#F8FAFC'};">
                  ${det.producto_id?.imagen ? `
                    <img src="${det.producto_id.imagen}" alt="${det.producto_id.nombre}" 
                         class="ven-det-prod-img" />
                  ` : `
                    <div class="ven-det-prod-placeholder">
                      <i class="fas fa-mobile-alt ven-det-prod-placeholder-icon"></i>
                    </div>
                  `}
                  
                  <div class="ven-det-prod-info">
                    <div class="ven-det-prod-name">${det.producto_id?.nombre || 'Producto eliminado'}</div>
                    <div class="ven-det-prod-meta">
                      ${det.cantidad} × S/ ${Number(det.precio_unitario).toLocaleString('es-PE',{minimumFractionDigits:2})}
                    </div>
                  </div>
                  
                  <div class="ven-det-prod-total">
                    S/ ${Number(det.subtotal).toLocaleString('es-PE',{minimumFractionDigits:2})}
                  </div>
                </div>
              `).join('') : `
                <div class="ven-det-empty">
                  <i class="fas fa-box-open" style="font-size:2rem;display:block;margin-bottom:0.5rem;opacity:0.3;"></i>
                  Sin productos registrados
                </div>
              `}
            </div>
          </div>
          
          <!-- Resumen Financiero -->
          <div class="ven-det-summary">
            <h3 class="ven-det-section-title">
              <i class="fas fa-calculator ven-det-section-icon"></i> Resumen Financiero
            </h3>
            
            <div style="display:flex;flex-direction:column;gap:0.5rem;font-size:0.875rem;">
              <div style="display:flex;justify-content:space-between;">
                <span style="color:#64748B;">Subtotal</span>
                <span style="font-weight:500;">S/ ${subtotal.toLocaleString('es-PE',{minimumFractionDigits:2})}</span>
              </div>
              
              ${descuento > 0 ? `
                <div style="display:flex;justify-content:space-between;">
                  <span style="color:#64748B;">
                    Descuento 
                    ${venta.descuento_tipo === 'porcentaje' ? `(${venta.descuento_valor}%)` : ''}
                  </span>
                  <span style="font-weight:500;color:#DC2626;">- S/ ${descuento.toLocaleString('es-PE',{minimumFractionDigits:2})}</span>
                </div>
              ` : ''}
              
              <div style="height:1px;background:#E2E8F0;margin:0.25rem 0;"></div>
              
              <div style="display:flex;justify-content:space-between;font-size:1.125rem;font-weight:700;">
                <span>TOTAL</span>
                <span style="color:#16A34A;">S/ ${total.toLocaleString('es-PE',{minimumFractionDigits:2})}</span>
              </div>
              
              <div style="height:1px;background:#E2E8F0;margin:0.25rem 0;"></div>
              
              <div style="display:flex;justify-content:space-between;">
                <span style="color:#64748B;">Método de pago</span>
                <span style="font-weight:600;text-transform:capitalize;">${venta.metodo_pago}</span>
              </div>
              
              ${venta.metodo_pago === 'efectivo' && venta.monto_recibido ? `
                <div style="display:flex;justify-content:space-between;">
                  <span style="color:#64748B;">Monto recibido</span>
                  <span style="font-weight:500;">S/ ${Number(venta.monto_recibido).toLocaleString('es-PE',{minimumFractionDigits:2})}</span>
                </div>
                <div style="display:flex;justify-content:space-between;">
                  <span style="color:#64748B;">Vuelto</span>
                  <span style="font-weight:600;color:#16A34A;">S/ ${Number(venta.vuelto || 0).toLocaleString('es-PE',{minimumFractionDigits:2})}</span>
                </div>
              ` : ''}
            </div>
          </div>
          
          <!-- Información Adicional -->
          ${venta.notas || venta.estado === 'anulada' ? `
            <div style="margin-bottom:1rem;">
              <h3 style="font-size:0.875rem;font-weight:700;color:#0a0a0a;margin-bottom:0.75rem;display:flex;align-items:center;gap:0.5rem;">
                <i class="fas fa-info-circle" style="color:#2563EB;"></i> Información Adicional
              </h3>
              
              ${venta.notas ? `
                <div style="background:#FEF3C7;border:1px solid #FDE047;border-radius:8px;padding:0.875rem;margin-bottom:0.75rem;">
                  <div style="font-size:0.75rem;color:#92400E;font-weight:600;margin-bottom:0.375rem;">
                    <i class="fas fa-sticky-note"></i> NOTAS
                  </div>
                  <div style="font-size:0.875rem;color:#78350F;">${venta.notas}</div>
                </div>
              ` : ''}
              
              ${venta.estado === 'anulada' ? `
                <div style="background:#FEE2E2;border:1px solid #FECACA;border-radius:8px;padding:0.875rem;">
                  <div style="font-size:0.75rem;color:#991B1B;font-weight:600;margin-bottom:0.375rem;">
                    <i class="fas fa-ban"></i> VENTA ANULADA
                  </div>
                  ${venta.motivo_anulacion ? `
                    <div style="font-size:0.875rem;color:#7F1D1D;margin-bottom:0.375rem;">
                      <strong>Motivo:</strong> ${venta.motivo_anulacion}
                    </div>
                  ` : ''}
                  ${venta.fecha_anulacion ? `
                    <div style="font-size:0.75rem;color:#991B1B;">
                      <strong>Fecha:</strong> ${new Date(venta.fecha_anulacion).toLocaleString('es-PE')}
                    </div>
                  ` : ''}
                </div>
              ` : ''}
            </div>
          ` : ''}
          
        </div>
        
        <div class="modal-footer">
          <button class="btn-secondary" id="btnCerrarDetalle2">
            <i class="fas fa-times"></i> Cerrar
          </button>
          <button class="btn-primary" id="btnImprimirTicket">
            <i class="fas fa-receipt"></i> Ver Ticket
          </button>
        </div>
      </div>
    </div>
  `;
  
  const cerrar = () => { modalContainer.innerHTML = ''; };
  modalContainer.querySelector('#btnCerrarDetalle').addEventListener('click', cerrar);
  modalContainer.querySelector('#btnCerrarDetalle2').addEventListener('click', cerrar);
  modalContainer.querySelector('#detalleVentaModal').addEventListener('click', e => {
    if (e.target.id === 'detalleVentaModal') cerrar();
  });
  
  // Botón imprimir ticket
  modalContainer.querySelector('#btnImprimirTicket').addEventListener('click', () => {
    const svgTicket = generarTicketSVG(venta, _configTienda);
    mostrarModalTicket(svgTicket, venta.numero_venta);
    cerrar();
  });
}

function confirmarAnulacion(container, ventaId, puedeAnular) {
  const modalContainer = container.querySelector('#modalContainer');
  modalContainer.innerHTML = `
    <div class="modal-overlay" id="anulModal" role="dialog" aria-modal="true">
      <div class="modal ven-modal-pago">
        <div class="modal-header">
          <h2>Anular Venta</h2>
          <button class="btn-close" id="btnCerrarAnul"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
          <p style="margin-bottom:1rem;font-size:0.875rem;">Ingresa el motivo de anulación:</p>
          <textarea id="motivoAnulacion" rows="3" style="width:100%;padding:0.5rem 0.75rem;border:1px solid #E2E8F0;border-radius:8px;font-size:0.875rem;font-family:inherit;" placeholder="Motivo de anulación..."></textarea>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" id="btnCancelarAnul">Cancelar</button>
          <button class="btn-danger" id="btnConfirmarAnul" style="padding:0.5rem 1rem;"><i class="fas fa-ban"></i> Anular Venta</button>
        </div>
      </div>
    </div>
  `;
  const cerrar = () => { modalContainer.innerHTML = ''; };
  modalContainer.querySelector('#btnCerrarAnul').addEventListener('click', cerrar);
  modalContainer.querySelector('#btnCancelarAnul').addEventListener('click', cerrar);
  modalContainer.querySelector('#btnConfirmarAnul').addEventListener('click', async () => {
    const motivo = modalContainer.querySelector('#motivoAnulacion').value.trim();
    if (!motivo) { window.showToast('El motivo es obligatorio', 'warning'); return; }
    const res = await api.put(`/ventas/${ventaId}/anular`, { motivo });
    if (res.ok) {
      window.showToast('Venta anulada correctamente', 'success');
      cerrar();
      api.invalidatePrefix('/productos');
      api.invalidatePrefix('/dashboard');
      api.invalidatePrefix('/ventas');
      const idx = _historialVentas.findIndex(v => v._id === ventaId);
      if (idx !== -1) {
        _historialVentas[idx] = { ..._historialVentas[idx], estado: 'anulada' };
      }
      renderHistorial(container, puedeAnular);
    } else {
      window.showToast(res.data?.error || 'Error al anular la venta', 'error');
    }
  });
}

// Función para abrir lightbox de imagen (ampliar foto del producto)
function abrirLightbox(src, nombre) {
  // Reutilizar si ya existe
  let lb = document.getElementById('ventaLightbox');
  if (!lb) {
    lb = document.createElement('div');
    lb.id = 'ventaLightbox';
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
