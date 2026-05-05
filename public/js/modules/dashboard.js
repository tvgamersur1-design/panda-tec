/**
 * dashboard.js — Módulo del Dashboard principal
 * Muestra métricas del día, stock bajo y últimas ventas.
 */

import { api } from '../api.js';

export async function init(container, user) {
  // Skeleton mientras carga
  container.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:1.5rem;">
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;">
        ${[1,2,3,4].map(() => `
          <div style="background:#fff;border-radius:12px;padding:1.25rem;border:1px solid #E2E8F0;">
            <div style="height:14px;background:#E2E8F0;border-radius:6px;width:60%;margin-bottom:0.75rem;animation:pulse 1.5s infinite;"></div>
            <div style="height:32px;background:#E2E8F0;border-radius:6px;width:40%;animation:pulse 1.5s infinite;"></div>
          </div>
        `).join('')}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
        <div style="background:#fff;border-radius:12px;padding:1.25rem;border:1px solid #E2E8F0;height:200px;animation:pulse 1.5s infinite;"></div>
        <div style="background:#fff;border-radius:12px;padding:1.25rem;border:1px solid #E2E8F0;height:200px;animation:pulse 1.5s infinite;"></div>
      </div>
    </div>
    <style>@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}</style>
  `;

  const result = await api.get('/dashboard');

  if (!result.ok) {
    container.innerHTML = `
      <div style="text-align:center;padding:3rem;color:#64748B;">
        <i class="fas fa-exclamation-circle" style="font-size:2.5rem;margin-bottom:1rem;display:block;color:#DC2626;"></i>
        <p>Error al cargar el dashboard. Intenta recargar la página.</p>
      </div>
    `;
    return;
  }

  const d = result.data;
  const ventasHoy = d.ventas_hoy ?? 0;
  const ingresosHoy = d.ingresos_hoy ?? 0;
  const stockBajo = d.stock_bajo ?? [];
  const ultimasVentas = d.ultimas_ventas ?? [];

  container.innerHTML = `
    <style>
      .dash-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
      .stat-card { background: #fff; border-radius: 12px; padding: 1.25rem 1.5rem; border: 1px solid #E2E8F0; display: flex; flex-direction: column; gap: 0.5rem; }
      .stat-label { font-size: 0.8125rem; font-weight: 500; color: #64748B; text-transform: uppercase; letter-spacing: 0.04em; }
      .stat-value { font-size: 2rem; font-weight: 700; color: #1E293B; line-height: 1; }
      .stat-icon { font-size: 1.5rem; margin-bottom: 0.25rem; }
      .dash-panels { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
      @media(max-width:767px){ .dash-panels { grid-template-columns: 1fr; } }
      .panel { background: #fff; border-radius: 12px; border: 1px solid #E2E8F0; overflow: hidden; }
      .panel-header { padding: 1rem 1.25rem; border-bottom: 1px solid #E2E8F0; font-weight: 600; font-size: 0.9375rem; display: flex; align-items: center; gap: 0.5rem; }
      .panel-body { padding: 0; }
      .panel-row { display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1.25rem; border-bottom: 1px solid #F1F5F9; font-size: 0.875rem; }
      .panel-row:last-child { border-bottom: none; }
      .badge { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.2rem 0.6rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; }
      .badge-warning { background: #FEF3C7; color: #D97706; }
      .badge-danger  { background: #FEE2E2; color: #DC2626; }
      .badge-success { background: #DCFCE7; color: #16A34A; }
      .empty-state { text-align: center; padding: 2rem; color: #64748B; }
      .empty-state i { font-size: 2rem; margin-bottom: 0.75rem; display: block; opacity: 0.4; }
      .metodo-badge { background: #EFF6FF; color: #2563EB; padding: 0.15rem 0.5rem; border-radius: 6px; font-size: 0.75rem; font-weight: 500; text-transform: capitalize; }
    </style>

    <!-- Stat cards -->
    <div class="dash-grid">
      <div class="stat-card">
        <div class="stat-icon" style="color:#2563EB;"><i class="fas fa-shopping-cart"></i></div>
        <div class="stat-label">Ventas hoy</div>
        <div class="stat-value">${ventasHoy}</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="color:#16A34A;"><i class="fas fa-coins"></i></div>
        <div class="stat-label">Ingresos hoy</div>
        <div class="stat-value" style="font-size:1.5rem;">S/ ${Number(ingresosHoy).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="color:#D97706;"><i class="fas fa-exclamation-triangle"></i></div>
        <div class="stat-label">Stock bajo</div>
        <div class="stat-value">${stockBajo.length}</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="color:#0891B2;"><i class="fas fa-receipt"></i></div>
        <div class="stat-label">Últimas ventas</div>
        <div class="stat-value">${ultimasVentas.length}</div>
      </div>
    </div>

    <!-- Panels -->
    <div class="dash-panels">
      <!-- Stock bajo -->
      <div class="panel">
        <div class="panel-header"><i class="fas fa-exclamation-triangle" style="color:#D97706;"></i> Alertas de stock bajo</div>
        <div class="panel-body" id="stockBajoList"></div>
      </div>
      <!-- Últimas ventas -->
      <div class="panel">
        <div class="panel-header"><i class="fas fa-receipt" style="color:#2563EB;"></i> Últimas 5 ventas</div>
        <div class="panel-body" id="ultimasVentasList"></div>
      </div>
    </div>
  `;

  // Renderizar stock bajo
  const stockEl = container.querySelector('#stockBajoList');
  if (stockBajo.length === 0) {
    stockEl.innerHTML = `<div class="empty-state"><i class="fas fa-check-circle" style="color:#16A34A;"></i><p>Sin alertas de stock</p></div>`;
  } else {
    stockEl.innerHTML = stockBajo.map(p => {
      const agotado = p.stock_actual === 0;
      return `
        <div class="panel-row">
          <div>
            <div style="font-weight:500;">${p.nombre}</div>
            <div style="font-size:0.75rem;color:#64748B;">${p.categoria || p.categoria_id?.nombre || '—'}</div>
          </div>
          <span class="badge ${agotado ? 'badge-danger' : 'badge-warning'}">
            ${agotado ? '<i class="fas fa-times-circle"></i> Agotado' : `<i class="fas fa-exclamation-triangle"></i> Stock: ${p.stock_actual}`}
          </span>
        </div>
      `;
    }).join('');
  }

  // Renderizar últimas ventas
  const ventasEl = container.querySelector('#ultimasVentasList');
  if (ultimasVentas.length === 0) {
    ventasEl.innerHTML = `<div class="empty-state"><i class="fas fa-shopping-cart"></i><p>Sin ventas registradas hoy</p></div>`;
  } else {
    ventasEl.innerHTML = ultimasVentas.map(v => `
      <div class="panel-row">
        <div>
          <div style="font-weight:500;">${v.numero_venta || '—'}</div>
          <div style="font-size:0.75rem;color:#64748B;">${v.cliente_id?.nombre ? `${v.cliente_id.nombre} ${v.cliente_id.apellido_paterno || ''}`.trim() : 'Público general'} · ${new Date(v.fecha_venta).toLocaleDateString('es-PE')}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-weight:600;">S/ ${Number(v.total).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</div>
          <span class="metodo-badge">${v.metodo_pago}</span>
        </div>
      </div>
    `).join('');
  }
}
