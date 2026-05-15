# 🐼 Pandas Mascota - Guía de Uso

## Archivos Disponibles

### 1. **panda-lado-izquierdo.svg** ✅ (Actualmente en uso)
- **Ubicación**: `public/img/panda-lado-izquierdo.svg`
- **Uso**: Modal de "Nuevo Producto"
- **Posición**: Lado izquierdo del modal
- **Características**: Panda mirando hacia la derecha (hacia el formulario)
- **Animación**: Movimiento suave de lado a lado

### 2. **panda-feliz.svg**
- **Ubicación**: `public/img/panda-feliz.svg`
- **Descripción**: Panda feliz mirando al frente con sonrisa
- **Uso sugerido**: Mensajes de éxito, confirmaciones

### 3. **panda-saludando.svg**
- **Ubicación**: `public/img/panda-saludando.svg`
- **Descripción**: Panda saludando con la patita levantada
- **Uso sugerido**: Página de bienvenida, login, registro

### 4. **panda-pensando.svg**
- **Ubicación**: `public/img/panda-pensando.svg`
- **Descripción**: Panda con patita en la cara pensando
- **Uso sugerido**: Páginas de carga, procesamiento, búsqueda

## Implementación Actual

El panda está integrado en el modal de productos (`public/js/modules/productos.js`):

```javascript
<!-- Panda mascota al lado izquierdo -->
<div style="position: absolute; left: -120px; top: 50%; transform: translateY(-50%); width: 120px; height: 240px; display: none;" class="panda-mascota">
  <img src="/img/panda-lado-izquierdo.svg" alt="Panda mascota" style="width: 100%; height: 100%; object-fit: contain;" />
</div>
```

## Estilos CSS

Los estilos están en `public/css/responsive.css`:

```css
.panda-mascota {
  animation: pandaWave 2s ease-in-out infinite;
}

@keyframes pandaWave {
  0%, 100% {
    transform: translateY(-50%) translateX(0);
  }
  50% {
    transform: translateY(-50%) translateX(-5px);
  }
}
```

## Responsive

- **Desktop (≥768px)**: Panda visible al lado del modal
- **Mobile (<768px)**: Panda oculto para ahorrar espacio

## Cómo Cambiar el Panda

Para usar otro panda, simplemente cambia la ruta en el `src`:

```javascript
// Cambiar de:
<img src="/img/panda-lado-izquierdo.svg" ... />

// A:
<img src="/img/panda-feliz.svg" ... />
// o
<img src="/img/panda-saludando.svg" ... />
// o
<img src="/img/panda-pensando.svg" ... />
```

## Personalización

### Cambiar tamaño:
```javascript
width: 150px;  // Más grande
height: 300px;
```

### Cambiar posición:
```javascript
left: -150px;  // Más alejado
top: 30%;      // Más arriba
```

### Cambiar animación:
```css
/* En responsive.css */
@keyframes pandaWave {
  0%, 100% { transform: translateY(-50%) rotate(0deg); }
  50% { transform: translateY(-50%) rotate(5deg); }
}
```

## Agregar Panda a Otros Modales

Para agregar el panda a otros modales, copia esta estructura:

```html
<div class="modal" style="display: flex; gap: 0; position: relative;">
  <!-- Panda -->
  <div class="panda-mascota" style="position: absolute; left: -120px; top: 50%; transform: translateY(-50%); width: 120px; height: 240px;">
    <img src="/img/panda-lado-izquierdo.svg" alt="Panda mascota" style="width: 100%; height: 100%; object-fit: contain;" />
  </div>
  
  <!-- Contenido del modal -->
  <div style="flex: 1;">
    <!-- Tu contenido aquí -->
  </div>
</div>
```

## Notas

- Los SVG son vectoriales, se ven perfectos en cualquier tamaño
- Peso muy ligero (~2-5KB cada uno)
- Sin dependencias externas
- Compatible con todos los navegadores modernos
