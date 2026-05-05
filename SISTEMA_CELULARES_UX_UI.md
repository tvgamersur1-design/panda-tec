# Sistema de Gestión - Tienda de Celulares
## Documento de UX / UI

---

## 1. PRINCIPIOS DE DISEÑO

- **Velocidad sobre todo**: El POS (punto de venta) debe ser rápido. Un vendedor no puede perder tiempo buscando productos.
- **Claridad en números**: Precios, stock y totales siempre visibles y legibles.
- **Feedback inmediato**: Cada acción (venta, ajuste de stock) confirma visualmente que funcionó.
- **Mobile-friendly**: Muchas tiendas usan tablets en el mostrador.
- **Modo oscuro opcional**: Jornadas largas frente a pantalla.

---

## 2. PALETA DE COLORES

```css
:root {
  /* Primarios */
  --color-primary: #2563EB;       /* Azul principal - acciones */
  --color-primary-dark: #1D4ED8;
  --color-primary-light: #DBEAFE;

  /* Secundarios */
  --color-success: #16A34A;       /* Verde - venta completada, stock OK */
  --color-warning: #D97706;       /* Naranja - stock bajo, pendiente */
  --color-danger: #DC2626;        /* Rojo - anulado, sin stock, error */
  --color-info: #0891B2;          /* Cyan - información neutral */

  /* Neutros */
  --color-bg: #F8FAFC;
  --color-surface: #FFFFFF;
  --color-border: #E2E8F0;
  --color-text: #1E293B;
  --color-text-muted: #64748B;

  /* Sidebar */
  --sidebar-bg: #1E293B;
  --sidebar-text: #CBD5E1;
  --sidebar-active: #2563EB;
}
```

---

## 3. TIPOGRAFÍA

```css
/* Fuente principal: Inter (Google Fonts) */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;

/* Escala */
--text-xs: 0.75rem;    /* 12px - etiquetas, badges */
--text-sm: 0.875rem;   /* 14px - texto secundario */
--text-base: 1rem;     /* 16px - texto normal */
--text-lg: 1.125rem;   /* 18px - subtítulos */
--text-xl: 1.25rem;    /* 20px - títulos de sección */
--text-2xl: 1.5rem;    /* 24px - títulos de página */
--text-3xl: 1.875rem;  /* 30px - métricas del dashboard */
```

---

## 4. LAYOUT GENERAL

```
┌──────────────────────────────────────────────────────────┐
│  SIDEBAR (240px fijo)  │  CONTENIDO PRINCIPAL            │
│                        │                                  │
│  [Logo Tienda]         │  ┌─────────────────────────┐   │
│                        │  │  TOPBAR                  │   │
│  ● Dashboard           │  │  Título + Usuario + Hora │   │
│  ● Punto de Venta  ←── │  └─────────────────────────┘   │
│  ● Productos           │                                  │
│  ● Inventario          │  ┌─────────────────────────┐   │
│  ● Clientes            │  │  CONTENIDO DE LA VISTA   │   │
│  ● Proveedores         │  │                          │   │
│  ● Caja                │  │                          │   │
│  ● Reportes            │  │                          │   │
│  ─────────────         │  └─────────────────────────┘   │
│  ● Usuarios (admin)    │                                  │
│  ● Cerrar sesión       │                                  │
└──────────────────────────────────────────────────────────┘

Mobile (< 768px): Sidebar se convierte en menú hamburguesa
Tablet (768-1024px): Sidebar colapsable con íconos
Desktop (> 1024px): Sidebar siempre visible
```

---

## 5. VISTAS PRINCIPALES

### 5.1 Dashboard

```
┌─────────────────────────────────────────────────────┐
│  Buen día, [Nombre] · Martes 5 de Mayo, 2026        │
│  Caja: ABIERTA desde las 09:00 · S/ 200.00 inicial  │
└─────────────────────────────────────────────────────┘

┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ Ventas   │ │ Ingresos │ │ Productos│ │ Stock    │
│ hoy      │ │ hoy      │ │ vendidos │ │ bajo     │
│          │ │          │ │          │ │          │
│   12     │ │ S/3,450  │ │   18     │ │  3 items │
│ ventas   │ │          │ │ unidades │ │ ⚠ alerta │
└──────────┘ └──────────┘ └──────────┘ └──────────┘

┌─────────────────────────┐ ┌─────────────────────┐
│ Últimas ventas          │ │ Productos más        │
│                         │ │ vendidos (semana)    │
│ V-001 · Samsung A15     │ │                      │
│ S/599 · hace 5 min      │ │ 1. Samsung A15  x8   │
│                         │ │ 2. Xiaomi 14C   x5   │
│ V-002 · iPhone 15       │ │ 3. Redmi Note13 x4   │
│ S/3,200 · hace 12 min   │ │                      │
│                         │ │ [Ver reporte]        │
│ [Ver todas]             │ │                      │
└─────────────────────────┘ └─────────────────────┘

┌─────────────────────────────────────────────────────┐
│ Alertas de stock bajo                               │
│ ⚠ iPhone 15 Pro · Stock: 1 · Mínimo: 3             │
│ ⚠ Samsung S24 · Stock: 0 · AGOTADO                 │
└─────────────────────────────────────────────────────┘
```

---

### 5.2 Punto de Venta (POS) — Vista más importante

```
┌─────────────────────────────────────────────────────────────┐
│  PUNTO DE VENTA                          [Nueva Venta]      │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────────────┐ ┌──────────────────────────┐
│  BUSCAR PRODUCTO             │ │  CARRITO                 │
│  [🔍 Nombre, código, IMEI  ] │ │                          │
│                              │ │  Samsung A15 128GB       │
│  Resultados:                 │ │  S/599.00 × 1 = S/599.00 │
│  ┌────────────────────────┐  │ │  [−] [1] [+]  [🗑]       │
│  │ Samsung A15 128GB      │  │ │                          │
│  │ S/599 · Stock: 5       │  │ │  Xiaomi 14C              │
│  │ [+ Agregar]            │  │ │  S/450.00 × 2 = S/900.00 │
│  └────────────────────────┘  │ │  [−] [2] [+]  [🗑]       │
│  ┌────────────────────────┐  │ │                          │
│  │ Samsung A15 256GB      │  │ │  ─────────────────────── │
│  │ S/699 · Stock: 2       │  │ │  Subtotal:   S/1,499.00  │
│  │ [+ Agregar]            │  │ │  Descuento:  S/0.00      │
│  └────────────────────────┘  │ │  IGV (18%):  S/269.82    │
│                              │ │  TOTAL:      S/1,499.00  │
│  CLIENTE (opcional)          │ │                          │
│  [🔍 Buscar por DNI/nombre ] │ │  Método de pago:         │
│  Sin cliente seleccionado    │ │  [Efectivo] [Tarjeta]    │
│                              │ │  [Yape]     [Plin]       │
│                              │ │                          │
│                              │ │  Monto recibido:         │
│                              │ │  [S/ ________]           │
│                              │ │  Vuelto: S/0.00          │
│                              │ │                          │
│                              │ │  Comprobante:            │
│                              │ │  [Boleta] [Factura] [—]  │
│                              │ │                          │
│                              │ │  [    COBRAR    ]        │
└──────────────────────────────┘ └──────────────────────────┘
```

**Comportamiento UX del POS:**
- Búsqueda con debounce 300ms
- Enter en búsqueda agrega el primer resultado
- Tecla F2 = nueva venta
- Tecla F8 = cobrar
- Tecla Escape = cancelar venta
- Cálculo de vuelto en tiempo real al escribir monto recibido
- Alerta si stock insuficiente al agregar al carrito
- Confirmación modal antes de cobrar

---

### 5.3 Catálogo de Productos

```
┌─────────────────────────────────────────────────────────┐
│  PRODUCTOS                              [+ Nuevo]       │
│                                                         │
│  [🔍 Buscar...]  [Categoría ▼]  [Marca ▼]  [Estado ▼]  │
└─────────────────────────────────────────────────────────┘

Vista tabla (default):
┌──────┬──────────────────────┬──────────┬───────┬───────┬────────┐
│ Foto │ Producto             │ Código   │ Stock │ Precio│ Estado │
├──────┼──────────────────────┼──────────┼───────┼───────┼────────┤
│ [📱] │ Samsung Galaxy A15   │ CEL-001  │  5    │ S/599 │ Activo │
│      │ 128GB · Negro        │          │       │       │        │
├──────┼──────────────────────┼──────────┼───────┼───────┼────────┤
│ [📱] │ iPhone 15 Pro        │ CEL-002  │  1 ⚠ │ S/4,200│ Activo│
│      │ 256GB · Titanio      │          │       │       │        │
├──────┼──────────────────────┼──────────┼───────┼───────┼────────┤
│ [📱] │ Samsung Galaxy S24   │ CEL-003  │  0 🔴│ S/2,800│ Agotado│
└──────┴──────────────────────┴──────────┴───────┴───────┴────────┘

Vista tarjetas (toggle):
┌──────────┐ ┌──────────┐ ┌──────────┐
│  [foto]  │ │  [foto]  │ │  [foto]  │
│ Samsung  │ │ iPhone   │ │ Xiaomi   │
│ A15 128GB│ │ 15 Pro   │ │ 14C      │
│ S/599    │ │ S/4,200  │ │ S/450    │
│ Stock: 5 │ │ Stock: 1⚠│ │ Stock: 8 │
│ [Editar] │ │ [Editar] │ │ [Editar] │
└──────────┘ └──────────┘ └──────────┘
```

---

### 5.4 Inventario / Movimientos

```
┌─────────────────────────────────────────────────────────┐
│  INVENTARIO                                             │
│                                                         │
│  [+ Entrada de mercadería]  [Ajuste de stock]           │
└─────────────────────────────────────────────────────────┘

Stock actual:
┌──────────────────────┬──────────┬──────────┬──────────┐
│ Producto             │ Stock    │ Mínimo   │ Estado   │
├──────────────────────┼──────────┼──────────┼──────────┤
│ Samsung A15 128GB    │    5     │    3     │ ✅ OK    │
│ iPhone 15 Pro        │    1     │    3     │ ⚠ Bajo  │
│ Samsung S24          │    0     │    2     │ 🔴 Agot.│
└──────────────────────┴──────────┴──────────┴──────────┘

Historial de movimientos:
┌──────────┬──────────────────┬──────┬──────────┬────────┐
│ Fecha    │ Producto         │ Tipo │ Cantidad │ Ref.   │
├──────────┼──────────────────┼──────┼──────────┼────────┤
│ 05/05/26 │ Samsung A15      │ Sal. │   -1     │ V-001  │
│ 05/05/26 │ Xiaomi 14C       │ Ent. │   +10    │ Compra │
│ 04/05/26 │ iPhone 15 Pro    │ Sal. │   -2     │ V-098  │
└──────────┴──────────────────┴──────┴──────────┴────────┘
```

---

### 5.5 Modal de Entrada de Mercadería

```
┌─────────────────────────────────────────────────────┐
│  Nueva Entrada de Mercadería                    [×] │
├─────────────────────────────────────────────────────┤
│  Proveedor: [Seleccionar proveedor ▼]               │
│  Fecha:     [05/05/2026]                            │
│  Factura:   [___________]                           │
│                                                     │
│  Productos:                                         │
│  ┌──────────────────────┬──────┬──────────────────┐ │
│  │ Producto             │ Cant │ IMEIs            │ │
│  ├──────────────────────┼──────┼──────────────────┤ │
│  │ [Buscar producto...] │  10  │ [Agregar IMEIs]  │ │
│  └──────────────────────┴──────┴──────────────────┘ │
│  [+ Agregar otro producto]                          │
│                                                     │
│  Notas: [_______________________________________]   │
│                                                     │
│  [Cancelar]                    [Registrar Entrada]  │
└─────────────────────────────────────────────────────┘
```

---

### 5.6 Reportes

```
┌─────────────────────────────────────────────────────┐
│  REPORTES                                           │
│                                                     │
│  [Ventas del día]  [Ventas del mes]  [Stock]        │
└─────────────────────────────────────────────────────┘

Reporte de ventas del día:
┌─────────────────────────────────────────────────────┐
│  Fecha: [05/05/2026]  [Vendedor: Todos ▼]           │
│                                                     │
│  Total ventas:    12          Total ingresos: S/8,450│
│  Efectivo:        S/4,200     Tarjeta: S/2,800      │
│  Digital (Yape/Plin): S/1,450                       │
│                                                     │
│  ┌──────┬──────────────────┬──────────┬────────────┐ │
│  │ N°   │ Producto         │ Cantidad │ Total      │ │
│  ├──────┼──────────────────┼──────────┼────────────┤ │
│  │ V-001│ Samsung A15      │    1     │ S/599      │ │
│  │ V-002│ iPhone 15 Pro    │    1     │ S/4,200    │ │
│  └──────┴──────────────────┴──────────┴────────────┘ │
│                                                     │
│  [Exportar PDF]  [Exportar Excel]                   │
└─────────────────────────────────────────────────────┘
```

---

## 6. COMPONENTES UI REUTILIZABLES

### Badges de Estado
```
Stock OK:     [● Disponible]  → fondo verde claro, texto verde
Stock bajo:   [⚠ Stock bajo]  → fondo naranja claro, texto naranja
Agotado:      [✕ Agotado]     → fondo rojo claro, texto rojo
Venta OK:     [✓ Completada]  → fondo verde claro
Venta anulada:[✕ Anulada]     → fondo rojo claro
```

### Notificaciones Toast
```
Éxito:   [✓ Venta registrada correctamente]     → verde, 3 seg
Error:   [✕ Error al procesar la venta]         → rojo, 5 seg
Alerta:  [⚠ Stock insuficiente para este item]  → naranja, 4 seg
Info:    [ℹ Caja cerrada. Ábrela para vender]   → azul, 4 seg
```

### Tabla Responsive
- Desktop: tabla completa con todas las columnas
- Tablet: oculta columnas secundarias
- Mobile: cards apiladas en lugar de filas

### Modal Estándar
```
- Overlay oscuro con blur
- Animación slide-up al abrir
- Cerrar con Escape o clic fuera
- Botones: [Cancelar] a la izquierda, [Acción principal] a la derecha
- Acción destructiva (anular, eliminar) en rojo
```

---

## 7. FLUJOS UX CRÍTICOS

### Flujo de Venta Rápida (happy path)
```
1. Vendedor hace clic en "Punto de Venta" (o F2)
2. Escribe nombre del producto → resultados en 300ms
3. Presiona Enter o clic en [+ Agregar]
4. Repite para más productos
5. Escribe monto recibido → vuelto se calcula solo
6. Clic en [COBRAR] → modal de confirmación
7. Confirma → toast "Venta registrada" + opción de imprimir
8. Carrito se limpia automáticamente para nueva venta
```

### Flujo de Error de Stock
```
1. Vendedor intenta agregar producto sin stock
2. Botón [+ Agregar] deshabilitado + tooltip "Sin stock"
3. Si stock < cantidad solicitada → toast naranja de alerta
4. No permite proceder con la venta
```

### Flujo de Anulación de Venta
```
1. Admin busca la venta en historial
2. Clic en [Anular]
3. Modal pide motivo de anulación (campo obligatorio)
4. Confirma → venta marcada como anulada
5. Stock se restaura automáticamente
6. Toast de confirmación
```

---

## 8. ESTADOS VACÍOS (Empty States)

Cuando no hay datos, mostrar mensaje útil en lugar de tabla vacía:

```
Sin ventas hoy:
  [🛒]
  "Aún no hay ventas registradas hoy"
  "Empieza una nueva venta desde el Punto de Venta"
  [Ir al POS]

Sin productos:
  [📦]
  "No hay productos en el catálogo"
  "Agrega tu primer producto para empezar"
  [+ Agregar producto]

Sin resultados de búsqueda:
  [🔍]
  "No encontramos resultados para 'samsung x99'"
  "Intenta con otro nombre o código"
```

---

## 9. RESPONSIVE BREAKPOINTS

```css
/* Mobile first */
/* Base: < 640px → una columna, sidebar oculto */

@media (min-width: 640px) {
  /* Tablet pequeña: sidebar como overlay */
}

@media (min-width: 768px) {
  /* Tablet: sidebar colapsado con íconos */
  /* POS: layout de dos columnas */
}

@media (min-width: 1024px) {
  /* Desktop: sidebar completo siempre visible */
  /* Dashboard: 4 métricas en fila */
}

@media (min-width: 1280px) {
  /* Desktop grande: más espacio en tablas */
}
```

---

## 10. ACCESIBILIDAD

- Contraste mínimo 4.5:1 en texto normal
- Foco visible en todos los elementos interactivos
- Labels en todos los inputs
- Mensajes de error asociados al campo con `aria-describedby`
- Botones con texto descriptivo (no solo íconos)
- Tablas con `<th scope>` correcto
- Modales con `role="dialog"` y `aria-modal="true"`
- Navegación por teclado completa en el POS

---

## 11. MICROINTERACCIONES

- Botón [COBRAR]: efecto de pulso suave cuando el carrito tiene items
- Stock bajo: número parpadea suavemente en naranja
- Agregar al carrito: animación de "fly to cart"
- Carga de datos: skeleton screens en lugar de spinners
- Hover en filas de tabla: highlight sutil
- Transición de páginas: fade 150ms

---

## 12. CONSIDERACIONES PARA TABLET (MOSTRADOR)

El POS está pensado para usarse en tablet en el mostrador:
- Botones mínimo 44×44px (touch target)
- Teclado numérico grande para ingresar montos
- Búsqueda de productos con teclado virtual
- Sin hover states como única forma de acceder a acciones
- Modo pantalla completa recomendado
