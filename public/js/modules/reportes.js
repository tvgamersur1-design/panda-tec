/**
 * reportes.js — Módulo de Reportes
 * Tabs: Ventas del día, Ventas del mes, Más vendidos, Stock valorizado.
 */

import { api } from '../api.js';

export async function init(container, user) {
  container.innerHTML = `
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
  resultEl.innerHTML = `<div class="rep-spinner"><i class="fas fa-spinner fa-spin"></i></div>`;
  const res = await api.get(`/reportes/ventas-dia?fecha=${fecha}`);
  if (!res.ok) { resultEl.innerHTML = `<p class="rep-error">Error al cargar el reporte.</p>`; return; }
  const d = res.data;
  const metodos = d.por_metodo_pago || {};
  resultEl.innerHTML = `
    <div class="stat-row">
      <div class="stat-box"><div class="stat-box-label">Total ventas</div><div class="stat-box-value">${d.total_ventas ?? 0}</div></div>
      <div class="stat-box"><div class="stat-box-label">Monto total</div><div class="stat-box-value rep-stat-blue">S/ ${Number(d.monto_total ?? 0).toLocaleString('es-PE',{minimumFractionDigits:2})}</div></div>
      <div class="stat-box"><div class="stat-box-label">Ganancia del día</div><div class="stat-box-value rep-stat-green">S/ ${Number(d.ganancia_dia ?? 0).toLocaleString('es-PE',{minimumFractionDigits:2})}</div></div>
      <div class="stat-box"><div class="stat-box-label">Ticket promedio</div><div class="stat-box-value rep-stat-orange">S/ ${Number(d.ticket_promedio ?? 0).toLocaleString('es-PE',{minimumFractionDigits:2})}</div></div>
      <div class="stat-box"><div class="stat-box-label">Productos vendidos</div><div class="stat-box-value">${d.productos_vendidos ?? 0}</div></div>
    </div>
    <div class="rep-section-title">Desglose por método de pago</div>
    ${Object.keys(metodos).length === 0 ? '<p class="rep-empty">Sin datos</p>' : `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Método</th><th>Ventas</th><th>Monto</th></tr></thead>
          <tbody>
            ${Object.entries(metodos).map(([m, v]) => `
              <tr>
                <td><span class="metodo-badge">${m}</span></td>
                <td>${v.count ?? v.cantidad ?? 0}</td>
                <td class="rep-fw600">S/ ${Number(v.total ?? v.monto ?? 0).toLocaleString('es-PE',{minimumFractionDigits:2})}</td>
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
        <label>Mes <input type="number" id="inputMes" min="1" max="12" value="${mes}" class="rep-input-sm" /></label>
        <label>Año <input type="number" id="inputAnio" min="2020" max="2099" value="${anio}" class="rep-input-md" /></label>
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
  resultEl.innerHTML = `<div class="rep-spinner"><i class="fas fa-spinner fa-spin"></i></div>`;
  const res = await api.get(`/reportes/ventas-mes?mes=${mes}&anio=${anio}`);
  if (!res.ok) { resultEl.innerHTML = `<p class="rep-error">Error al cargar el reporte.</p>`; return; }
  const d = res.data;
  const desglose = d.desglose_diario || d.desglose || [];
  resultEl.innerHTML = `
    <div class="stat-row">
      <div class="stat-box"><div class="stat-box-label">Total ventas</div><div class="stat-box-value">${d.total_ventas ?? 0}</div></div>
      <div class="stat-box"><div class="stat-box-label">Monto total</div><div class="stat-box-value rep-stat-blue">S/ ${Number(d.monto_total ?? 0).toLocaleString('es-PE',{minimumFractionDigits:2})}</div></div>
      <div class="stat-box"><div class="stat-box-label">Ganancia del mes</div><div class="stat-box-value rep-stat-green">S/ ${Number(d.ganancia_mes ?? 0).toLocaleString('es-PE',{minimumFractionDigits:2})}</div></div>
      <div class="stat-box"><div class="stat-box-label">Ticket promedio</div><div class="stat-box-value rep-stat-orange">S/ ${Number(d.ticket_promedio ?? 0).toLocaleString('es-PE',{minimumFractionDigits:2})}</div></div>
      <div class="stat-box"><div class="stat-box-label">Productos vendidos</div><div class="stat-box-value">${d.productos_vendidos ?? 0}</div></div>
    </div>
    ${desglose.length === 0 ? '<p class="rep-empty">Sin datos para este período</p>' : `
      <div class="rep-section-title">Desglose diario</div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Fecha</th><th>Ventas</th><th>Monto</th></tr></thead>
          <tbody>
            ${desglose.map(row => `
              <tr>
                <td>${row.fecha || row._id || '—'}</td>
                <td>${row.count ?? row.ventas ?? 0}</td>
                <td class="rep-fw600">S/ ${Number(row.total ?? row.monto ?? 0).toLocaleString('es-PE',{minimumFractionDigits:2})}</td>
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
  const hace30 = new Date(now);
  hace30.setDate(hace30.getDate() - 30);
  const desde30 = hace30.toISOString().split('T')[0];
  content.innerHTML = `
    <div class="rep-card">
      <div class="rep-filters">
        <label>Desde <input type="date" id="mvDesde" value="${desde30}" /></label>
        <label>Hasta <input type="date" id="mvHasta" value="${hasta}" /></label>
        <label>Ordenar por <select id="mvOrderBy"><option value="cantidad">Cantidad vendida</option><option value="ingresos">Ingresos generados</option></select></label>
        <label>Por página <select id="mvLimit"><option value="10">10</option><option value="20">20</option><option value="50">50</option></select></label>
        <button class="btn-primary" id="btnBuscarMV"><i class="fas fa-search"></i> Buscar</button>
      </div>
      <div id="resultMV"></div>
    </div>
  `;
  content.querySelector('#btnBuscarMV').addEventListener('click', () => {
    const d = content.querySelector('#mvDesde').value;
    const h = content.querySelector('#mvHasta').value;
    const limit = content.querySelector('#mvLimit').value;
    const orderBy = content.querySelector('#mvOrderBy').value;
    cargarMasVendidos(content, d, h, 1, limit, orderBy);
  });
  cargarMasVendidos(content, desde30, hasta, 1, 10, 'cantidad');
}

async function cargarMasVendidos(content, desde, hasta, page = 1, limit = 10, orderBy = 'cantidad') {
  const resultEl = content.querySelector('#resultMV');
  resultEl.innerHTML = `<div class="rep-spinner"><i class="fas fa-spinner fa-spin"></i></div>`;
  const res = await api.get(`/reportes/productos-mas-vendidos?desde=${desde}&hasta=${hasta}&page=${page}&limit=${limit}&orderBy=${orderBy}`);
  if (!res.ok) { resultEl.innerHTML = `<p class="rep-error">Error al cargar el reporte.</p>`; return; }
  const productos = res.data.productos || [];
  const resumen = res.data.resumen || {};
  const pagination = res.data.pagination || {};
  
  if (productos.length === 0) {
    resultEl.innerHTML = `<div class="empty-state"><i class="fas fa-chart-bar"></i><p>Sin datos en el período seleccionado</p></div>`;
    return;
  }

  const startNum = (page - 1) * limit;
  const ordenLabel = orderBy === 'ingresos' ? 'ingresos' : 'cantidad';
  
  resultEl.innerHTML = `
    <div class="stat-row" style="margin-bottom:1.25rem;">
      <div class="stat-box"><div class="stat-box-label">Total ingresos</div><div class="stat-box-value rep-stat-blue">S/ ${Number(resumen.total_ingresos ?? 0).toLocaleString('es-PE',{minimumFractionDigits:2})}</div></div>
      <div class="stat-box"><div class="stat-box-label">Ganancia total</div><div class="stat-box-value rep-stat-green">S/ ${Number(resumen.ganancia_total ?? 0).toLocaleString('es-PE',{minimumFractionDigits:2})}</div></div>
      <div class="stat-box"><div class="stat-box-label">Unidades vendidas</div><div class="stat-box-value">${resumen.total_unidades ?? 0}</div></div>
      <div class="stat-box"><div class="stat-box-label">Productos únicos</div><div class="stat-box-value">${resumen.productos_unicos ?? 0}</div></div>
    </div>
    <div class="rep-section-title">Ordenado por: ${ordenLabel === 'ingresos' ? 'Ingresos generados' : 'Cantidad vendida'}</div>
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr><th>#</th><th>Producto</th><th>Unidades vendidas</th><th>Ingresos</th><th>Ganancia</th></tr></thead>
        <tbody>
          ${productos.map((p, i) => {
            const ganancia = (p.ingresos ?? 0) - (p.costo_total ?? 0);
            return `
              <tr>
                <td data-label="#" class="rep-col-blue">${startNum + i + 1}</td>
                <td data-label="Producto" class="rep-name">${p.nombre || p.producto || '—'}</td>
                <td data-label="Unidades vendidas">${p.total_vendido ?? p.cantidad ?? 0}</td>
                <td data-label="Ingresos" class="rep-fw600">S/ ${Number(p.ingresos ?? p.total ?? 0).toLocaleString('es-PE',{minimumFractionDigits:2})}</td>
                <td data-label="Ganancia" class="rep-col-green">S/ ${Number(ganancia).toLocaleString('es-PE',{minimumFractionDigits:2})}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
    ${renderPagination(pagination, (newPage) => cargarMasVendidos(content, desde, hasta, newPage, limit, orderBy))}
  `;
}

async function renderStockValorizado(content) {
  content.innerHTML = `
    <div class="rep-card">
      <div class="rep-header-row">
        <h3 class="rep-header-title">Stock Valorizado</h3>
        <div class="rep-header-controls">
          <label class="rep-control-label">
            Por página <select id="stockLimit" class="rep-control-select"><option value="20">20</option><option value="50">50</option><option value="100">100</option></select>
          </label>
          <button class="btn-primary" id="btnRefreshStock"><i class="fas fa-sync"></i> Actualizar</button>
        </div>
      </div>
      <div id="resultStock"><div class="rep-spinner"><i class="fas fa-spinner fa-spin"></i></div></div>
    </div>
  `;
  content.querySelector('#btnRefreshStock').addEventListener('click', () => {
    const limit = content.querySelector('#stockLimit').value;
    cargarStockValorizado(content, 1, limit);
  });
  content.querySelector('#stockLimit').addEventListener('change', () => {
    const limit = content.querySelector('#stockLimit').value;
    cargarStockValorizado(content, 1, limit);
  });
  await cargarStockValorizado(content, 1, 20);
}

async function cargarStockValorizado(content, page = 1, limit = 20) {
  const resultEl = content.querySelector('#resultStock');
  resultEl.innerHTML = `<div class="rep-spinner"><i class="fas fa-spinner fa-spin"></i></div>`;
  const res = await api.get(`/reportes/stock-valorizado?page=${page}&limit=${limit}`);
  if (!res.ok) { resultEl.innerHTML = `<p class="rep-error">Error al cargar el reporte.</p>`; return; }
  const productos = res.data.productos || [];
  const totalGeneral = res.data.total_inventario_general ?? res.data.total_inventario ?? 0;
  const totalPotencial = res.data.total_potencial_general ?? 0;
  const gananciaPotencial = res.data.ganancia_potencial ?? 0;
  const pagination = res.data.pagination || {};

  if (productos.length === 0) {
    resultEl.innerHTML = `<div class="empty-state"><i class="fas fa-boxes"></i><p>Sin productos en inventario</p></div>`;
    return;
  }

  resultEl.innerHTML = `
    <div class="stat-row" style="margin-bottom:1.25rem;">
      <div class="stat-box"><div class="stat-box-label">Total valorizado (Compra)</div><div class="stat-box-value rep-stat-green">S/ ${Number(totalGeneral).toLocaleString('es-PE',{minimumFractionDigits:2})}</div></div>
      <div class="stat-box"><div class="stat-box-label">Valor potencial (Venta)</div><div class="stat-box-value rep-stat-blue">S/ ${Number(totalPotencial).toLocaleString('es-PE',{minimumFractionDigits:2})}</div></div>
      <div class="stat-box"><div class="stat-box-label">Ganancia potencial</div><div class="stat-box-value rep-stat-orange">S/ ${Number(gananciaPotencial).toLocaleString('es-PE',{minimumFractionDigits:2})}</div></div>
      <div class="stat-box"><div class="stat-box-label">Total productos</div><div class="stat-box-value">${pagination.total ?? productos.length}</div></div>
    </div>
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr><th>Producto</th><th>Stock</th><th>Precio compra</th><th>Precio venta</th><th>Valor total</th><th>Valor potencial</th></tr></thead>
        <tbody>
          ${productos.map(p => `
            <tr>
              <td data-label="Producto" class="rep-name">${p.nombre}</td>
              <td data-label="Stock">${p.stock_actual ?? 0}</td>
              <td data-label="Precio compra">S/ ${Number(p.precio_compra ?? 0).toLocaleString('es-PE',{minimumFractionDigits:2})}</td>
              <td data-label="Precio venta">S/ ${Number(p.precio_venta ?? 0).toLocaleString('es-PE',{minimumFractionDigits:2})}</td>
              <td data-label="Valor total" class="rep-col-green">S/ ${Number(p.valor_total ?? (p.stock_actual * p.precio_compra) ?? 0).toLocaleString('es-PE',{minimumFractionDigits:2})}</td>
              <td data-label="Valor potencial" class="rep-col-blue">S/ ${Number(p.valor_potencial ?? (p.stock_actual * p.precio_venta) ?? 0).toLocaleString('es-PE',{minimumFractionDigits:2})}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ${renderPagination(pagination, (newPage) => cargarStockValorizado(content, newPage, limit))}
  `;
}

function renderPagination(pagination, onPageChange) {
  if (!pagination || !pagination.totalPages || pagination.totalPages <= 1) return '';
  
  const { page, totalPages, total } = pagination;
  const pages = [];
  
  // Lógica para mostrar páginas: primera, última, actual y vecinas
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  const html = `
    <div class="pagination">
      <button ${page === 1 ? 'disabled' : ''} data-page="${page - 1}">
        <i class="fas fa-chevron-left"></i>
      </button>
      ${pages.map(p => {
        if (p === '...') return `<span class="pagination-info">...</span>`;
        return `<button class="${p === page ? 'active' : ''}" data-page="${p}">${p}</button>`;
      }).join('')}
      <button ${page === totalPages ? 'disabled' : ''} data-page="${page + 1}">
        <i class="fas fa-chevron-right"></i>
      </button>
      <span class="pagination-info">${total} registros</span>
    </div>
  `;

  setTimeout(() => {
    document.querySelectorAll('.pagination button[data-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        const newPage = parseInt(btn.dataset.page);
        if (newPage && newPage !== page) onPageChange(newPage);
      });
    });
  }, 0);

  return html;
}
