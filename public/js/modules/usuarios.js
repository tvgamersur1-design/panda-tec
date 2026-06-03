/**
 * usuarios.js — Módulo de gestión de usuarios
 * Solo accesible para admin.
 */

import { api } from '../api.js';

let _usuarios = [];
let _usrPagina = 1;
let _usrTotalPaginas = 1;
let _usrTotal = 0;

export async function init(container, user) {
  if (!user || user.rol !== 'admin') {
    container.innerHTML = `<div class="usr-restricted"><i class="fas fa-lock"></i><p>Acceso restringido a administradores.</p></div>`;
    return;
  }

  container.innerHTML = `
    <div class="usr-header">
      <h2 class="usr-title">Gestión de Usuarios</h2>
      <button class="btn-primary" id="btnNuevoUsr"><i class="fas fa-plus"></i> Nuevo Usuario</button>
    </div>
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Usuario</th>
            <th>Correo</th>
            <th>Rol</th>
            <th>Google</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody id="usrTbody"></tbody>
      </table>
    </div>
    <div id="usrPaginacion" class="usr-pag"></div>
    <div id="modalContainer"></div>
  `;

  await cargarUsuarios(container, user);
  container.querySelector('#btnNuevoUsr').addEventListener('click', () => abrirModal(container, null, user));
}

async function cargarUsuarios(container, user, pagina = 1) {
  const tbody = container.querySelector('#usrTbody');
  tbody.innerHTML = `<tr><td colspan="7" class="empty-state"><i class="fas fa-spinner fa-spin"></i></td></tr>`;
  const res = await api.get(`/usuarios?page=${pagina}&limit=20`);
  if (res.ok && res.data.usuarios) {
    _usuarios = res.data.usuarios;
    _usrPagina = res.data.page || 1;
    _usrTotalPaginas = res.data.totalPages || 1;
    _usrTotal = res.data.total || 0;
  } else {
    _usuarios = res.ok ? (res.data.usuarios || res.data || []) : [];
    _usrPagina = 1;
    _usrTotalPaginas = 1;
    _usrTotal = _usuarios.length;
  }

  renderUsuarios(container, user);
}

function renderUsuarios(container, user) {
  const tbody = container.querySelector('#usrTbody');

  if (_usuarios.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><i class="fas fa-users"></i><p>No hay usuarios registrados</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = _usuarios.map(u => {
    const rolClass = u.rol === 'admin' ? 'rol-admin' : u.rol === 'vendedor' ? 'rol-vendedor' : 'rol-almacen';
    const googleVinculado = u.google_id ? true : false;
    return `
      <tr>
        <td data-label="Nombre" class="usr-name">${u.nombre_completo}</td>
        <td data-label="Usuario">${u.usuario}</td>
        <td data-label="Correo">${u.correo}</td>
        <td data-label="Rol"><span class="rol-badge ${rolClass}">${u.rol}</span></td>
        <td data-label="Google">
          <span class="badge ${googleVinculado ? 'badge-ok' : 'badge-muted'}" title="${googleVinculado ? 'Cuenta vinculada con Google' : 'No vinculada'}">
            <i class="fab fa-google"></i> ${googleVinculado ? 'Vinculado' : 'No'}
          </span>
        </td>
        <td data-label="Estado">
          <span class="badge ${u.activo ? 'badge-ok' : 'badge-muted'}">
            ${u.activo ? '● Activo' : '○ Inactivo'}
          </span>
        </td>
        <td data-label="Acciones">
          <div class="usr-actions">
            <button class="btn-edit" data-id="${u._id}" data-action="editar"><i class="fas fa-pen"></i></button>
            <button class="toggle-btn ${u.activo ? 'toggle-on' : 'toggle-off'}" data-id="${u._id}" data-action="toggle" title="${u.activo ? 'Desactivar' : 'Activar'}">
              <i class="fas fa-${u.activo ? 'toggle-on' : 'toggle-off'}"></i>
            </button>
            <button class="btn-danger" data-id="${u._id}" data-action="eliminar"><i class="fas fa-trash"></i></button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('[data-action="editar"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const u = _usuarios.find(x => x._id === btn.dataset.id);
      if (u) abrirModal(container, u, user);
    });
  });
  tbody.querySelectorAll('[data-action="toggle"]').forEach(btn => {
    btn.addEventListener('click', () => toggleEstado(container, btn.dataset.id, user));
  });
  tbody.querySelectorAll('[data-action="eliminar"]').forEach(btn => {
    btn.addEventListener('click', () => confirmarEliminar(container, btn.dataset.id, user));
  });

  // Paginación
  const pagDiv = container.querySelector('#usrPaginacion');
  if (pagDiv) {
    if (_usrTotalPaginas <= 1) {
      pagDiv.innerHTML = `<span>${_usrTotal} usuario(s)</span><span></span>`;
    } else {
      const desde = (_usrPagina - 1) * 20 + 1;
      const hasta = Math.min(_usrPagina * 20, _usrTotal);
      let botones = '';
      botones += `<button data-page="${_usrPagina - 1}" class="pag-btn-sm" ${_usrPagina <= 1 ? 'disabled' : ''}>← Ant</button>`;
      for (let i = 1; i <= _usrTotalPaginas; i++) {
        if (i === 1 || i === _usrTotalPaginas || Math.abs(i - _usrPagina) <= 1) {
          const active = i === _usrPagina;
          botones += `<button data-page="${i}" class="pag-btn-sm ${active ? 'pag-btn-sm--active' : ''}" ${active ? '' : ''}>${i}</button>`;
        } else if (Math.abs(i - _usrPagina) === 2) {
          botones += `<span class="pag-ellipsis">…</span>`;
        }
      }
      botones += `<button data-page="${_usrPagina + 1}" class="pag-btn-sm" ${_usrPagina >= _usrTotalPaginas ? 'disabled' : ''}>Sig →</button>`;
      pagDiv.innerHTML = `<span>Mostrando ${desde}-${hasta} de ${_usrTotal}</span><div class="usr-pag-btns">${botones}</div>`;
      pagDiv.querySelectorAll('[data-page]').forEach(btn => {
        btn.addEventListener('click', () => {
          const p = parseInt(btn.dataset.page);
          if (p >= 1 && p <= _usrTotalPaginas) cargarUsuarios(container, user, p);
        });
      });
    }
  }
}

function abrirModal(container, usuario = null, user) {
  const esEdicion = Boolean(usuario);
  const modalContainer = container.querySelector('#modalContainer');
  modalContainer.innerHTML = `
    <div class="modal-overlay" id="usrModal" role="dialog" aria-modal="true">
      <div class="modal">
        <div class="modal-header">
          <h2>${esEdicion ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
          <button class="btn-close" id="btnCerrar"><i class="fas fa-times"></i></button>
        </div>
        <form id="usrForm">
          <div class="modal-body">
            <div class="form-group">
              <label for="fNombreCompleto">Nombre completo *</label>
              <input id="fNombreCompleto" name="nombre_completo" type="text" required value="${usuario?.nombre_completo || ''}" />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="fUsuario">Usuario *</label>
                <input id="fUsuario" name="usuario" type="text" required value="${usuario?.usuario || ''}" />
              </div>
              <div class="form-group">
                <label for="fCorreo">Correo *</label>
                <input id="fCorreo" name="correo" type="email" required value="${usuario?.correo || ''}" />
              </div>
            </div>
            ${!esEdicion ? `
              <div class="usr-info-badge">
                <i class="fas fa-info-circle usr-info-icon"></i>
                Se generará una contraseña temporal y se enviará al correo del usuario.
              </div>
            ` : ''}
            <div class="form-group">
              <label for="fRol">Rol *</label>
              <select id="fRol" name="rol" required>
                <option value="vendedor" ${usuario?.rol === 'vendedor' ? 'selected' : ''}>Vendedor</option>
                <option value="almacen" ${usuario?.rol === 'almacen' ? 'selected' : ''}>Almacén</option>
                <option value="admin" ${usuario?.rol === 'admin' ? 'selected' : ''}>Administrador</option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn-secondary" id="btnCancelar">Cancelar</button>
            <button type="submit" class="btn-primary"><i class="fas fa-save"></i> ${esEdicion ? 'Guardar cambios' : 'Crear usuario'}</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const cerrar = () => { modalContainer.innerHTML = ''; };
  modalContainer.querySelector('#btnCerrar').addEventListener('click', cerrar);
  modalContainer.querySelector('#btnCancelar').addEventListener('click', cerrar);
  modalContainer.querySelector('#usrModal').addEventListener('click', e => { if (e.target.id === 'usrModal') cerrar(); });

  modalContainer.querySelector('#usrForm').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = Object.fromEntries(fd.entries());
    const btn = e.target.querySelector('[type=submit]');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando…';

    const res = esEdicion ? await api.put(`/usuarios/${usuario._id}`, body) : await api.post('/usuarios', body);
    if (res.ok) {
      const usuarioData = res.data._id ? res.data : (res.data.usuario || res.data);
      
      // Verificar si el email se envió correctamente
      if (!esEdicion && usuarioData.email_enviado === false && usuarioData.clave_temporal) {
        // Mostrar modal con la contraseña temporal
        cerrar();
        mostrarCredencialesManuales(container, usuarioData, user);
      } else {
        const mensaje = esEdicion 
          ? 'Usuario actualizado' 
          : usuarioData.email_enviado 
            ? 'Usuario creado. Credenciales enviadas por email.' 
            : 'Usuario creado correctamente.';
        window.showToast(mensaje, 'success');
        cerrar();
      }
      
      if (esEdicion) {
        const idx = _usuarios.findIndex(x => x._id === usuario._id);
        if (idx !== -1) _usuarios[idx] = usuarioData;
      } else {
        _usuarios.push(usuarioData);
      }
      renderUsuarios(container, user);
      api.invalidatePrefix('/usuarios');
    } else {
      window.showToast(res.data?.error || 'Error al guardar', 'error');
      btn.disabled = false;
      btn.innerHTML = `<i class="fas fa-save"></i> ${esEdicion ? 'Guardar cambios' : 'Crear usuario'}`;
    }
  });
}

async function toggleEstado(container, id, user) {
  const u = _usuarios.find(x => x._id === id);
  if (!u) return;
  const nuevoEstado = !u.activo;
  const res = await api.patch(`/usuarios/${id}/estado`, { activo: nuevoEstado });
  if (res.ok) {
    window.showToast(`Usuario ${nuevoEstado ? 'activado' : 'desactivado'}`, 'success');
    const idx = _usuarios.findIndex(x => x._id === id);
    if (idx !== -1) _usuarios[idx] = { ..._usuarios[idx], activo: nuevoEstado };
    renderUsuarios(container, user);
    api.invalidatePrefix('/usuarios');
  } else {
    window.showToast(res.data?.error || 'Error al cambiar estado', 'error');
  }
}

async function confirmarEliminar(container, id, user) {
  const u = _usuarios.find(x => x._id === id);
  if (!u) return;
  const modalContainer = container.querySelector('#modalContainer');
  modalContainer.innerHTML = `
    <div class="modal-overlay" id="delModal" role="dialog" aria-modal="true">
      <div class="modal usr-modal-max">
        <div class="modal-header">
          <h2>Eliminar Usuario</h2>
          <button class="btn-close" id="btnCerrarDel"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
          <p>¿Eliminar al usuario <strong>${u.nombre_completo}</strong>? Esta acción no se puede deshacer.</p>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" id="btnCancelarDel">Cancelar</button>
          <button class="btn-danger usr-btn-pad" id="btnConfirmarDel"><i class="fas fa-trash"></i> Eliminar</button>
        </div>
      </div>
    </div>
  `;
  const cerrar = () => { modalContainer.innerHTML = ''; };
  modalContainer.querySelector('#btnCerrarDel').addEventListener('click', cerrar);
  modalContainer.querySelector('#btnCancelarDel').addEventListener('click', cerrar);
  modalContainer.querySelector('#btnConfirmarDel').addEventListener('click', async () => {
    const res = await api.delete(`/usuarios/${id}`);
    if (res.ok) {
      window.showToast('Usuario eliminado', 'success');
      cerrar();
      _usuarios = _usuarios.filter(x => x._id !== id);
      renderUsuarios(container, user);
      api.invalidatePrefix('/usuarios');
    } else {
      window.showToast(res.data?.error || 'Error al eliminar', 'error');
    }
  });
}

function mostrarCredencialesManuales(container, usuarioData, user) {
  const modalContainer = container.querySelector('#modalContainer');
  modalContainer.innerHTML = `
    <div class="modal-overlay" id="credModal" role="dialog" aria-modal="true">
      <div class="modal usr-modal-lg">
        <div class="modal-header usr-alert-header">
          <h2><i class="fas fa-exclamation-triangle usr-alert-icon"></i>Email no enviado</h2>
          <button class="btn-close" id="btnCerrarCred"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
          <div class="usr-alert-body">
            <p class="usr-alert-text">
              <strong>⚠️ No se pudo enviar el email automáticamente.</strong><br>
              Proporciona estas credenciales manualmente al usuario.
            </p>
          </div>
          <div class="usr-cred-box">
            <p class="usr-cred-title">Credenciales de acceso:</p>
            <div class="usr-cred-col">
              <div>
                <span class="usr-cred-label">Usuario:</span>
                <div class="usr-cred-value">
                  ${usuarioData.usuario}
                </div>
              </div>
              <div>
                <span class="usr-cred-label">Contraseña temporal:</span>
                <div class="usr-cred-pass">
                  ${usuarioData.clave_temporal}
                </div>
              </div>
            </div>
          </div>
          ${usuarioData.error_email ? `
            <div class="usr-error-box">
              <strong>Error:</strong> ${usuarioData.error_email}
            </div>
          ` : ''}
        </div>
        <div class="modal-footer">
          <button class="btn-primary usr-btn-copy" id="btnCopiar">
            <i class="fas fa-copy"></i> Copiar credenciales
          </button>
          <button class="btn-secondary" id="btnCerrarCredBtn">Cerrar</button>
        </div>
      </div>
    </div>
  `;
  
  const cerrar = () => { 
    modalContainer.innerHTML = ''; 
    window.showToast('Usuario creado correctamente', 'success');
  };
  
  modalContainer.querySelector('#btnCerrarCred').addEventListener('click', cerrar);
  modalContainer.querySelector('#btnCerrarCredBtn').addEventListener('click', cerrar);
  
  modalContainer.querySelector('#btnCopiar').addEventListener('click', () => {
    const texto = `Usuario: ${usuarioData.usuario}\nContraseña temporal: ${usuarioData.clave_temporal}`;
    navigator.clipboard.writeText(texto).then(() => {
      window.showToast('Credenciales copiadas al portapapeles', 'success');
    }).catch(() => {
      window.showToast('No se pudo copiar. Copia manualmente.', 'error');
    });
  });
}
