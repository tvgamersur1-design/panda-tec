const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api'
    : `${window.location.origin}/api`;

// Fecha actual
function actualizarFecha() {
    const fecha = new Date();
    const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('currentDate').textContent = fecha.toLocaleDateString('es', opciones);
}
actualizarFecha();

// Navegación sidebar
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const section = item.dataset.section;
        
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
        
        item.classList.add('active');
        document.getElementById(section).classList.add('active');
        
        const titles = {
            dashboard: 'Dashboard',
            productos: 'Gestión de Productos',
            categorias: 'Gestión de Categorías',
            ventas: 'Nueva Venta',
            historial: 'Historial de Ventas'
        };
        document.getElementById('pageTitle').textContent = titles[section];
        
        if (section === 'dashboard') cargarDashboard();
        if (section === 'productos') cargarProductos();
        if (section === 'categorias') cargarCategorias();
        if (section === 'ventas') cargarProductosParaVenta();
        if (section === 'historial') cargarHistorialVentas();

        // Cerrar sidebar en móvil al navegar
        cerrarSidebar();
    });
});

// Toggle sidebar en móvil
document.getElementById('menuToggle').addEventListener('click', () => {
    document.querySelector('.sidebar').classList.toggle('active');
    document.getElementById('sidebarOverlay').classList.toggle('active');
});

// Cerrar sidebar al hacer clic en el overlay
document.getElementById('sidebarOverlay').addEventListener('click', () => {
    cerrarSidebar();
});

function cerrarSidebar() {
    document.querySelector('.sidebar').classList.remove('active');
    document.getElementById('sidebarOverlay').classList.remove('active');
}

// ========== DASHBOARD ==========

async function cargarDashboard() {
    try {
        const [productos, ventas] = await Promise.all([
            fetch(`${API_URL}/productos`).then(r => r.json()),
            fetch(`${API_URL}/ventas`).then(r => r.json())
        ]);
        
        // Estadísticas
        document.getElementById('totalProductos').textContent = productos.length;
        
        const totalVentas = ventas.reduce((sum, v) => sum + v.total, 0);
        document.getElementById('totalVentas').textContent = `$${totalVentas.toFixed(2)}`;
        
        const stockTotal = productos.reduce((sum, p) => sum + p.stock, 0);
        document.getElementById('stockTotal').textContent = stockTotal;
        
        document.getElementById('cantidadVentas').textContent = ventas.length;
        
        // Stock bajo
        const stockBajo = productos.filter(p => p.stock < 5);
        const stockBajoDiv = document.getElementById('stockBajo');
        
        if (stockBajo.length === 0) {
            stockBajoDiv.innerHTML = '<p style="color:#64748b;">No hay productos con stock bajo</p>';
        } else {
            stockBajoDiv.innerHTML = stockBajo.map(p => `
                <div style="display:flex; justify-content:space-between; padding:10px; background:#fee2e2; border-radius:8px; margin-bottom:10px;">
                    <span><i class="fas fa-mobile-screen"></i> ${p.nombre}</span>
                    <span style="color:#ef4444; font-weight:600;">Stock: ${p.stock}</span>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error al cargar dashboard:', error);
    }
}

// ========== PRODUCTOS ==========

let categoriaActual = 'todas';

async function cargarProductos() {
    try {
        const response = await fetch(`${API_URL}/productos`);
        const productos = await response.json();
        
        renderizarProductos(productos);
    } catch (error) {
        mostrarMensaje('Error al cargar productos', 'error');
    }
}

function renderizarProductos(productos) {
    const lista = document.getElementById('listaProductos');

    const productosFiltrados = categoriaActual === 'todas'
        ? productos
        : productos.filter(p => p.categoria === categoriaActual);

    if (productosFiltrados.length === 0) {
        lista.innerHTML = '<p style="text-align:center; color:#64748b; grid-column: 1/-1;">No hay productos en esta categoría</p>';
        return;
    }

    lista.innerHTML = productosFiltrados.map(p => {
        const categoria = categoriasDisponibles.find(c => c.nombre === p.categoria);
        const nombreCategoria = categoria ? categoria.nombreMostrar : (p.categoria || 'Sin categoría');
        const iconoCategoria = categoria ? categoria.icono : 'fa-box';
        const stockClass = p.stock < 5 ? 'bajo' : '';

        return [
            '<div class="producto-card">',
            '  <span class="categoria-badge">' + nombreCategoria + '</span>',
            '  <h3><i class="fas ' + iconoCategoria + '"></i> ' + p.nombre + '</h3>',
            '  <p>' + (p.descripcion || 'Sin descripción') + '</p>',
            '  <div class="producto-info">',
            '    <span class="precio">$' + p.precio.toFixed(2) + '</span>',
            '    <span class="stock ' + stockClass + '"><i class="fas fa-box"></i> ' + p.stock + '</span>',
            '  </div>',
            '  <div class="producto-actions">',
            '    <button class="btn btn-primary" onclick="editarProducto(' + p.id + ')"><i class="fas fa-edit"></i> Editar</button>',
            '    <button class="btn btn-danger" onclick="eliminarProducto(' + p.id + ')"><i class="fas fa-trash"></i> Eliminar</button>',
            '  </div>',
            '</div>'
        ].join('');
    }).join('');
}

function filtrarPorCategoria(categoria) {
    categoriaActual = categoria;
    
    // Actualizar botones activos
    document.querySelectorAll('.filtro-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.categoria === categoria) {
            btn.classList.add('active');
        }
    });
    
    cargarProductos();
}

function abrirModalProducto() {
    document.getElementById('modalProducto').classList.add('active');
    document.getElementById('modalTitle').innerHTML = '<i class="fas fa-mobile-screen"></i> Nuevo Producto';
    document.getElementById('productoForm').reset();
    document.getElementById('productoId').value = '';
}

function cerrarModalProducto() {
    document.getElementById('modalProducto').classList.remove('active');
    document.getElementById('productoForm').reset();
}

async function editarProducto(id) {
    try {
        const response = await fetch(`${API_URL}/productos`);
        const productos = await response.json();
        const producto = productos.find(p => p.id === id);
        
        if (producto) {
            document.getElementById('modalProducto').classList.add('active');
            document.getElementById('modalTitle').innerHTML = '<i class="fas fa-edit"></i> Editar Producto';
            document.getElementById('productoId').value = producto.id;
            document.getElementById('nombre').value = producto.nombre;
            document.getElementById('categoria').value = producto.categoria || '';
            document.getElementById('descripcion').value = producto.descripcion;
            document.getElementById('precio').value = producto.precio;
            document.getElementById('stock').value = producto.stock;
        }
    } catch (error) {
        mostrarMensaje('Error al cargar producto', 'error');
    }
}

document.getElementById('productoForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const id = document.getElementById('productoId').value;
    const data = {
        nombre: document.getElementById('nombre').value,
        categoria: document.getElementById('categoria').value,
        descripcion: document.getElementById('descripcion').value,
        precio: parseFloat(document.getElementById('precio').value),
        stock: parseInt(document.getElementById('stock').value)
    };
    
    try {
        const url = id ? `${API_URL}/productos/${id}` : `${API_URL}/productos`;
        const method = id ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            mostrarMensaje(id ? 'Producto actualizado exitosamente' : 'Producto creado exitosamente', 'exito');
            cerrarModalProducto();
            cargarProductos();
        }
    } catch (error) {
        mostrarMensaje('Error al guardar producto', 'error');
    }
});

async function eliminarProducto(id) {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return;
    
    try {
        const response = await fetch(`${API_URL}/productos/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            mostrarMensaje('Producto eliminado exitosamente', 'exito');
            cargarProductos();
        }
    } catch (error) {
        mostrarMensaje('Error al eliminar producto', 'error');
    }
}

// ========== VENTAS ==========

let carrito = [];
let productosDisponibles = [];
let categoriaVentaActual = 'todas';
let metodoPagoActual = 'efectivo';
let descuentoTipoActual = 'porcentaje';
let descuentoActivo = false;

async function cargarProductosParaVenta() {
    try {
        const response = await fetch(`${API_URL}/productos`);
        productosDisponibles = await response.json();
        
        renderizarProductosDisponibles();
        renderizarCarrito();
    } catch (error) {
        mostrarMensaje('Error al cargar productos', 'error');
    }
}

function filtrarVentaCategoria(categoria) {
    categoriaVentaActual = categoria;
    
    // Actualizar botones activos
    document.querySelectorAll('.filtro-venta-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.categoria === categoria) {
            btn.classList.add('active');
        }
    });
    
    renderizarProductosDisponibles();
}

function renderizarProductosDisponibles() {
    const container = document.getElementById('productosDisponibles');
    const busqueda = document.getElementById('buscarProducto')?.value.toLowerCase() || '';

    let productosFiltrados = productosDisponibles;

    if (categoriaVentaActual !== 'todas') {
        productosFiltrados = productosFiltrados.filter(p => p.categoria === categoriaVentaActual);
    }

    if (busqueda) {
        productosFiltrados = productosFiltrados.filter(p =>
            p.nombre.toLowerCase().includes(busqueda) ||
            p.descripcion.toLowerCase().includes(busqueda)
        );
    }

    if (productosFiltrados.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#64748b; padding:20px;">No hay productos disponibles</p>';
        return;
    }

    container.innerHTML = productosFiltrados.map(p => {
        const enCarrito = carrito.find(item => item.id === p.id);
        const stockDisponible = p.stock - (enCarrito?.cantidad || 0);
        const categoria = categoriasDisponibles.find(c => c.nombre === p.categoria);
        const iconoCategoria = categoria ? categoria.icono : 'fa-box';
        const stockClass = stockDisponible < 5 ? 'bajo' : '';
        const disabled = stockDisponible <= 0 ? 'style="opacity:0.5; cursor:not-allowed;"' : '';

        return [
            '<div class="producto-item" onclick="agregarAlCarrito(' + p.id + ')" ' + disabled + '>',
            '  <div class="producto-item-info">',
            '    <h4><i class="fas ' + iconoCategoria + '"></i> ' + p.nombre + '</h4>',
            '    <p>' + (p.descripcion || 'Sin descripción') + '</p>',
            '  </div>',
            '  <div class="producto-item-precio">',
            '    <span class="precio">$' + p.precio.toFixed(2) + '</span>',
            '    <span class="stock ' + stockClass + '"><i class="fas fa-box"></i> ' + stockDisponible + ' disponibles</span>',
            '  </div>',
            '</div>'
        ].join('');
    }).join('');
}

function agregarAlCarrito(productoId) {
    const producto = productosDisponibles.find(p => p.id === productoId);
    if (!producto) return;
    
    const itemCarrito = carrito.find(item => item.id === productoId);
    const cantidadEnCarrito = itemCarrito?.cantidad || 0;
    
    if (cantidadEnCarrito >= producto.stock) {
        mostrarMensaje('No hay más stock disponible', 'error');
        return;
    }
    
    if (itemCarrito) {
        itemCarrito.cantidad++;
    } else {
        carrito.push({
            id: producto.id,
            nombre: producto.nombre,
            precio: producto.precio,
            cantidad: 1,
            stockMax: producto.stock
        });
    }
    
    renderizarCarrito();
    renderizarProductosDisponibles();
}

function cambiarCantidad(productoId, cambio) {
    const item = carrito.find(i => i.id === productoId);
    if (!item) return;
    
    const nuevaCantidad = item.cantidad + cambio;
    
    if (nuevaCantidad <= 0) {
        eliminarDelCarrito(productoId);
        return;
    }
    
    if (nuevaCantidad > item.stockMax) {
        mostrarMensaje('No hay suficiente stock', 'error');
        return;
    }
    
    item.cantidad = nuevaCantidad;
    renderizarCarrito();
    renderizarProductosDisponibles();
}

function eliminarDelCarrito(productoId) {
    carrito = carrito.filter(item => item.id !== productoId);
    renderizarCarrito();
    renderizarProductosDisponibles();
}

function renderizarCarrito() {
    const container = document.getElementById('carritoItems');
    
    if (carrito.length === 0) {
        container.innerHTML = `
            <div class="carrito-vacio">
                <i class="fas fa-shopping-cart"></i>
                <p>El carrito está vacío</p>
                <p style="font-size:13px;">Selecciona productos para agregar</p>
            </div>
        `;
        actualizarTotales();
        return;
    }
    
    container.innerHTML = carrito.map(item => `
        <div class="carrito-item">
            <div class="carrito-item-header">
                <h4><i class="fas fa-mobile-screen"></i> ${item.nombre}</h4>
                <button class="carrito-item-remove" onclick="eliminarDelCarrito(${item.id})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="carrito-item-controls">
                <div class="cantidad-controls">
                    <button class="cantidad-btn" onclick="cambiarCantidad(${item.id}, -1)">
                        <i class="fas fa-minus"></i>
                    </button>
                    <span class="cantidad-display">${item.cantidad}</span>
                    <button class="cantidad-btn" onclick="cambiarCantidad(${item.id}, 1)" 
                            ${item.cantidad >= item.stockMax ? 'disabled' : ''}>
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
                <div class="carrito-item-subtotal">
                    $${(item.precio * item.cantidad).toFixed(2)}
                </div>
            </div>
        </div>
    `).join('');
    
    actualizarTotales();
}

function actualizarTotales() {
    const subtotal = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
    const descuento = calcularMontoDescuento(subtotal);
    const total = Math.max(0, subtotal - descuento);

    // Desktop
    const el = (id) => document.getElementById(id);
    if (el('subtotalVenta')) el('subtotalVenta').textContent = '$' + subtotal.toFixed(2);
    if (el('totalItems'))    el('totalItems').textContent    = totalItems;
    if (el('descuentoCalculado')) el('descuentoCalculado').textContent = '-$' + descuento.toFixed(2);
    if (el('totalVenta'))    el('totalVenta').textContent    = '$' + total.toFixed(2);

    // FAB móvil
    const fab = el('carritoFab');
    if (fab) {
        if (totalItems === 0) {
            fab.classList.add('oculto');
        } else {
            fab.classList.remove('oculto');
            el('carritoFabBadge').textContent = totalItems;
            el('carritoFabTotal').textContent  = '$' + total.toFixed(2);
        }
    }

    // Totales en modal móvil
    if (el('totalItemsMobile')) el('totalItemsMobile').textContent = totalItems;
    if (el('totalVentaMobile')) el('totalVentaMobile').textContent = '$' + total.toFixed(2);
}

function calcularMontoDescuento(subtotal) {
    if (!descuentoActivo) return 0;
    const valor = parseFloat(document.getElementById('descuentoValor')?.value) || 0;
    if (valor <= 0) return 0;
    
    if (descuentoTipoActual === 'porcentaje') {
        return parseFloat((subtotal * Math.min(valor, 100) / 100).toFixed(2));
    } else {
        return parseFloat(Math.min(valor, subtotal).toFixed(2));
    }
}

// ========== MÉTODO DE PAGO ==========

function seleccionarMetodoPago(metodo) {
    metodoPagoActual = metodo;
    document.querySelectorAll('.metodo-pago-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.metodo === metodo);
    });
}

// ========== DESCUENTO ==========

function toggleDescuento() {
    descuentoActivo = document.getElementById('descuentoToggle').checked;
    document.getElementById('descuentoControls').style.display = descuentoActivo ? 'block' : 'none';
    if (!descuentoActivo) {
        document.getElementById('descuentoValor').value = '';
    }
    actualizarTotales();
}

function seleccionarTipoDescuento(tipo) {
    descuentoTipoActual = tipo;
    document.querySelectorAll('.descuento-tipo-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tipo === tipo);
    });
    document.getElementById('descuentoSufijo').textContent = tipo === 'porcentaje' ? '%' : '$';
    calcularDescuento();
}

function calcularDescuento() {
    actualizarTotales();
}

function limpiarCarrito() {
    if (carrito.length === 0) return;
    abrirModalCancelar();
}

// ========== CONFIRMACIÓN DE VENTA ==========

function mostrarConfirmacion() {
    const cliente = document.getElementById('clienteVenta').value.trim();
    
    if (!cliente) {
        mostrarMensaje('Ingresa el nombre del cliente', 'error');
        document.getElementById('clienteVenta').focus();
        return;
    }
    
    if (carrito.length === 0) {
        mostrarMensaje('El carrito está vacío', 'error');
        return;
    }
    
    const subtotal = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    const descuento = calcularMontoDescuento(subtotal);
    const total = Math.max(0, subtotal - descuento);
    const nota = document.getElementById('notaVenta').value.trim();
    
    const metodosNombres = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia' };
    
    const preview = document.getElementById('ticketPreview');
    preview.innerHTML = `
        <div class="ticket-header">
            <h2><i class="fas fa-mobile-alt"></i> Panta Tec</h2>
            <p>${new Date().toLocaleString('es')}</p>
        </div>
        <div class="ticket-info">
            <div class="ticket-info-row">
                <span class="label">Cliente:</span>
                <span><strong>${cliente}</strong></span>
            </div>
            <div class="ticket-info-row">
                <span class="label">Método de Pago:</span>
                <span><i class="fas fa-${metodoPagoActual === 'efectivo' ? 'money-bill-wave' : metodoPagoActual === 'tarjeta' ? 'credit-card' : 'building-columns'}"></i> ${metodosNombres[metodoPagoActual]}</span>
            </div>
        </div>
        <div class="ticket-items">
            ${carrito.map(item => `
                <div class="ticket-item">
                    <span class="ticket-item-name">${item.nombre}</span>
                    <span class="ticket-item-qty">x${item.cantidad}</span>
                    <span class="ticket-item-price">$${(item.precio * item.cantidad).toFixed(2)}</span>
                </div>
            `).join('')}
        </div>
        <div class="ticket-totals">
            <div class="ticket-total-row">
                <span>Subtotal:</span>
                <span>$${subtotal.toFixed(2)}</span>
            </div>
            ${descuento > 0 ? `
                <div class="ticket-total-row discount">
                    <span>Descuento (${descuentoTipoActual === 'porcentaje' ? (parseFloat(document.getElementById('descuentoValor').value) || 0) + '%' : 'fijo'}):</span>
                    <span>-$${descuento.toFixed(2)}</span>
                </div>
            ` : ''}
            <div class="ticket-total-row final">
                <span>TOTAL:</span>
                <span>$${total.toFixed(2)}</span>
            </div>
        </div>
        ${nota ? `<div class="ticket-nota"><i class="fas fa-sticky-note"></i> ${nota}</div>` : ''}
    `;
    
    document.getElementById('modalConfirmacion').classList.add('active');
}

function cerrarConfirmacion() {
    document.getElementById('modalConfirmacion').classList.remove('active');
}

async function procesarVenta() {
    cerrarConfirmacion();
    
    const cliente = document.getElementById('clienteVenta').value.trim();
    const nota = document.getElementById('notaVenta').value.trim();
    const subtotal = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    const descuentoValor = descuentoActivo ? (parseFloat(document.getElementById('descuentoValor')?.value) || 0) : 0;
    
    const productosVenta = carrito.map(item => ({
        producto_id: item.id,
        cantidad: item.cantidad,
        descuento_item: 0
    }));
    
    const body = {
        cliente,
        productos: productosVenta,
        metodo_pago: metodoPagoActual,
        descuento_tipo: descuentoActivo && descuentoValor > 0 ? descuentoTipoActual : null,
        descuento_valor: descuentoActivo ? descuentoValor : 0,
        nota
    };
    
    try {
        const response = await fetch(`${API_URL}/ventas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            mostrarMensaje(`¡Venta registrada exitosamente! Total: $${data.venta.total.toFixed(2)}`, 'exito');
            
            document.getElementById('clienteVenta').value = '';
            document.getElementById('notaVenta').value = '';
            carrito = [];
            descuentoActivo = false;
            metodoPagoActual = 'efectivo';
            descuentoTipoActual = 'porcentaje';
            document.getElementById('descuentoToggle').checked = false;
            document.getElementById('descuentoControls').style.display = 'none';
            document.getElementById('descuentoValor').value = '';
            document.querySelectorAll('.metodo-pago-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.metodo === 'efectivo');
            });
            
            await cargarProductosParaVenta();
        } else {
            mostrarMensaje(data.error || 'Error al registrar venta', 'error');
        }
    } catch (error) {
        mostrarMensaje('Error al procesar la venta', 'error');
    }
}

// Búsqueda de productos
document.addEventListener('DOMContentLoaded', () => {
    const buscarInput = document.getElementById('buscarProducto');
    if (buscarInput) {
        buscarInput.addEventListener('input', renderizarProductosDisponibles);
    }
});

// ========== HISTORIAL ==========

let ventasHistorial = [];

async function cargarHistorialVentas() {
    try {
        const response = await fetch(`${API_URL}/ventas`);
        ventasHistorial = await response.json();
        renderizarHistorial(ventasHistorial);
    } catch (error) {
        mostrarMensaje('Error al cargar historial', 'error');
    }
}

function filtrarHistorial() {
    const desde = document.getElementById('filtroFechaDesde').value;
    const hasta = document.getElementById('filtroFechaHasta').value;
    const cliente = document.getElementById('filtroBuscarCliente').value.toLowerCase();
    const estado = document.getElementById('filtroEstado').value;
    const metodoPago = document.getElementById('filtroMetodoPago').value;
    
    let filtradas = [...ventasHistorial];
    
    if (desde) {
        filtradas = filtradas.filter(v => v.fecha >= desde);
    }
    if (hasta) {
        filtradas = filtradas.filter(v => v.fecha <= hasta + 'T23:59:59.999Z');
    }
    if (cliente) {
        filtradas = filtradas.filter(v => v.cliente.toLowerCase().includes(cliente));
    }
    if (estado) {
        filtradas = filtradas.filter(v => (v.estado || 'completada') === estado);
    }
    if (metodoPago) {
        filtradas = filtradas.filter(v => (v.metodo_pago || 'efectivo') === metodoPago);
    }
    
    renderizarHistorial(filtradas);
}

function limpiarFiltros() {
    document.getElementById('filtroFechaDesde').value = '';
    document.getElementById('filtroFechaHasta').value = '';
    document.getElementById('filtroBuscarCliente').value = '';
    document.getElementById('filtroEstado').value = '';
    document.getElementById('filtroMetodoPago').value = '';
    renderizarHistorial(ventasHistorial);
}

function renderizarHistorial(ventas) {
    const lista = document.getElementById('listaVentas');
    
    if (ventas.length === 0) {
        lista.innerHTML = '<p style="text-align:center; color:#64748b; padding:30px;">No hay ventas que coincidan</p>';
        return;
    }
    
    const metodosIconos = {
        efectivo: '<i class="fas fa-money-bill-wave"></i> Efectivo',
        tarjeta: '<i class="fas fa-credit-card"></i> Tarjeta',
        transferencia: '<i class="fas fa-building-columns"></i> Transferencia'
    };
    
    lista.innerHTML = ventas.map(v => {
        const estado = v.estado || 'completada';
        const metodoPago = v.metodo_pago || 'efectivo';
        const subtotal = v.subtotal || v.total;
        const descuentoTotal = v.descuento_total || 0;
        const esAnulada = estado === 'anulada';
        
        return `
            <div class="venta-card" style="${esAnulada ? 'opacity:0.7; border-left:4px solid var(--danger);' : ''}">
                <div class="venta-header">
                    <div>
                        <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                            <strong style="font-size:18px;">
                                <i class="fas fa-receipt"></i> Venta #${v.id}
                            </strong>
                            <span class="estado-badge ${estado}">
                                <i class="fas fa-${estado === 'completada' ? 'check-circle' : 'times-circle'}"></i>
                                ${estado === 'completada' ? 'Completada' : 'Anulada'}
                            </span>
                            <span class="metodo-badge">
                                ${metodosIconos[metodoPago] || metodoPago}
                            </span>
                        </div>
                        <p style="color:#64748b; font-size:14px; margin-top:8px;">
                            <i class="far fa-calendar"></i> ${new Date(v.fecha).toLocaleString('es')}
                        </p>
                        <p style="color:#1e293b; margin-top:5px;">
                            <i class="fas fa-user"></i> ${v.cliente}
                        </p>
                        ${v.nota ? `<p style="color:#92400e; font-size:13px; margin-top:4px;"><i class="fas fa-sticky-note"></i> ${v.nota}</p>` : ''}
                    </div>
                    <div style="text-align:right;">
                        <h3 style="color:${esAnulada ? 'var(--danger)' : 'var(--success)'}; font-size:28px; ${esAnulada ? 'text-decoration:line-through;' : ''}">$${v.total.toFixed(2)}</h3>
                    </div>
                </div>
                ${descuentoTotal > 0 ? `
                    <div class="venta-descuento-info">
                        <span><i class="fas fa-percent"></i> Descuento aplicado${v.descuento_tipo === 'porcentaje' ? ` (${v.descuento_valor}%)` : ' (monto fijo)'}:</span>
                        <span>-$${descuentoTotal.toFixed(2)}</span>
                    </div>
                ` : ''}
                <div class="venta-detalles">
                    <strong style="display:block; margin-bottom:10px;">
                        <i class="fas fa-list"></i> Productos:
                    </strong>
                    ${v.detalles.map(d => `
                        <div class="detalle-item">
                            <span><i class="fas fa-mobile-screen"></i> ${d.producto} x${d.cantidad}</span>
                            <span style="font-weight:600;">$${(d.cantidad * d.precio_unitario).toFixed(2)}</span>
                        </div>
                    `).join('')}
                </div>
                <div class="venta-actions">
                    <button class="btn-imprimir" onclick="imprimirVenta(${v.id})">
                        <i class="fas fa-print"></i> Imprimir
                    </button>
                    ${!esAnulada ? `
                        <button class="btn-anular" onclick="anularVenta(${v.id})">
                            <i class="fas fa-ban"></i> Anular
                        </button>
                    ` : `
                        <div class="motivo-anulacion">
                            <i class="fas fa-ban"></i>
                            <div>
                                <span class="motivo-label">Motivo de anulación:</span>
                                <span class="motivo-texto">${v.motivo_anulacion || 'Sin motivo registrado'}</span>
                            </div>
                        </div>
                    `}
                </div>
            </div>
        `;
    }).join('');
}

let ventaAAnularId = null;

function anularVenta(id) {
    // Buscar datos de la venta para mostrar en el modal
    fetch(`${API_URL}/ventas/${id}`)
        .then(r => r.json())
        .then(venta => {
            ventaAAnularId = id;

            // Llenar info de la venta en el modal
            document.getElementById('anularVentaInfo').innerHTML = [
                '<p class="venta-num"><i class="fas fa-receipt"></i> Venta #' + venta.id + '</p>',
                '<p><i class="fas fa-user" style="color:#64748b;"></i> Cliente: <strong>' + venta.cliente + '</strong></p>',
                '<p><i class="far fa-calendar" style="color:#64748b;"></i> Fecha: ' + new Date(venta.fecha).toLocaleString('es') + '</p>',
                '<p class="venta-monto">$' + venta.total.toFixed(2) + '</p>'
            ].join('');

            // Limpiar campo motivo y error
            document.getElementById('motivoAnulacion').value = '';
            document.getElementById('motivoError').style.display = 'none';

            document.getElementById('modalAnular').classList.add('active');
        })
        .catch(() => mostrarMensaje('Error al cargar la venta', 'error'));
}

function cerrarModalAnular() {
    document.getElementById('modalAnular').classList.remove('active');
    ventaAAnularId = null;
}

async function confirmarAnulacion() {
    const motivo = document.getElementById('motivoAnulacion').value.trim();

    if (!motivo) {
        document.getElementById('motivoError').style.display = 'block';
        document.getElementById('motivoAnulacion').focus();
        return;
    }

    document.getElementById('motivoError').style.display = 'none';

    try {
        const response = await fetch(`${API_URL}/ventas/${ventaAAnularId}/anular`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ motivo })
        });

        const data = await response.json();

        if (response.ok) {
            cerrarModalAnular();
            mostrarMensaje('Venta #' + ventaAAnularId + ' anulada. Stock restaurado.', 'exito');
            await cargarHistorialVentas();
        } else {
            mostrarMensaje(data.error || 'Error al anular venta', 'error');
        }
    } catch (error) {
        mostrarMensaje('Error al anular la venta', 'error');
    }
}

// Cerrar al tocar fuera
document.getElementById('modalAnular').addEventListener('click', (e) => {
    if (e.target.id === 'modalAnular') cerrarModalAnular();
});

function imprimirVenta(id) {
    const venta = ventasHistorial.find(v => v.id === id);
    if (!venta) return;
    
    const estado = venta.estado || 'completada';
    const metodoPago = venta.metodo_pago || 'efectivo';
    const subtotal = venta.subtotal || venta.total;
    const descuentoTotal = venta.descuento_total || 0;
    const metodosNombres = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia' };
    
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html><head><title>Ticket Venta #${venta.id}</title>
        <style>
            body { font-family: 'Courier New', monospace; padding: 20px; max-width: 350px; margin: 0 auto; font-size: 14px; }
            .center { text-align: center; }
            .line { border-top: 1px dashed #000; margin: 10px 0; }
            .row { display: flex; justify-content: space-between; padding: 3px 0; }
            .bold { font-weight: bold; }
            .big { font-size: 18px; }
            .anulada { color: red; text-decoration: line-through; }
        </style></head><body>
        <div class="center">
            <h2>PANTA TEC</h2>
            <p>Sistema de Ventas</p>
        </div>
        <div class="line"></div>
        <div class="row"><span>Venta #:</span><span>${venta.id}</span></div>
        <div class="row"><span>Fecha:</span><span>${new Date(venta.fecha).toLocaleString('es')}</span></div>
        <div class="row"><span>Cliente:</span><span>${venta.cliente}</span></div>
        <div class="row"><span>Pago:</span><span>${metodosNombres[metodoPago]}</span></div>
        <div class="row"><span>Estado:</span><span>${estado === 'completada' ? 'COMPLETADA' : 'ANULADA'}</span></div>
        <div class="line"></div>
        <div class="bold">PRODUCTOS:</div>
        ${venta.detalles.map(d => `
            <div class="row">
                <span>${d.producto} x${d.cantidad}</span>
                <span>$${(d.cantidad * d.precio_unitario).toFixed(2)}</span>
            </div>
        `).join('')}
        <div class="line"></div>
        <div class="row"><span>Subtotal:</span><span>$${subtotal.toFixed(2)}</span></div>
        ${descuentoTotal > 0 ? `<div class="row"><span>Descuento:</span><span>-$${descuentoTotal.toFixed(2)}</span></div>` : ''}
        <div class="line"></div>
        <div class="row bold big ${estado === 'anulada' ? 'anulada' : ''}">
            <span>TOTAL:</span><span>$${venta.total.toFixed(2)}</span>
        </div>
        ${venta.nota ? `<div class="line"></div><p>Nota: ${venta.nota}</p>` : ''}
        <div class="line"></div>
        <div class="center"><p>¡Gracias por su compra!</p></div>
        <script>window.onload = function() { window.print(); }</script>
        </body></html>
    `);
    printWindow.document.close();
}

// ========== UTILIDADES ==========

function mostrarMensaje(texto, tipo) {
    const mensaje = document.createElement('div');
    mensaje.className = `mensaje ${tipo}`;
    mensaje.innerHTML = `
        <i class="fas fa-${tipo === 'exito' ? 'check-circle' : 'exclamation-circle'}"></i>
        ${texto}
    `;
    
    const container = document.querySelector('.content-section.active');
    container.insertBefore(mensaje, container.firstChild);
    
    setTimeout(() => mensaje.remove(), 4000);
}

// Cerrar modales al hacer clic fuera
document.getElementById('modalProducto').addEventListener('click', (e) => {
    if (e.target.id === 'modalProducto') {
        cerrarModalProducto();
    }
});

document.getElementById('modalConfirmacion').addEventListener('click', (e) => {
    if (e.target.id === 'modalConfirmacion') {
        cerrarConfirmacion();
    }
});

// Cargar dashboard al inicio
cargarDashboard();


// ========== CATEGORÍAS ==========

let categoriasDisponibles = [];

async function cargarCategorias() {
    try {
        const response = await fetch(`${API_URL}/categorias`);
        categoriasDisponibles = await response.json();
        
        renderizarCategorias();
        actualizarSelectoresCategorias();
        actualizarFiltrosCategorias();
    } catch (error) {
        mostrarMensaje('Error al cargar categorías', 'error');
    }
}

function renderizarCategorias() {
    const lista = document.getElementById('listaCategorias');
    
    if (categoriasDisponibles.length === 0) {
        lista.innerHTML = '<p style="text-align:center; color:#64748b; grid-column: 1/-1;">No hay categorías registradas</p>';
        return;
    }
    
    lista.innerHTML = categoriasDisponibles.map(c => `
        <div class="categoria-card">
            <div class="categoria-card-icon">
                <i class="fas ${c.icono}"></i>
            </div>
            <h3>${c.nombreMostrar}</h3>
            <div class="categoria-card-actions">
                <button class="btn btn-primary" onclick="editarCategoria(${c.id})">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="btn btn-danger" onclick="eliminarCategoria(${c.id})">
                    <i class="fas fa-trash"></i> Eliminar
                </button>
            </div>
        </div>
    `).join('');
}

function actualizarSelectoresCategorias() {
    const select = document.getElementById('categoria');
    if (!select) return;
    
    select.innerHTML = '<option value="">Seleccionar categoría</option>' +
        categoriasDisponibles.map(c => 
            `<option value="${c.nombre}">${c.nombreMostrar}</option>`
        ).join('');
}

function actualizarFiltrosCategorias() {
    const filtrosProductos = document.getElementById('filtrosProductos');
    if (filtrosProductos) {
        filtrosProductos.innerHTML = `
            <button class="filtro-btn active" data-categoria="todas" onclick="filtrarPorCategoria('todas')">
                <i class="fas fa-th"></i> Todas
            </button>
        ` + categoriasDisponibles.map(c => `
            <button class="filtro-btn" data-categoria="${c.nombre}" onclick="filtrarPorCategoria('${c.nombre}')">
                <i class="fas ${c.icono}"></i> ${c.nombreMostrar}
            </button>
        `).join('');
    }
    
    const filtrosVenta = document.querySelector('.filtros-venta');
    if (filtrosVenta) {
        filtrosVenta.innerHTML = `
            <button class="filtro-venta-btn active" data-categoria="todas" onclick="filtrarVentaCategoria('todas')">
                Todas
            </button>
        ` + categoriasDisponibles.slice(0, 3).map(c => `
            <button class="filtro-venta-btn" data-categoria="${c.nombre}" onclick="filtrarVentaCategoria('${c.nombre}')">
                ${c.nombreMostrar}
            </button>
        `).join('');
    }
}

function abrirModalCategoria() {
    document.getElementById('modalCategoria').classList.add('active');
    document.getElementById('modalCategoriaTitle').innerHTML = '<i class="fas fa-tags"></i> Nueva Categoría';
    document.getElementById('categoriaForm').reset();
    document.getElementById('categoriaId').value = '';
    document.querySelectorAll('.icono-item').forEach(item => item.classList.remove('selected'));
    document.getElementById('iconoSeleccionado').style.display = 'none';
}

function cerrarModalCategoria() {
    document.getElementById('modalCategoria').classList.remove('active');
    document.getElementById('categoriaForm').reset();
}

// Selector de iconos
document.querySelectorAll('.icono-item').forEach(item => {
    item.addEventListener('click', () => {
        document.querySelectorAll('.icono-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        document.getElementById('categoriaIcono').value = item.dataset.icono;
        document.getElementById('iconoSeleccionado').style.display = 'block';
    });
});

document.getElementById('categoriaForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const id = document.getElementById('categoriaId').value;
    const nombre = document.getElementById('categoriaNombre').value;
    const icono = document.getElementById('categoriaIcono').value;
    
    if (!icono) {
        mostrarMensaje('Selecciona un icono', 'error');
        return;
    }
    
    const data = {
        nombre: nombre,
        nombreMostrar: nombre,
        icono: icono
    };
    
    try {
        const url = id ? `${API_URL}/categorias/${id}` : `${API_URL}/categorias`;
        const method = id ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            mostrarMensaje(id ? 'Categoría actualizada exitosamente' : 'Categoría creada exitosamente', 'exito');
            cerrarModalCategoria();
            cargarCategorias();
        } else {
            const error = await response.json();
            mostrarMensaje(error.error || 'Error al guardar categoría', 'error');
        }
    } catch (error) {
        mostrarMensaje('Error al guardar categoría', 'error');
    }
});

async function editarCategoria(id) {
    try {
        const categoria = categoriasDisponibles.find(c => c.id === id);
        
        if (categoria) {
            document.getElementById('modalCategoria').classList.add('active');
            document.getElementById('modalCategoriaTitle').innerHTML = '<i class="fas fa-edit"></i> Editar Categoría';
            document.getElementById('categoriaId').value = categoria.id;
            document.getElementById('categoriaNombre').value = categoria.nombreMostrar;
            document.getElementById('categoriaIcono').value = categoria.icono;
            
            document.querySelectorAll('.icono-item').forEach(item => {
                item.classList.remove('selected');
                if (item.dataset.icono === categoria.icono) {
                    item.classList.add('selected');
                }
            });
            
            document.getElementById('iconoSeleccionado').style.display = 'block';
        }
    } catch (error) {
        mostrarMensaje('Error al cargar categoría', 'error');
    }
}

async function eliminarCategoria(id) {
    if (!confirm('¿Estás seguro de eliminar esta categoría? Los productos asociados no se eliminarán.')) return;
    
    try {
        const response = await fetch(`${API_URL}/categorias/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            mostrarMensaje('Categoría eliminada exitosamente', 'exito');
            cargarCategorias();
        }
    } catch (error) {
        mostrarMensaje('Error al eliminar categoría', 'error');
    }
}

// Cerrar modal de categoría al hacer clic fuera
document.getElementById('modalCategoria').addEventListener('click', (e) => {
    if (e.target.id === 'modalCategoria') {
        cerrarModalCategoria();
    }
});

// Cargar categorías al inicio
cargarCategorias();

// ========== CARRITO MÓVIL ==========

let metodoPagoMobile = 'efectivo';

function abrirCarritoMobile() {
    sincronizarCarritoMobile();
    document.getElementById('modalCarritoMobile').classList.add('active');
}

function cerrarCarritoMobile() {
    document.getElementById('modalCarritoMobile').classList.remove('active');
}

function sincronizarCarritoMobile() {
    const container = document.getElementById('carritoItemsMobile');
    if (!container) return;

    if (carrito.length === 0) {
        container.innerHTML = '<div class="carrito-vacio"><i class="fas fa-shopping-cart"></i><p>El carrito está vacío</p></div>';
        return;
    }

    container.innerHTML = carrito.map(item => [
        '<div class="carrito-item">',
        '  <div class="carrito-item-header">',
        '    <h4>' + item.nombre + '</h4>',
        '    <button class="carrito-item-remove" onclick="eliminarDelCarritoMobile(' + item.id + ')"><i class="fas fa-times"></i></button>',
        '  </div>',
        '  <div class="carrito-item-controls">',
        '    <div class="cantidad-controls">',
        '      <button class="cantidad-btn" onclick="cambiarCantidadMobile(' + item.id + ', -1)"><i class="fas fa-minus"></i></button>',
        '      <span class="cantidad-display">' + item.cantidad + '</span>',
        '      <button class="cantidad-btn" onclick="cambiarCantidadMobile(' + item.id + ', 1)" ' + (item.cantidad >= item.stockMax ? 'disabled' : '') + '><i class="fas fa-plus"></i></button>',
        '    </div>',
        '    <span class="carrito-item-subtotal">$' + (item.precio * item.cantidad).toFixed(2) + '</span>',
        '  </div>',
        '</div>'
    ].join('')).join('');
}

function eliminarDelCarritoMobile(id) {
    eliminarDelCarrito(id);
    sincronizarCarritoMobile();
}

function cambiarCantidadMobile(id, cambio) {
    cambiarCantidad(id, cambio);
    sincronizarCarritoMobile();
}

function seleccionarMetodoPagoMobile(metodo) {
    metodoPagoMobile = metodo;
    document.querySelectorAll('#modalCarritoMobile .metodo-pago-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.metodo === metodo);
    });
    // Sincronizar con desktop
    seleccionarMetodoPago(metodo);
}

function limpiarCarritoMobile() {
    if (carrito.length === 0) return;
    if (confirm('¿Limpiar el carrito?')) {
        limpiarCarrito();
        sincronizarCarritoMobile();
        cerrarCarritoMobile();
    }
}

async function procesarVentaMobile() {
    // Sincronizar cliente y nota desde el modal móvil
    const clienteMobile = document.getElementById('clienteVentaMobile').value.trim();
    const notaMobile    = document.getElementById('notaVentaMobile').value.trim();

    if (clienteMobile) {
        const clienteDesktop = document.getElementById('clienteVenta');
        if (clienteDesktop) clienteDesktop.value = clienteMobile;
    }
    const notaDesktop = document.getElementById('notaVenta');
    if (notaDesktop && notaMobile) notaDesktop.value = notaMobile;

    // Sincronizar descuento móvil → desktop
    if (descuentoActivoMobile) {
        const valorMobile = document.getElementById('descuentoValorMobile').value;
        document.getElementById('descuentoToggle').checked = true;
        descuentoActivo = true;
        descuentoTipoActual = descuentoTipoMobile;
        document.getElementById('descuentoValor').value = valorMobile;
        document.getElementById('descuentoControls').style.display = 'block';
        document.querySelectorAll('#carritoDesktop .descuento-tipo-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tipo === descuentoTipoMobile);
        });
    }

    cerrarCarritoMobile();
    await procesarVenta();

    // Limpiar campos móvil
    document.getElementById('clienteVentaMobile').value = '';
    document.getElementById('notaVentaMobile').value    = '';
    document.getElementById('descuentoToggleMobile').checked = false;
    document.getElementById('descuentoControlsMobile').style.display = 'none';
    descuentoActivoMobile = false;
    descuentoTipoMobile = 'porcentaje';
}

// Cerrar modal carrito móvil al tocar fuera
document.getElementById('modalCarritoMobile').addEventListener('click', (e) => {
    if (e.target.id === 'modalCarritoMobile') cerrarCarritoMobile();
});

// ========== DESCUENTO MÓVIL ==========

let descuentoActivoMobile = false;
let descuentoTipoMobile = 'porcentaje';

function toggleDescuentoMobile() {
    descuentoActivoMobile = document.getElementById('descuentoToggleMobile').checked;
    document.getElementById('descuentoControlsMobile').style.display = descuentoActivoMobile ? 'block' : 'none';
    if (!descuentoActivoMobile) {
        document.getElementById('descuentoValorMobile').value = '';
    }
    actualizarTotalesMobile();
}

function seleccionarTipoDescuentoMobile(tipo) {
    descuentoTipoMobile = tipo;
    document.querySelectorAll('#modalCarritoMobile .descuento-tipo-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tipo === tipo);
    });
    document.getElementById('descuentoSufijoMobile').textContent = tipo === 'porcentaje' ? '%' : '$';
    actualizarTotalesMobile();
}

function calcularDescuentoMobile() {
    actualizarTotalesMobile();
}

function calcularMontoDescuentoMobile(subtotal) {
    if (!descuentoActivoMobile) return 0;
    const valor = parseFloat(document.getElementById('descuentoValorMobile')?.value) || 0;
    if (valor <= 0) return 0;
    if (descuentoTipoMobile === 'porcentaje') {
        return parseFloat((subtotal * Math.min(valor, 100) / 100).toFixed(2));
    } else {
        return parseFloat(Math.min(valor, subtotal).toFixed(2));
    }
}

function actualizarTotalesMobile() {
    const subtotal = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
    const descuento = calcularMontoDescuentoMobile(subtotal);
    const total = Math.max(0, subtotal - descuento);

    const el = (id) => document.getElementById(id);
    if (el('subtotalVentaMobile')) el('subtotalVentaMobile').textContent = '$' + subtotal.toFixed(2);
    if (el('totalItemsMobile'))    el('totalItemsMobile').textContent    = totalItems;
    if (el('descuentoCalculadoMobile')) el('descuentoCalculadoMobile').textContent = '-$' + descuento.toFixed(2);
    if (el('totalVentaMobile'))    el('totalVentaMobile').textContent    = '$' + total.toFixed(2);

    // Actualizar FAB
    const fab = el('carritoFab');
    if (fab && totalItems > 0) {
        el('carritoFabBadge').textContent = totalItems;
        el('carritoFabTotal').textContent  = '$' + total.toFixed(2);
    }
}
