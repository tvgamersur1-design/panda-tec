/**
 * reportes.js — Módulo de Reportes
 * Tabs: Ventas del día, Ventas del mes, Más vendidos, Stock valorizado.
 */

import { api } from '../api.js';

export async function init(container, user) {
  container.innerHTML = `
    <style>
      .tabs { display:flex; border-bottom:1px solid #E2E8F0; margin-bottom:1.25rem; flex-wrap:wrap; }
      .tab-btn { padding:0.625rem 1.25rem; border:none; background:none; font-size:0.875rem; font-weight:500; cursor:pointer; color:#64748B; border-bottom:2px solid transparent; margin-bottom:-1px; white-space:nowrap; }
      .tab-btn.active { color:#2563EB; border-bottom-color:#2563EB; }
      .rep-card { background:#fff; border-radius:12px; border:1px solid #E2E8F0; padding:1.5rem; }
      .rep-filters { display:flex; gap:0.75rem; flex-wrap:wrap; align-items:flex-end; margin-bottom:1.25rem; }
      .rep-filters label { font-size:0.8125rem; font-weight:600; color:#374151; display:flex; flex-direction:column; gap:0.25rem; }
      .rep-filters input, .rep-filters select { padding:0.5rem 0.75rem; border:1px solid #E2E8F0; border-radius:8px; font-size:0.875rem; outline:none; }
      .rep-filters input:focus { border-color:#2563EB; }
      .btn-primary { display:inline-flex; align-items:center; gap:0.5rem; padding:0.5rem 1rem; background:#2563EB; color:#fff; border:none; border-radius:8px; font-size:0.875rem; font-weight:600; cursor:pointer; }
      .btn-primary:hover { background:#1D4ED8; }
      .stat-row { display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:1rem; margin-bottom:1.25rem; }
      .stat-box { background:#F8FAFC; border-radius:10px; padding:1rem; border:1px solid #E2E8F0; }
      .stat-box-label { font-size:0.75rem; font-weight:600; color:#64748B; text-transform:uppercase; letter-spacing:0.04em; margin-bottom:0.375rem; }
      .stat-box-value { font-size:1.5rem; font-weight:700; color:#1E293B; }
      .table-wrap { overflow-x:auto; }
      table { width:100%; border-collapse:collapse; font-size:0.875rem; }
      th { padding:0.625rem 0.875rem; text-align:left; font-size:0.75rem; font-weight:600; text-transform:uppercase; color:#64748B; border-bottom:1px solid #E2E8F0; }
      td { padding:0.625rem 0.875rem; border-bottom:1px solid #F1F5F9; }
      tr:last-child td { border-bottom:none; }
      tr:hover td { background:#F8FAFC; }
      .metodo-badge { background:#EFF6FF; color:#2563EB; padding:0.15rem 0.5rem; border-radius:6px; font-size:0.75rem; font-weight:500; text-transform:capitalize; display:inline-block; }
      .empty-state { text-align:center; padding:2.5rem; color:#64748B; }
      .empty-state i { font-size:2rem; margin-bottom:0.75rem; display:block; opacity:0.35; }
    </style>

    <div class="tabs">
      <button class="tab-btn active" data-tab="dia">Ventas del día</button>
      <button class="tab-btn" data-tab="mes">Ventas del mes</button>
      <button class="tab-btn" data-tab="vendidos">Más vendidos</button>
      <button class="tab-btn" data-tab="stock">Stock valorizado</button>
    </div>

    <div id="tabContent"></div>
  `;

  const tabs = container.querySelectorAll('.tab-btn');
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      tabs.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderTab(container, btn.dataset.tab);
    });
  });

  renderTab(container, 'dia');
}

function renderTab(container, tab) {
  const content = container.querySelector('#tabContent');
  switch (tab) {
    case 'dia':    renderVentasDia(content); break;
    case 'mes':    renderVentasMes(content); break;
    case 'vendidos': renderMasVendidos(content); break;
    case 'stock':  renderStockValorizado(content); break;
  }
}

function renderVentasDia(content) {
  const hoy = new Date().toISOString().split('T')[0];
  content.innerHTML = `
    <div class="rep-card">
      <div class="rep-filters">
        <label>Fecha <input type="date" id="fechaDia" value="${hoy}" /></label>
        <button class="btn-primary" id="btnBuscarDia"><i class="fas fa-search"></i> Buscar</button>
      </div>
      <div id="resultDia"></div>
    </div>
  `;
  content.querySelector('#btnBuscarDia').addEventListener('click', () => {
    const fecha = content.querySelector('#fechaDia').value;
    cargarVentasDia(content, fecha);
  });
  cargarVentasDia(content, hoy);
}

async function cargarVentasDia(content, fecha) {
  const resultEl = content.querySelector('#resultDia');
  resultEl.innerHTML = `<div style="text-align:center;padding:2rem;color:#94A3B8;"><i class="fas fa-spinner fa-spin"></i></div>`;
  const res = await api.get(`/reportes/ventas-dia?fecha=${fecha}`);
  if (!res.ok) { resultEl.innerHTML = `<p style="color:#DC2626;">Error al cargar el reporte.</p>`; return; }
  const d = res.data;
  const metodos = d.por_metodo_pago || {};
  resultEl.innerHTML = `
    <div class="stat-row">
      <div class="stat-box"><div class="stat-box-label">Total ventas</div><div class="stat-box-value">${d.total_ventas ?? 0}</div></div>
      <div class="stat-box"><div class="stat-box-label">Monto total</div><div class="stat-box-value" style="font-size:1.25rem;">S/ ${Number(d.monto_total ?? 0).toLocaleString('es-PE',{minimumFractionDigits:2})}</div></div>
    </div>
    <div style="font-weight:600;margin-bottom:0.75rem;font-size:0.9375rem;">Desglose por método de pago</div>
    ${Object.keys(metodos).length === 0 ? '<p style="color:#94A3B8;font-size:0.875rem;">Sin datos</p>' : `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Método</th><th>Ventas</th><th>Monto</th></tr></thead>
          <tbody>
            ${Object.entries(metodos).map(([m, v]) => `
              <tr>
                <td><span class="metodo-badge">${m}</span></td>
                <td>${v.count ?? v.cantidad ?? 0}</td>
                <td style="font-weight:600;">S/ ${Number(v.total ?? v.monto ?? 0).toLocaleString('es-PE',{minimumFractionDigits:2})}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `}
  `;
}

function renderVentasMes(content) {
  const now = new Date();
  const mes = String(now.getMonth() + 1).padStart(2, '0');
  const anio = now.getFullYear();
  content.innerHTML = `
    <div class="rep-card">
      <div class="rep-filters">
        <label>Mes <input type="number" id="inputMes" min="1" max="12" value="${mes}" style="width:70px;" /></label>
        <label>Año <input type="number" id="inputAnio" min="2020" max="2099" value="${anio}" style="width:90px;" /></label>
        <button class="btn-primary" id="btnBuscarMes"><i class="fas fa-search"></i> Buscar</button>
      </div>
      <div id="resultMes"></div>
    </div>
  `;
  content.querySelector('#btnBuscarMes').addEventListener('click', () => {
    const m = content.querySelector('#inputMes').value;
    const a = content.querySelector('#inputAnio').value;
    cargarVentasMes(content, m, a);
  });
  cargarVentasMes(content, mes, anio);
}

async function cargarVentasMes(content, mes, anio) {
  const resultEl = content.querySelector('#resultMes');
  resultEl.innerHTML = `<div style="text-align:center;padding:2rem;color:#94A3B8;"><i class="fas fa-spinner fa-spin"></i></div>`;
  const res = await api.get(`/reportes/ventas-mes?mes=${mes}&anio=${anio}`);
  if (!res.ok) { resultEl.innerHTML = `<p style="color:#DC2626;">Error al cargar el reporte.</p>`; return; }
  const d = res.data;
  const desglose = d.desglose_diario || d.desglose || [];
  resultEl.innerHTML = `
    <div class="stat-row">
      <div class="stat-box"><div class="stat-box-label">Total ventas</div><div class="stat-box-value">${d.total_ventas ?? 0}</div></div>
      <div class="stat-box"><div class="stat-box-label">Monto total</div><div class="stat-box-value" style="font-size:1.25rem;">S/ ${Number(d.monto_total ?? 0).toLocaleString('es-PE',{minimumFractionDigits:2})}</div></div>
    </div>
    ${desglose.length === 0 ? '<p style="color:#94A3B8;font-size:0.875rem;">Sin datos para este período</p>' : `
      <div style="font-weight:600;margin-bottom:0.75rem;font-size:0.9375rem;">Desglose diario</div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Fecha</th><th>Ventas</th><th>Monto</th></tr></thead>
          <tbody>
            ${desglose.map(row => `
              <tr>
                <td>${row.fecha || row._id || '—'}</td>
                <td>${row.count ?? row.ventas ?? 0}</td>
                <td style="font-weight:600;">S/ ${Number(row.total ?? row.monto ?? 0).toLocaleString('es-PE',{minimumFractionDigits:2})}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `}
  `;
}

function renderMasVendidos(content) {
  const now = new Date();
  const hasta = now.toISOString().split('T')[0];
  const desde30 = new Date(now.setDate(now.getDate() - 30)).toISOString().split('T')[0];
  content.innerHTML = `
    <div class="rep-card">
      <div class="rep-filters">
        <label>Desde <input type="date" id="mvDesde" value="${desde30}" /></label>
        <label>Hasta <input type="date" id="mvHasta" value="${hasta}" /></label>
        <button class="btn-primary" id="btnBuscarMV"><i class="fas fa-search"></i> Buscar</button>
      </div>
      <div id="resultMV"></div>
    </div>
  `;
  content.querySelector('#btnBuscarMV').addEventListener('click', () => {
    const d = content.querySelector('#mvDesde').value;
    const h = content.querySelector('#mvHasta').value;
    cargarMasVendidos(content, d, h);
  });
  cargarMasVendidos(content, desde30, hasta);
}

async function cargarMasVendidos(content, desde, hasta) {
  const resultEl = content.querySelector('#resultMV');
  resultEl.innerHTML = `<div style="text-align:center;padding:2rem;color:#94A3B8;"><i class="fas fa-spinner fa-spin"></i></div>`;
  const res = await api.get(`/reportes/productos-mas-vendidos?desde=${desde}&hasta=${hasta}`);
  if (!res.ok) { resultEl.innerHTML = `<p style="color:#DC2626;">Error al cargar el reporte.</p>`; return; }
  const productos = res.data.productos || res.data || [];
  if (productos.length === 0) {
    resultEl.innerHTML = `<div class="empty-state"><i class="fas fa-chart-bar"></i><p>Sin datos en el período seleccionado</p></div>`;
    return;
  }
  resultEl.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr><th>#</th><th>Producto</th><th>Unidades vendidas</th><th>Ingresos</th></tr></thead>
        <tbody>
          ${productos.slice(0, 10).map((p, i) => `
            <tr>
              <td style="font-weight:700;color:#2563EB;">${i + 1}</td>
              <td style="font-weight:500;">${p.nombre || p.producto || '—'}</td>
              <td>${p.total_vendido ?? p.cantidad ?? 0}</td>
              <td style="font-weight:600;">S/ ${Number(p.ingresos ?? p.total ?? 0).toLocaleString('es-PE',{minimumFractionDigits:2})}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

async function renderStockValorizado(content) {
  content.innerHTML = `
    <div class="rep-card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem;">
        <h3 style="font-size:1rem;font-weight:600;">Stock Valorizado</h3>
        <button class="btn-primary" id="btnRefreshStock"><i class="fas fa-sync"></i> Actualizar</button>
      </div>
      <div id="resultStock"><div style="text-align:center;padding:2rem;color:#94A3B8;"><i class="fas fa-spinner fa-spin"></i></div></div>
    </div>
  `;
  content.querySelector('#btnRefreshStock').addEventListener('click', () => cargarStockValorizado(content));
  await cargarStockValorizado(content);
}

async function cargarStockValorizado(content) {
  const resultEl = content.querySelector('#resultStock');
  resultEl.innerHTML = `<div style="text-align:center;padding:2rem;color:#94A3B8;"><i class="fas fa-spinner fa-spin"></i></div>`;
  const res = await api.get('/reportes/stock-valorizado');
  if (!res.ok) { resultEl.innerHTML = `<p style="color:#DC2626;">Error al cargar el reporte.</p>`; return; }
  const productos = res.data.productos || res.data || [];
  const total = res.data.total_valorizado ?? productos.reduce((s, p) => s + (p.valor_total ?? 0), 0);

  if (productos.length === 0) {
    resultEl.innerHTML = `<div class="empty-state"><i class="fas fa-boxes"></i><p>Sin productos en inventario</p></div>`;
    return;
  }

  resultEl.innerHTML = `
    <div class="stat-row" style="margin-bottom:1.25rem;">
      <div class="stat-box"><div class="stat-box-label">Total valorizado</div><div class="stat-box-value" style="font-size:1.25rem;color:#16A34A;">S/ ${Number(total).toLocaleString('es-PE',{minimumFractionDigits:2})}</div></div>
      <div class="stat-box"><div class="stat-box-label">Productos</div><div class="stat-box-value">${productos.length}</div></div>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Producto</th><th>Stock</th><th>Precio compra</th><th>Valor total</th></tr></thead>
        <tbody>
          ${productos.map(p => `
            <tr>
              <td style="font-weight:500;">${p.nombre}</td>
              <td>${p.stock_actual ?? 0}</td>
              <td>S/ ${Number(p.precio_compra ?? 0).toLocaleString('es-PE',{minimumFractionDigits:2})}</td>
              <td style="font-weight:600;">S/ ${Number(p.valor_total ?? (p.stock_actual * p.precio_compra) ?? 0).toLocaleString('es-PE',{minimumFractionDigits:2})}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr style="background:#F8FAFC;">
            <td colspan="3" style="font-weight:700;padding:0.75rem 0.875rem;">TOTAL GENERAL</td>
            <td style="font-weight:700;color:#16A34A;padding:0.75rem 0.875rem;">S/ ${Number(total).toLocaleString('es-PE',{minimumFractionDigits:2})}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  `;
}
