/**
 * ticket.js — Generador de ticket de venta en SVG
 * Formato 80mm (300px ancho). Alto dinámico según ítems.
 * y siempre apunta a la BASELINE del texto. Cada bloque
 * avanza: fontSize + gap para evitar solapamientos.
 */

const W    = 300;
const PAD  = 18;
const FONT = 'monospace';

function txt(x, y, content, opts = {}) {
  const { size = 10, weight = 'normal', anchor = 'start', color = '#111' } = opts;
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}" fill="${color}">${escXml(content)}</text>`;
}

function hline(y, opts = {}) {
  const { dash = '', opacity = 0.25 } = opts;
  return `<line x1="${PAD}" y1="${y}" x2="${W - PAD}" y2="${y}" stroke="#000" stroke-width="0.7" stroke-dasharray="${dash}" opacity="${opacity}"/>`;
}

function escXml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function money(n) {
  return 'S/ ' + Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 });
}

function wrapText(text, maxChars) {
  const words = String(text).split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w;
    if (test.length <= maxChars) { cur = test; }
    else { if (cur) lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [''];
}

// Avance seguro: tamaño de fuente + espacio entre líneas
function lh(size, gap = 5) { return size + gap; }

export function generarTicketSVG(venta, config = {}) {
  const {
    ruc            = '',
    direccion      = '',
    telefono       = '',
    terminos       = 'No se aceptan devoluciones de dinero. Cualquier reclamo debe realizarse dentro de las 24 horas de la compra.',
    mensaje_ticket = '¡Gracias por su compra!',
  } = config;

  const items    = venta.detalles || venta.items || [];
  const cliente  = venta.cliente_id || venta.cliente || null;
  const vendedor = venta.vendedor_id?.nombre_completo
                || venta.vendedor_id?.usuario
                || venta.vendedor || '';
  const fecha    = new Date(venta.fecha_venta || Date.now())
    .toLocaleString('es-PE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  const el = [];   // elementos SVG
  let y = PAD;     // cursor vertical (baseline del próximo texto)

  // ── LOGO ──────────────────────────────────────────────────────────────────
  const logoH = 64;
  const logoW = 140;
  el.push(`<image href="/img/logoparatiket.svg" x="${(W - logoW) / 2}" y="${y}" width="${logoW}" height="${logoH}" />`);
  y += logoH + 10;

  // ── INFO TIENDA ────────────────────────────────────────────────────────────
  if (ruc) {
    el.push(txt(W / 2, y, `RUC: ${ruc}`, { size: 9, anchor: 'middle', color: '#444' }));
    y += lh(9);
  }
  if (direccion) {
    const dLines = wrapText(direccion, 36);
    for (const dl of dLines) {
      el.push(txt(W / 2, y, dl, { size: 9, anchor: 'middle', color: '#444' }));
      y += lh(9);
    }
  }
  if (telefono) {
    el.push(txt(W / 2, y, `Tel: ${telefono}`, { size: 9, anchor: 'middle', color: '#444' }));
    y += lh(9);
  }

  // ── SEPARADOR ─────────────────────────────────────────────────────────────
  y += 6;
  el.push(hline(y, { opacity: 0.3 }));
  y += 12;

  // ── DATOS VENTA ───────────────────────────────────────────────────────────
  el.push(txt(PAD, y, `N°: ${venta.numero_venta || '—'}`, { size: 10, weight: 'bold' }));
  y += lh(10, 6);

  el.push(txt(PAD, y, `Fecha: ${fecha}`, { size: 9, color: '#333' }));
  y += lh(9, 5);

  if (vendedor) {
    el.push(txt(PAD, y, `Vendedor: ${vendedor}`, { size: 9, color: '#333' }));
    y += lh(9, 5);
  }

  if (cliente) {
    const nc = [cliente.nombre, cliente.apellido_paterno].filter(Boolean).join(' ') || cliente.dni || '';
    if (nc) {
      el.push(txt(PAD, y, `Cliente: ${nc}`, { size: 9, color: '#333' }));
      y += lh(9, 5);
    }
    if (cliente.dni) {
      el.push(txt(PAD, y, `DNI: ${cliente.dni}`, { size: 9, color: '#333' }));
      y += lh(9, 5);
    }
  }

  // ── SEPARADOR ─────────────────────────────────────────────────────────────
  y += 4;
  el.push(hline(y, { opacity: 0.3 }));
  y += 12;

  // ── CABECERA ÍTEMS ────────────────────────────────────────────────────────
  el.push(txt(PAD,      y, 'PRODUCTO', { size: 8, weight: 'bold', color: '#555' }));
  el.push(txt(W - PAD,  y, 'TOTAL',   { size: 8, weight: 'bold', anchor: 'end', color: '#555' }));
  y += 5;
  el.push(hline(y, { dash: '2,2', opacity: 0.2 }));
  y += 12;

  // ── ÍTEMS ─────────────────────────────────────────────────────────────────
  for (const item of items) {
    // Nombre: puede venir de distintas estructuras
    const nombre = item.nombre
                || item.producto_id?.nombre
                || item.producto?.nombre
                || item.producto
                || '—';
    const cant     = item.cantidad || 1;
    const precio   = item.precio_unitario ?? item.precio_venta ?? item.producto_id?.precio_venta ?? 0;
    const subtotal = item.subtotal ?? (precio * cant);

    // Nombre (máx 26 chars en una línea)
    const nombreCorto = String(nombre).length > 26
      ? String(nombre).substring(0, 24) + '…'
      : String(nombre);

    el.push(txt(PAD,     y, nombreCorto,    { size: 10 }));
    el.push(txt(W - PAD, y, money(subtotal), { size: 10, anchor: 'end' }));
    y += lh(10, 4);

    el.push(txt(PAD + 6, y, `x${cant}  @${money(precio)}`, { size: 8, color: '#666' }));
    y += lh(8, 8);
  }

  // ── SEPARADOR ─────────────────────────────────────────────────────────────
  y += 2;
  el.push(hline(y, { opacity: 0.3 }));
  y += 14;

  // ── TOTALES ───────────────────────────────────────────────────────────────
  el.push(txt(PAD,     y, 'Subtotal:',          { size: 10 }));
  el.push(txt(W - PAD, y, money(venta.subtotal), { size: 10, anchor: 'end' }));
  y += lh(10, 6);

  if ((venta.descuento_total || 0) > 0) {
    el.push(txt(PAD,     y, 'Descuento:',                        { size: 10 }));
    el.push(txt(W - PAD, y, `- ${money(venta.descuento_total)}`, { size: 10, anchor: 'end', color: '#c00' }));
    y += lh(10, 6);
  }

  // Línea antes del total
  el.push(hline(y, { opacity: 0.2 }));
  y += 12;

  el.push(txt(PAD,     y, 'TOTAL:',          { size: 12, weight: 'bold' }));
  el.push(txt(W - PAD, y, money(venta.total), { size: 12, weight: 'bold', anchor: 'end' }));
  y += lh(12, 8);

  // Método de pago
  const metodo = (venta.metodo_pago || '').charAt(0).toUpperCase() + (venta.metodo_pago || '').slice(1);
  el.push(txt(PAD, y, `Método: ${metodo}`, { size: 9, color: '#444' }));
  y += lh(9, 6);

  if (venta.metodo_pago === 'efectivo' && venta.monto_recibido != null) {
    el.push(txt(PAD,     y, 'Recibido:',              { size: 9 }));
    el.push(txt(W - PAD, y, money(venta.monto_recibido), { size: 9, anchor: 'end' }));
    y += lh(9, 6);

    el.push(txt(PAD,     y, 'Vuelto:',             { size: 9 }));
    el.push(txt(W - PAD, y, money(venta.vuelto || 0), { size: 9, anchor: 'end', color: '#16A34A' }));
    y += lh(9, 6);
  }

  // ── SEPARADOR ─────────────────────────────────────────────────────────────
  y += 4;
  el.push(hline(y, { opacity: 0.3 }));
  y += 16;

  // ── MENSAJE CIERRE ────────────────────────────────────────────────────────
  el.push(txt(W / 2, y, mensaje_ticket, { size: 11, weight: 'bold', anchor: 'middle' }));
  y += lh(11, 10);

  // ── TÉRMINOS ──────────────────────────────────────────────────────────────
  el.push(hline(y - 4, { dash: '2,2', opacity: 0.15 }));
  const tLines = wrapText(terminos, 38);
  for (const tl of tLines) {
    el.push(txt(W / 2, y, tl, { size: 8, anchor: 'middle', color: '#777' }));
    y += lh(8, 5);
  }

  y += PAD;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${y}" viewBox="0 0 ${W} ${y}">
  <rect width="${W}" height="${y}" fill="#fff"/>
  ${el.join('\n  ')}
</svg>`;
}

// ── Modal ─────────────────────────────────────────────────────────────────────

export function mostrarModalTicket(svgContent, numeroVenta) {
  document.getElementById('ticketModal')?.remove();

  const modal = document.createElement('div');
  modal.id = 'ticketModal';
  modal.style.cssText = `position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;padding:1rem;`;

  modal.innerHTML = `
    <div style="background:#fff;border-radius:14px;max-width:380px;width:100%;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:1rem 1.25rem;border-bottom:1px solid #E2E8F0;flex-shrink:0;">
        <span style="font-weight:700;font-size:1rem;">
          <i class="fas fa-receipt" style="margin-right:0.5rem;color:#16A34A;"></i>Ticket ${String(numeroVenta || '').replace(/&/g,'&amp;')}
        </span>
        <div style="display:flex;gap:0.5rem;">
          <button id="btnImprimirTicket" style="display:inline-flex;align-items:center;gap:0.375rem;padding:0.4rem 0.875rem;background:#0a0a0a;color:#fff;border:none;border-radius:7px;font-size:0.8125rem;font-weight:600;cursor:pointer;">
            <i class="fas fa-print"></i> Imprimir
          </button>
          <button id="btnCerrarTicket" style="background:none;border:none;font-size:1.25rem;cursor:pointer;color:#64748B;padding:0.25rem 0.5rem;">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
      <div style="overflow-y:auto;padding:1rem;display:flex;justify-content:center;background:#f1f5f9;">
        ${svgContent}
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const cerrar = () => modal.remove();
  modal.querySelector('#btnCerrarTicket').addEventListener('click', cerrar);
  modal.addEventListener('click', e => { if (e.target === modal) cerrar(); });
  document.addEventListener('keydown', function esc(e) {
    if (e.key === 'Escape') { cerrar(); document.removeEventListener('keydown', esc); }
  });

  modal.querySelector('#btnImprimirTicket').addEventListener('click', () => imprimirTicket(svgContent, numeroVenta));
}

function imprimirTicket(svgContent, numeroVenta) {
  const win = window.open('', '_blank', 'width=420,height=750');
  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Ticket ${numeroVenta || ''}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:#fff; display:flex; justify-content:center; padding:6px; }
    svg { display:block; }
    @media print {
      body { padding:0; }
      @page { margin:3mm; size:80mm auto; }
    }
  </style>
</head>
<body>
  ${svgContent}
  <script>window.onload=function(){setTimeout(function(){window.print();window.close();},300);};<\/script>
</body>
</html>`);
  win.document.close();
}
