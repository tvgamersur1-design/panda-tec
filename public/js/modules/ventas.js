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

export async function init(container, user) {
  const puedeAnular = user && user.rol === 'admin';

  // Cargar config de tienda para el ticket
  const cfgRes = await api.get('/configuracion/publica');
  if (cfgRes.ok) _configTienda = cfgRes.data || {};

  container.innerHTML = `
    <style>
      .pos-layout { display:grid; grid-template-columns:1fr 380px; gap:1rem; min-height:calc(100vh - 120px); }
      @media(max-width:900px){ .pos-layout { grid-template-columns:1fr; } }
      .pos-left, .pos-right { display:flex; flex-direction:column; gap:1rem; }
      .pos-card { background:#fff; border-radius:12px; border:1px solid #E2E8F0; overflow:hidden; }
      .pos-card-header { padding:0.875rem 1.25rem; border-bottom:1px solid #E2E8F0; font-weight:600; font-size:0.9375rem; display:flex; align-items:center; gap:0.5rem; }
      .pos-card-body { padding:1rem; }
      .search-input { width:100%; padding:0.625rem 0.875rem; border:1px solid #E2E8F0; border-radius:8px; font-size:0.875rem; outline:none; }
      .search-input:focus { border-color:#2563EB; }
      .cat-filters { display:flex; gap:0.5rem; flex-wrap:wrap; margin-top:0.75rem; }
      .cat-btn { padding:0.3rem 0.75rem; border-radius:999px; border:1px solid #E2E8F0; background:#fff; font-size:0.8125rem; cursor:pointer; transition:all 0.15s; }
      .cat-btn.active { background:#2563EB; color:#fff; border-color:#2563EB; }
      .prod-results { display:flex; flex-direction:column; gap:0.5rem; margin-top:0.75rem; max-height:320px; overflow-y:auto; }
      .prod-result-item { display:flex; align-items:center; justify-content:space-between; padding:0.625rem 0.875rem; border:1px solid #E2E8F0; border-radius:8px; cursor:pointer; transition:background 0.15s; }
      .prod-result-item:hover { background:#F8FAFC; }
      .prod-result-item.sin-stock { opacity:0.5; cursor:not-allowed; }
      .btn-agregar { padding:0.35rem 0.75rem; background:#2563EB; color:#fff; border:none; border-radius:6px; font-size:0.8125rem; font-weight:600; cursor:pointer; }
      .btn-agregar:disabled { background:#94A3B8; cursor:not-allowed; }
      .carrito-items { display:flex; flex-direction:column; gap:0.5rem; max-height:280px; overflow-y:auto; }
      .carrito-item { display:flex; align-items:center; gap:0.75rem; padding:0.625rem; border:1px solid #F1F5F9; border-radius:8px; }
      .carrito-item-info { flex:1; min-width:0; }
      .carrito-item-name { font-size:0.875rem; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .carrito-item-price { font-size:0.75rem; color:#64748B; }
      .qty-ctrl { display:flex; align-items:center; gap:0.375rem; }
      .qty-btn { width:26px; height:26px; border:1px solid #E2E8F0; background:#fff; border-radius:6px; cursor:pointer; font-size:0.875rem; display:flex; align-items:center; justify-content:center; }
      .qty-val { min-width:28px; text-align:center; font-size:0.875rem; font-weight:600; }
      .btn-rm { background:none; border:none; color:#DC2626; cursor:pointer; font-size:0.875rem; padding:0.25rem; }
      .resumen { border-top:1px solid #E2E8F0; padding-top:0.875rem; display:flex; flex-direction:column; gap:0.375rem; }
      .resumen-row { display:flex; justify-content:space-between; font-size:0.875rem; }
      .resumen-total { font-size:1.125rem; font-weight:700; }
      .metodos-pago { display:grid; grid-template-columns:repeat(3,1fr); gap:0.5rem; }
      .metodo-btn { padding:0.5rem; border:1px solid #E2E8F0; border-radius:8px; background:#fff; font-size:0.8125rem; font-weight:500; cursor:pointer; text-align:center; transition:all 0.15s; }
      .metodo-btn.active { border-color:#2563EB; background:#EFF6FF; color:#2563EB; }
      .btn-cobrar { width:100%; padding:0.875rem; background:#16A34A; color:#fff; border:none; border-radius:10px; font-size:1rem; font-weight:700; cursor:pointer; transition:background 0.15s; display:flex; align-items:center; justify-content:center; gap:0.5rem; }
      .btn-cobrar:hover { background:#15803D; }
      .btn-cobrar:disabled { background:#94A3B8; cursor:not-allowed; }
      .descuento-row { display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap; }
      .descuento-row input[type=number] { width:90px; padding:0.375rem 0.5rem; border:1px solid #E2E8F0; border-radius:6px; font-size:0.875rem; }
      .descuento-row select { padding:0.375rem 0.5rem; border:1px solid #E2E8F0; border-radius:6px; font-size:0.875rem; }
      .toggle-desc { display:flex; align-items:center; gap:0.5rem; font-size:0.875rem; cursor:pointer; }
      .empty-cart { text-align:center; padding:2rem; color:#94A3B8; }
      .empty-cart i { font-size:2rem; display:block; margin-bottom:0.5rem; }
      .tabs { display:flex; border-bottom:1px solid #E2E8F0; margin-bottom:1rem; }
      .tab-btn { padding:0.625rem 1.25rem; border:none; background:none; font-size:0.875rem; font-weight:500; cursor:pointer; color:#64748B; border-bottom:2px solid transparent; margin-bottom:-1px; }
      .tab-btn.active { color:#2563EB; border-bottom-color:#2563EB; }
      .hist-table-wrap { overflow-x:auto; }
      table { width:100%; border-collapse:collapse; font-size:0.875rem; }
      th { padding:0.625rem 0.875rem; text-align:left; font-size:0.75rem; font-weight:600; text-transform:uppercase; color:#64748B; border-bottom:1px solid #E2E8F0; }
      td { padding:0.625rem 0.875rem; border-bottom:1px solid #F1F5F9; }
      .badge { display:inline-flex; align-items:center; gap:0.25rem; padding:0.2rem 0.6rem; border-radius:999px; font-size:0.75rem; font-weight:600; }
      .badge-ok { background:#DCFCE7; color:#16A34A; }
      .badge-danger { background:#FEE2E2; color:#DC2626; }
      .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.45); z-index:1000; display:flex; align-items:center; justify-content:center; padding:1rem; }
      .modal { background:#fff; border-radius:14px; width:100%; max-width:480px; max-height:90vh; overflow-y:auto; box-shadow:0 20px 60px rgba(0,0,0,0.2); animation:slideUp 0.2s ease; }
      @keyframes slideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
      .modal-header { display:flex; align-items:center; justify-content:space-between; padding:1.25rem 1.5rem; border-bottom:1px solid #E2E8F0; }
      .modal-header h2 { font-size:1.125rem; font-weight:700; }
      .modal-body { padding:1.5rem; }
      .modal-footer { display:flex; justify-content:flex-end; gap:0.75rem; padding:1rem 1.5rem; border-top:1px solid #E2E8F0; }
      .btn-primary { display:inline-flex; align-items:center; gap:0.5rem; padding:0.5rem 1rem; background:#2563EB; color:#fff; border:none; border-radius:8px; font-size:0.875rem; font-weight:600; cursor:pointer; }
      .btn-secondary { display:inline-flex; align-items:center; gap:0.5rem; padding:0.5rem 1rem; background:#F1F5F9; color:#1E293B; border:1px solid #E2E8F0; border-radius:8px; font-size:0.875rem; font-weight:500; cursor:pointer; }
      .btn-close { background:none; border:none; font-size:1.25rem; cursor:pointer; color:#64748B; }
      .cliente-result { padding:0.5rem 0.75rem; border:1px solid #E2E8F0; border-radius:8px; cursor:pointer; font-size:0.875rem; margin-top:0.375rem; }
      .cliente-result:hover { background:#F8FAFC; }
      .cliente-selected { display:flex; align-items:center; justify-content:space-between; padding:0.5rem 0.75rem; background:#EFF6FF; border-radius:8px; font-size:0.875rem; margin-top:0.5rem; }
    </style>

    <div style="display:flex;gap:0.75rem;margin-bottom:1rem;">
      <button class="tab-btn active" id="tabPOS" data-tab="pos">Punto de Venta</button>
      <button class="tab-btn" id="tabHistorial" data-tab="historial">Historial de Ventas</button>
    </div>

    <div id="viewPOS">
      <div class="pos-layout">
        <div class="pos-left">
          <div class="pos-card">
            <div class="pos-card-header"><i class="fas fa-search" style="color:#2563EB;"></i> Buscar Producto</div>
            <div class="pos-card-body">
              <input class="search-input" id="prodSearch" type="text" placeholder="Nombre del producto..." autocomplete="off" />
              <div class="cat-filters" id="catFilters"></div>
              <div class="prod-results" id="prodResults">
                <p style="color:#94A3B8;font-size:0.875rem;text-align:center;padding:1rem;">Escribe para buscar productos</p>
              </div>
            </div>
          </div>
          <div class="pos-card">
            <div class="pos-card-header"><i class="fas fa-user" style="color:#64748B;"></i> Cliente (opcional)</div>
            <div class="pos-card-body">
              <input class="search-input" id="clienteSearch" type="text" placeholder="Buscar por DNI o nombre..." autocomplete="off" />
              <div id="clienteResults"></div>
              <div id="clienteSeleccionado"></div>
            </div>
          </div>
        </div>
        <div class="pos-right">
          <div class="pos-card" style="flex:1;">
            <div class="pos-card-header"><i class="fas fa-shopping-cart" style="color:#2563EB;"></i> Carrito</div>
            <div class="pos-card-body" style="display:flex;flex-direction:column;gap:0.875rem;">
              <div class="carrito-items" id="carritoItems">
                <div class="empty-cart"><i class="fas fa-shopping-cart"></i><p>El carrito está vacío</p></div>
              </div>
              <div class="resumen" id="resumenCarrito" style="display:none;">
                <div class="resumen-row"><span>Subtotal</span><span id="rSubtotal">S/ 0.00</span></div>
                <div>
                  <label class="toggle-desc">
                    <input type="checkbox" id="chkDescuento" /> Aplicar descuento
                  </label>
                  <div id="descuentoPanel" style="display:none;margin-top:0.5rem;" class="descuento-row">
                    <select id="descTipo">
                      <option value="porcentaje">%</option>
                      <option value="monto_fijo">S/</option>
                    </select>
                    <input type="number" id="descValor" min="0" step="0.01" placeholder="0" value="0" />
                  </div>
                </div>
                <div class="resumen-row"><span>Descuento</span><span id="rDescuento" style="color:#DC2626;">- S/ 0.00</span></div>
                <div class="resumen-row resumen-total"><span>TOTAL</span><span id="rTotal">S/ 0.00</span></div>
              </div>
              <div id="metodoPagoSection" style="display:none;">
                <div style="font-size:0.8125rem;font-weight:600;color:#374151;margin-bottom:0.5rem;">Método de pago</div>
                <div class="metodos-pago">
                  ${['efectivo','tarjeta','yape','plin','transferencia'].map(m => `<button class="metodo-btn${m==='efectivo'?' active':''}" data-metodo="${m}">${m.charAt(0).toUpperCase()+m.slice(1)}</button>`).join('')}
                </div>
                <div id="efectivoPanel" style="margin-top:0.75rem;">
                  <label style="font-size:0.8125rem;font-weight:600;color:#374151;">Monto recibido (S/)</label>
                  <input class="search-input" id="montoRecibido" type="number" min="0" step="0.01" placeholder="0.00" style="margin-top:0.375rem;" />
                  <div style="display:flex;justify-content:space-between;margin-top:0.5rem;font-size:0.875rem;">
                    <span>Vuelto:</span><span id="vueltoDisplay" style="font-weight:700;color:#16A34A;">S/ 0.00</span>
                  </div>
                </div>
              </div>
              <button class="btn-cobrar" id="btnCobrar" disabled><i class="fas fa-cash-register"></i> Procesar Venta</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div id="viewHistorial" style="display:none;">
      <div style="display:flex;gap:0.75rem;flex-wrap:wrap;margin-bottom:1rem;">
        <input type="date" id="histDesde" style="padding:0.5rem 0.75rem;border:1px solid #E2E8F0;border-radius:8px;font-size:0.875rem;" />
        <input type="date" id="histHasta" style="padding:0.5rem 0.75rem;border:1px solid #E2E8F0;border-radius:8px;font-size:0.875rem;" />
        <select id="histEstado" style="padding:0.5rem 0.75rem;border:1px solid #E2E8F0;border-radius:8px;font-size:0.875rem;">
          <option value="">Todos los estados</option>
          <option value="completada">Completada</option>
          <option value="anulada">Anulada</option>
        </select>
        <select id="histMetodo" style="padding:0.5rem 0.75rem;border:1px solid #E2E8F0;border-radius:8px;font-size:0.875rem;">
          <option value="">Todos los métodos</option>
          ${['efectivo','tarjeta','yape','plin','transferencia'].map(m=>`<option value="${m}">${m.charAt(0).toUpperCase()+m.slice(1)}</option>`).join('')}
        </select>
        <button class="btn-primary" id="btnFiltrarHist"><i class="fas fa-filter"></i> Filtrar</button>
      </div>
      <div class="pos-card">
        <div class="hist-table-wrap">
          <table class="data-table">
            <thead><tr><th>N° Venta</th><th>Cliente</th><th>Total</th><th>Método</th><th>Estado</th><th>Fecha</th>${puedeAnular?'<th>Vendedor</th><th>Acciones</th>':''}</tr></thead>
            <tbody id="histTbody"><tr><td colspan="${puedeAnular?8:6}" style="text-align:center;padding:2rem;color:#94A3B8;">Cargando historial…</td></tr></tbody>
          </table>
        </div>
      </div>
    </div>

    <div id="modalContainer"></div>
  `;

  // Tabs
  container.querySelector('#tabPOS').addEventListener('click', () => {
    container.querySelector('#viewPOS').style.display = '';
    container.querySelector('#viewHistorial').style.display = 'none';
    container.querySelector('#tabPOS').classList.add('active');
    container.querySelector('#tabHistorial').classList.remove('active');
  });
  container.querySelector('#tabHistorial').addEventListener('click', () => {
    container.querySelector('#viewPOS').style.display = 'none';
    container.querySelector('#viewHistorial').style.display = '';
    container.querySelector('#tabPOS').classList.remove('active');
    container.querySelector('#tabHistorial').classList.add('active');
    cargarHistorial(container, puedeAnular);
  });

  // Cargar categorías para filtros
  const catRes = await api.get('/categorias');
  _categorias = catRes.ok ? (catRes.data.categorias || catRes.data || []) : [];
  const catFilters = container.querySelector('#catFilters');
  catFilters.innerHTML = `<button class="cat-btn active" data-cat="">Todas</button>` +
    _categorias.map(c => `<button class="cat-btn" data-cat="${c._id}">${c.nombre}</button>`).join('');

  let catActiva = '';
  catFilters.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      catFilters.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      catActiva = btn.dataset.cat;
      buscarProductos(container, container.querySelector('#prodSearch').value, catActiva);
    });
  });

  // Búsqueda de productos con debounce 500ms
  container.querySelector('#prodSearch').addEventListener('input', e => {
    clearTimeout(_searchTimer);
    _searchTimer = setTimeout(() => buscarProductos(container, e.target.value, catActiva), 500);
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
  container.querySelector('#descTipo').addEventListener('change', e => { _descuentoTipo = e.target.value; recalcular(container); });
  container.querySelector('#descValor').addEventListener('input', e => { _descuentoValor = parseFloat(e.target.value) || 0; recalcular(container); });

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
  container.querySelector('#btnFiltrarHist').addEventListener('click', () => cargarHistorial(container, puedeAnular));
}

async function buscarProductos(container, q, catId) {
  const resultsEl = container.querySelector('#prodResults');
  if (!q && !catId) {
    resultsEl.innerHTML = `<p style="color:#94A3B8;font-size:0.875rem;text-align:center;padding:1rem;">Escribe para buscar productos</p>`;
    return;
  }
  resultsEl.innerHTML = `<p style="color:#94A3B8;font-size:0.875rem;text-align:center;padding:0.5rem;"><i class="fas fa-spinner fa-spin"></i> Buscando…</p>`;
  let url = `/productos?`;
  if (q) url += `search=${encodeURIComponent(q)}&`;
  if (catId) url += `categoria=${catId}&`;
  const res = await api.get(url);
  const prods = res.ok ? (res.data.productos || res.data || []) : [];
  if (prods.length === 0) {
    resultsEl.innerHTML = `<p style="color:#94A3B8;font-size:0.875rem;text-align:center;padding:1rem;">Sin resultados</p>`;
    return;
  }
  resultsEl.innerHTML = prods.slice(0, 20).map(p => {
    const sinStock = p.stock_actual === 0;
    return `
      <div class="prod-result-item${sinStock ? ' sin-stock' : ''}" data-id="${p._id}">
        <div>
          <div style="font-weight:500;font-size:0.875rem;">${p.nombre}</div>
          <div style="font-size:0.75rem;color:#64748B;">S/ ${Number(p.precio_venta).toLocaleString('es-PE',{minimumFractionDigits:2})} · Stock: ${p.stock_actual}</div>
        </div>
        <button class="btn-agregar" data-id="${p._id}" ${sinStock ? 'disabled title="Sin stock"' : ''}>
          ${sinStock ? 'Agotado' : '+ Agregar'}
        </button>
      </div>
    `;
  }).join('');

  resultsEl.querySelectorAll('.btn-agregar:not([disabled])').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const prod = prods.find(p => p._id === btn.dataset.id);
      if (prod) agregarAlCarrito(container, prod);
    });
  });
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
    resumenEl.style.display = 'none';
    metodoPagoEl.style.display = 'none';
    btnCobrar.disabled = true;
    return;
  }

  carritoEl.innerHTML = _carrito.map((item, idx) => `
    <div class="carrito-item">
      <div class="carrito-item-info">
        <div class="carrito-item-name">${item.nombre}</div>
        <div class="carrito-item-price">S/ ${Number(item.precio_venta).toLocaleString('es-PE',{minimumFractionDigits:2})} c/u</div>
      </div>
      <div class="qty-ctrl">
        <button class="qty-btn" data-idx="${idx}" data-action="dec">−</button>
        <span class="qty-val">${item.cantidad}</span>
        <button class="qty-btn" data-idx="${idx}" data-action="inc">+</button>
      </div>
      <div style="min-width:70px;text-align:right;font-weight:600;font-size:0.875rem;">
        S/ ${(item.precio_venta * item.cantidad).toLocaleString('es-PE',{minimumFractionDigits:2})}
      </div>
      <button class="btn-rm" data-idx="${idx}" data-action="rm" aria-label="Eliminar"><i class="fas fa-times"></i></button>
    </div>
  `).join('');

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

  resumenEl.style.display = '';
  metodoPagoEl.style.display = '';
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
      <div class="cliente-result" data-id="${c._id}" style="padding:0.5rem 0.75rem;border:1px solid #E2E8F0;border-radius:8px;cursor:pointer;font-size:0.875rem;margin-top:0.375rem;transition:background 0.15s;">
        <i class="fas fa-user" style="color:#64748B;margin-right:0.375rem;"></i>
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
      <div style="margin-top:0.5rem;padding:0.75rem;background:#FFF7ED;border:1px solid #FED7AA;border-radius:8px;font-size:0.8125rem;">
        <div style="color:#92400E;margin-bottom:0.5rem;"><i class="fas fa-exclamation-circle" style="margin-right:0.375rem;"></i>DNI <strong>${q}</strong> no está registrado.</div>
        <button id="btnBuscarReniec" style="display:inline-flex;align-items:center;gap:0.375rem;padding:0.4rem 0.875rem;background:#0a0a0a;color:#fff;border:none;border-radius:6px;font-size:0.8125rem;font-weight:600;cursor:pointer;">
          <i class="fas fa-search"></i> Buscar en RENIEC
        </button>
      </div>
    `;
    resultsEl.querySelector('#btnBuscarReniec').addEventListener('click', () => consultarReniecEnVenta(container, q));
  } else {
    resultsEl.innerHTML = `<p style="font-size:0.8125rem;color:#94A3B8;margin-top:0.375rem;">Sin resultados</p>`;
  }
}

async function consultarReniecEnVenta(container, dni) {
  const resultsEl = container.querySelector('#clienteResults');
  const selEl     = container.querySelector('#clienteSeleccionado');

  resultsEl.innerHTML = `
    <div style="margin-top:0.5rem;padding:0.75rem;background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;font-size:0.8125rem;color:#1D4ED8;">
      <i class="fas fa-spinner fa-spin" style="margin-right:0.375rem;"></i> Consultando RENIEC…
    </div>
  `;

  const res = await api.get(`/clientes/dni/${dni}`);

  if (!res.ok || res.data.encontrado === false) {
    resultsEl.innerHTML = `
      <div style="margin-top:0.5rem;padding:0.75rem;background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;font-size:0.8125rem;color:#DC2626;">
        <i class="fas fa-times-circle" style="margin-right:0.375rem;"></i> No se encontró información en RENIEC para el DNI <strong>${dni}</strong>.
      </div>
    `;
    return;
  }

  const d = res.data;
  const nombreCompleto = [d.nombre, d.apellido_paterno, d.apellido_materno].filter(Boolean).join(' ');

  // Mostrar card de confirmación con los datos obtenidos
  resultsEl.innerHTML = `
    <div style="margin-top:0.5rem;padding:0.875rem;background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;font-size:0.875rem;">
      <div style="font-weight:600;color:#15803D;margin-bottom:0.5rem;"><i class="fas fa-check-circle" style="margin-right:0.375rem;"></i>Encontrado en RENIEC</div>
      <div style="color:#1E293B;margin-bottom:0.125rem;"><span style="color:#64748B;font-size:0.8125rem;">Nombre:</span> <strong>${nombreCompleto}</strong></div>
      <div style="color:#1E293B;margin-bottom:0.75rem;"><span style="color:#64748B;font-size:0.8125rem;">DNI:</span> <strong>${dni}</strong></div>
      <div style="display:flex;gap:0.5rem;">
        <button id="btnUsarReniec" style="flex:1;padding:0.4rem 0.75rem;background:#0a0a0a;color:#fff;border:none;border-radius:6px;font-size:0.8125rem;font-weight:600;cursor:pointer;">
          <i class="fas fa-user-plus"></i> Usar este cliente
        </button>
        <button id="btnCancelarReniec" style="padding:0.4rem 0.75rem;background:#F1F5F9;color:#64748B;border:1px solid #E2E8F0;border-radius:6px;font-size:0.8125rem;cursor:pointer;">
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
    <div style="display:flex;align-items:center;justify-content:space-between;padding:0.5rem 0.75rem;background:${esNuevo ? '#F0FDF4' : '#EFF6FF'};border:1px solid ${esNuevo ? '#BBF7D0' : '#BFDBFE'};border-radius:8px;margin-top:0.375rem;font-size:0.875rem;">
      <span>
        <i class="fas fa-user${esNuevo ? '-plus' : ''}" style="color:${esNuevo ? '#16A34A' : '#2563EB'};margin-right:0.375rem;"></i>
        <strong>${cliente.nombre || ''} ${cliente.apellido_paterno || ''}</strong>
        <span style="color:#64748B;font-size:0.8125rem;"> — ${cliente.dni}</span>
        ${esNuevo ? '<span style="margin-left:0.375rem;font-size:0.75rem;background:#DCFCE7;color:#15803D;padding:0.1rem 0.4rem;border-radius:999px;font-weight:600;">Nuevo</span>' : ''}
      </span>
      <button id="btnQuitarCliente" style="background:none;border:none;color:#DC2626;cursor:pointer;font-size:0.875rem;" aria-label="Quitar cliente"><i class="fas fa-times"></i></button>
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
      <div class="modal">
        <div class="modal-header">
          <h2><i class="fas fa-cash-register" style="color:#16A34A;margin-right:0.5rem;"></i>Confirmar Venta</h2>
          <button class="btn-close" id="btnCerrarConf"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
          <div style="display:flex;flex-direction:column;gap:0.5rem;font-size:0.875rem;">
            <div style="display:flex;justify-content:space-between;"><span>Productos:</span><span>${_carrito.length} ítem(s)</span></div>
            <div style="display:flex;justify-content:space-between;"><span>Subtotal:</span><span>S/ ${subtotal.toLocaleString('es-PE',{minimumFractionDigits:2})}</span></div>
            ${descuento > 0 ? `<div style="display:flex;justify-content:space-between;color:#DC2626;"><span>Descuento:</span><span>- S/ ${descuento.toLocaleString('es-PE',{minimumFractionDigits:2})}</span></div>` : ''}
            <div style="display:flex;justify-content:space-between;font-weight:700;font-size:1rem;border-top:1px solid #E2E8F0;padding-top:0.5rem;"><span>TOTAL:</span><span>S/ ${total.toLocaleString('es-PE',{minimumFractionDigits:2})}</span></div>
            <div style="display:flex;justify-content:space-between;"><span>Método de pago:</span><span style="text-transform:capitalize;">${_metodoPago}</span></div>
            ${_metodoPago === 'efectivo' ? `<div style="display:flex;justify-content:space-between;"><span>Vuelto:</span><span style="color:#16A34A;font-weight:600;">S/ ${Math.max(0, montoRecibido - total).toLocaleString('es-PE',{minimumFractionDigits:2})}</span></div>` : ''}
            ${_clienteSeleccionado ? `<div style="display:flex;justify-content:space-between;"><span>Cliente:</span><span>${_clienteSeleccionado.nombre || ''} ${_clienteSeleccionado.apellido_paterno || ''} ${_clienteSeleccionado.esNuevo ? '<em style="font-size:0.75rem;color:#16A34A;">(nuevo)</em>' : ''}</span></div>` : ''}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" id="btnCancelarConf">Cancelar</button>
          <button class="btn-primary" id="btnProcesar" style="background:#16A34A;"><i class="fas fa-check"></i> Confirmar y Cobrar</button>
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
        `Venta ${ventaData.numero_venta || ''} registrada — <a href="#" id="toastVerTicket" style="color:#fff;text-decoration:underline;font-weight:600;">Ver ticket</a>`,
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

async function cargarHistorial(container, puedeAnular) {
  const tbody = container.querySelector('#histTbody');
  tbody.innerHTML = `<tr><td colspan="${puedeAnular?8:6}" style="text-align:center;padding:2rem;color:#94A3B8;"><i class="fas fa-spinner fa-spin"></i> Cargando…</td></tr>`;

  let url = '/ventas?';
  const desde = container.querySelector('#histDesde').value;
  const hasta = container.querySelector('#histHasta').value;
  const estado = container.querySelector('#histEstado').value;
  const metodo = container.querySelector('#histMetodo').value;
  if (desde) url += `desde=${desde}&`;
  if (hasta) url += `hasta=${hasta}&`;
  if (estado) url += `estado=${estado}&`;
  if (metodo) url += `metodo_pago=${metodo}&`;

  const res = await api.get(url);
  _historialVentas = res.ok ? (res.data.ventas || res.data || []) : [];

  renderHistorial(container, puedeAnular);
}

function renderHistorial(container, puedeAnular) {
  const tbody = container.querySelector('#histTbody');

  if (_historialVentas.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${puedeAnular?8:6}" style="text-align:center;padding:2rem;color:#94A3B8;">Sin ventas en el período seleccionado</td></tr>`;
    return;
  }

  tbody.innerHTML = _historialVentas.map(v => `
    <tr>
      <td data-label="N° Venta" style="font-weight:500;">${v.numero_venta || '—'}</td>
      <td data-label="Cliente">${v.cliente_id?.nombre ? `${v.cliente_id.nombre} ${v.cliente_id.apellido_paterno||''}`.trim() : 'Público general'}</td>
      <td data-label="Total" style="font-weight:600;">S/ ${Number(v.total).toLocaleString('es-PE',{minimumFractionDigits:2})}</td>
      <td data-label="Método" style="text-transform:capitalize;">${v.metodo_pago}</td>
      <td data-label="Estado"><span class="badge ${v.estado==='completada'?'badge-ok':'badge-danger'}">${v.estado}</span></td>
      <td data-label="Fecha">${new Date(v.fecha_venta).toLocaleDateString('es-PE')}</td>
      ${puedeAnular ? `<td data-label="Vendedor" style="font-size:0.8125rem;">${v.vendedor_id?.nombre_completo || v.vendedor_id?.usuario || '—'}</td>
      <td data-label="Acciones">
        <div style="display:flex;gap:0.375rem;">
          <button class="btn-ticket" data-id="${v._id}" style="display:inline-flex;align-items:center;gap:0.25rem;padding:0.3rem 0.6rem;background:#F0FDF4;color:#16A34A;border:none;border-radius:6px;font-size:0.75rem;font-weight:600;cursor:pointer;"><i class="fas fa-receipt"></i> Ticket</button>
          ${v.estado==='completada'?`<button class="btn-danger" data-id="${v._id}" data-action="anular" style="padding:0.3rem 0.6rem;font-size:0.75rem;"><i class="fas fa-ban"></i> Anular</button>`:'—'}
        </div>
      </td>` : `<td><button class="btn-ticket" data-id="${v._id}" style="display:inline-flex;align-items:center;gap:0.25rem;padding:0.3rem 0.6rem;background:#F0FDF4;color:#16A34A;border:none;border-radius:6px;font-size:0.75rem;font-weight:600;cursor:pointer;"><i class="fas fa-receipt"></i> Ticket</button></td>`}
    </tr>
  `).join('');

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
}

function confirmarAnulacion(container, ventaId, puedeAnular) {
  const modalContainer = container.querySelector('#modalContainer');
  modalContainer.innerHTML = `
    <div class="modal-overlay" id="anulModal" role="dialog" aria-modal="true">
      <div class="modal" style="max-width:420px;">
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
