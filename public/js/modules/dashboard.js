/**
 * dashboard.js — Módulo del Dashboard principal
 * Muestra métricas del día, stock bajo y últimas ventas.
 */

import { api } from '../api.js';

// Variables para paginación de stock bajo
let stockBajoPaginaActual = 1;
const ITEMS_POR_PAGINA = 5;

/**
 * Renderiza la lista de stock bajo con paginación
 */
function renderStockBajoPaginado(stockEl, stockBajo) {
  const totalPaginas = Math.ceil(stockBajo.length / ITEMS_POR_PAGINA);
  const inicio = (stockBajoPaginaActual - 1) * ITEMS_POR_PAGINA;
  const fin = inicio + ITEMS_POR_PAGINA;
  const productosPagina = stockBajo.slice(inicio, fin);

  const itemsHTML = productosPagina.map(p => {
    const agotado = p.stock_actual === 0;
    return `
      <div class="panel-row">
        <div>
          <div class="panel-row-name">${p.nombre}</div>
          <div class="panel-row-sub">${p.categoria || p.categoria_id?.nombre || '—'}</div>
        </div>
        <span class="badge ${agotado ? 'badge-danger' : 'badge-warning'}">
          ${agotado ? '<i class="fas fa-times-circle"></i> Agotado' : `<i class="fas fa-exclamation-triangle"></i> Stock: ${p.stock_actual}`}
        </span>
      </div>
    `;
  }).join('');

  const paginacionHTML = totalPaginas > 1 ? `
    <div class="pag-row">
      <button id="btnStockPrev" class="pag-btn" ${stockBajoPaginaActual === 1 ? 'disabled' : ''}>
        <i class="fas fa-chevron-left"></i> Anterior
      </button>
      <span class="pag-info">
        Página ${stockBajoPaginaActual} de ${totalPaginas} <span class="pag-info-sub">(${stockBajo.length} productos)</span>
      </span>
      <button id="btnStockNext" class="pag-btn" ${stockBajoPaginaActual === totalPaginas ? 'disabled' : ''}>
        Siguiente <i class="fas fa-chevron-right"></i>
      </button>
    </div>
  ` : '';

  stockEl.innerHTML = itemsHTML + paginacionHTML;

  // Event listeners para botones de paginación
  if (totalPaginas > 1) {
    const btnPrev = stockEl.querySelector('#btnStockPrev');
    const btnNext = stockEl.querySelector('#btnStockNext');

    if (btnPrev && stockBajoPaginaActual > 1) {
      btnPrev.addEventListener('click', () => {
        stockBajoPaginaActual--;
        renderStockBajoPaginado(stockEl, stockBajo);
      });
    }

    if (btnNext && stockBajoPaginaActual < totalPaginas) {
      btnNext.addEventListener('click', () => {
        stockBajoPaginaActual++;
        renderStockBajoPaginado(stockEl, stockBajo);
      });
    }
  }
}

export async function init(container, user) {
  // Skeleton mientras carga
  container.innerHTML = `
    <div class="skeleton-col">
      <div class="skeleton-grid">
        ${[1,2,3,4].map(() => `
          <div class="skeleton-card">
            <div class="skeleton-bar"></div>
            <div class="skeleton-bar-lg"></div>
          </div>
        `).join('')}
      </div>
      <div class="skeleton-panels">
        <div class="skeleton-panel"></div>
        <div class="skeleton-panel"></div>
      </div>
    </div>
  `;

  const result = await api.get('/dashboard');

  if (!result.ok) {
    container.innerHTML = `
      <div class="error-state">
        <i class="fas fa-exclamation-circle"></i>
        <p>Error al cargar el dashboard. Intenta recargar la página.</p>
      </div>
    `;
    return;
  }

  const d = result.data;
  const ventasHoy    = d.total_ventas_dia ?? d.ventas_hoy ?? 0;
  const ingresosHoy  = d.ingresos_dia     ?? d.ingresos_hoy ?? 0;
  const stockBajo    = d.stock_bajo    ?? [];
  const ultimasVentas = d.ultimas_ventas ?? [];

  container.innerHTML = `
    <!-- Stat cards -->
    <div class="dash-grid">
      <div class="stat-card">
        <div class="stat-icon stat-icon-blue"><i class="fas fa-shopping-cart"></i></div>
        <div class="stat-label">Ventas hoy</div>
        <div class="stat-value">${ventasHoy}</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon stat-icon-green"><i class="fas fa-coins"></i></div>
        <div class="stat-label">Ingresos hoy</div>
        <div class="stat-value stat-value-md">S/ ${Number(ingresosHoy).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon stat-icon-amber"><i class="fas fa-exclamation-triangle"></i></div>
        <div class="stat-label">Stock bajo</div>
        <div class="stat-value">${stockBajo.length}</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon stat-icon-cyan"><i class="fas fa-receipt"></i></div>
        <div class="stat-label">Últimas ventas</div>
        <div class="stat-value">${ultimasVentas.length}</div>
      </div>
    </div>

    <!-- Panels -->
    <div class="dash-panels">
      <!-- Stock bajo -->
      <div class="panel">
        <div class="panel-header"><i class="fas fa-exclamation-triangle panel-header-icon-amber"></i> Alertas de stock bajo</div>
        <div class="panel-body" id="stockBajoList"></div>
      </div>
      <!-- Últimas ventas -->
      <div class="panel">
        <div class="panel-header"><i class="fas fa-receipt panel-header-icon-blue"></i> Últimas 5 ventas</div>
        <div class="panel-body" id="ultimasVentasList"></div>
      </div>
    </div>
  `;

  // Renderizar stock bajo con paginación
  const stockEl = container.querySelector('#stockBajoList');
  if (stockBajo.length === 0) {
    stockEl.innerHTML = `<div class="empty-state"><i class="fas fa-check-circle empty-state-icon-green"></i><p>Sin alertas de stock</p></div>`;
  } else {
    renderStockBajoPaginado(stockEl, stockBajo);
  }

  // Renderizar últimas ventas
  const ventasEl = container.querySelector('#ultimasVentasList');
  if (ultimasVentas.length === 0) {
    ventasEl.innerHTML = `<div class="empty-state"><i class="fas fa-shopping-cart"></i><p>Sin ventas registradas hoy</p></div>`;
  } else {
    ventasEl.innerHTML = ultimasVentas.map(v => `
      <div class="panel-row">
        <div>
          <div class="panel-row-name">${v.numero_venta || '—'}</div>
          <div class="panel-row-sub">${v.cliente_id?.nombre ? `${v.cliente_id.nombre} ${v.cliente_id.apellido_paterno || ''}`.trim() : 'Público general'} · ${new Date(v.fecha_venta).toLocaleDateString('es-PE')}</div>
        </div>
        <div class="panel-row-right">
          <div class="panel-row-total">S/ ${Number(v.total).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</div>
          <span class="metodo-badge">${v.metodo_pago}</span>
        </div>
      </div>
    `).join('');
  }
}

export async function refresh(container) {
  const result = await api.checkForUpdates('/dashboard');
  if (!result.ok) return;

  const d = result.data;

  // Actualizar solo los valores numéricos sin re-renderizar todo
  const ventasHoy = d.total_ventas_dia ?? d.ventas_hoy ?? 0;
  const ingresosHoy = d.ingresos_dia ?? d.ingresos_hoy ?? 0;
  const stockBajo = d.stock_bajo ?? [];

  const statValues = container.querySelectorAll('.stat-value');
  if (statValues[0]) statValues[0].textContent = ventasHoy;
  if (statValues[1]) statValues[1].textContent = `S/ ${Number(ingresosHoy).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
  if (statValues[2]) statValues[2].textContent = stockBajo.length;

  // Actualizar lista de stock bajo con paginación
  const stockEl = container.querySelector('#stockBajoList');
  if (stockEl && stockBajo.length > 0) {
    renderStockBajoPaginado(stockEl, stockBajo);
  }
}
