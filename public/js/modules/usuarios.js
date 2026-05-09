/**
 * usuarios.js — Módulo de gestión de usuarios
 * Solo accesible para admin.
 */

import { api } from '../api.js';

let _usuarios = [];

export async function init(container, user) {
  if (!user || user.rol !== 'admin') {
    container.innerHTML = `<div style="text-align:center;padding:3rem;color:#64748B;"><i class="fas fa-lock" style="font-size:2.5rem;margin-bottom:1rem;display:block;opacity:0.35;"></i><p>Acceso restringido a administradores.</p></div>`;
    return;
  }

  container.innerHTML = `
    <style>
      .usr-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:1.25rem; flex-wrap:wrap; gap:0.75rem; }
      .btn-primary { display:inline-flex; align-items:center; gap:0.5rem; padding:0.5rem 1rem; background:#2563EB; color:#fff; border:none; border-radius:8px; font-size:0.875rem; font-weight:600; cursor:pointer; }
      .btn-primary:hover { background:#1D4ED8; }
      .btn-secondary { display:inline-flex; align-items:center; gap:0.5rem; padding:0.5rem 1rem; background:#F1F5F9; color:#1E293B; border:1px solid #E2E8F0; border-radius:8px; font-size:0.875rem; font-weight:500; cursor:pointer; }
      .btn-danger { display:inline-flex; align-items:center; gap:0.5rem; padding:0.4rem 0.75rem; background:#FEE2E2; color:#DC2626; border:none; border-radius:6px; font-size:0.8125rem; font-weight:500; cursor:pointer; }
      .btn-edit { display:inline-flex; align-items:center; gap:0.5rem; padding:0.4rem 0.75rem; background:#EFF6FF; color:#2563EB; border:none; border-radius:6px; font-size:0.8125rem; font-weight:500; cursor:pointer; }
      .table-wrap { background:#fff; border-radius:12px; border:1px solid #E2E8F0; overflow:auto; }
      table { width:100%; border-collapse:collapse; font-size:0.875rem; }
      th { padding:0.75rem 1rem; text-align:left; font-size:0.75rem; font-weight:600; text-transform:uppercase; color:#64748B; border-bottom:1px solid #E2E8F0; }
      td { padding:0.75rem 1rem; border-bottom:1px solid #F1F5F9; vertical-align:middle; }
      tr:last-child td { border-bottom:none; }
      tr:hover td { background:#F8FAFC; }
      .badge { display:inline-flex; align-items:center; gap:0.25rem; padding:0.2rem 0.6rem; border-radius:999px; font-size:0.75rem; font-weight:600; }
      .badge-ok { background:#DCFCE7; color:#16A34A; }
      .badge-muted { background:#F1F5F9; color:#64748B; }
      .rol-badge { padding:0.2rem 0.6rem; border-radius:6px; font-size:0.75rem; font-weight:600; text-transform:capitalize; }
      .rol-admin { background:#EFF6FF; color:#2563EB; }
      .rol-vendedor { background:#F0FDF4; color:#16A34A; }
      .rol-almacen { background:#FEF3C7; color:#D97706; }
      .empty-state { text-align:center; padding:3rem; color:#64748B; }
      .empty-state i { font-size:2.5rem; margin-bottom:1rem; display:block; opacity:0.35; }
      .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.45); z-index:1000; display:flex; align-items:center; justify-content:center; padding:1rem; }
      .modal { background:#fff; border-radius:14px; width:100%; max-width:480px; max-height:90vh; overflow-y:auto; box-shadow:0 20px 60px rgba(0,0,0,0.2); animation:slideUp 0.2s ease; }
      @keyframes slideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
      .modal-header { display:flex; align-items:center; justify-content:space-between; padding:1.25rem 1.5rem; border-bottom:1px solid #E2E8F0; }
      .modal-header h2 { font-size:1.125rem; font-weight:700; }
      .modal-body { padding:1.5rem; display:flex; flex-direction:column; gap:1rem; }
      .modal-footer { display:flex; justify-content:flex-end; gap:0.75rem; padding:1rem 1.5rem; border-top:1px solid #E2E8F0; }
      .form-group { display:flex; flex-direction:column; gap:0.375rem; }
      .form-group label { font-size:0.8125rem; font-weight:600; color:#374151; }
      .form-group input, .form-group select { padding:0.5rem 0.75rem; border:1px solid #E2E8F0; border-radius:8px; font-size:0.875rem; color:#1E293B; outline:none; }
      .form-group input:focus, .form-group select:focus { border-color:#2563EB; }
      .form-row { display:grid; grid-template-columns:1fr 1fr; gap:1rem; }
      .btn-close { background:none; border:none; font-size:1.25rem; cursor:pointer; color:#64748B; }
      .toggle-btn { display:inline-flex; align-items:center; gap:0.375rem; padding:0.35rem 0.75rem; border-radius:6px; font-size:0.8125rem; font-weight:500; cursor:pointer; border:none; }
      .toggle-on { background:#DCFCE7; color:#16A34A; }
      .toggle-off { background:#FEF3C7; color:#D97706; }
    </style>

    <div class="usr-header">
      <h2 style="font-size:1rem;font-weight:600;">Gestión de Usuarios</h2>
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
    <div id="modalContainer"></div>
  `;

  await cargarUsuarios(container, user);
  container.querySelector('#btnNuevoUsr').addEventListener('click', () => abrirModal(container, null, user));
}

async function cargarUsuarios(container, user) {
  const tbody = container.querySelector('#usrTbody');
  tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2rem;color:#94A3B8;"><i class="fas fa-spinner fa-spin"></i></td></tr>`;
  const res = await api.get('/usuarios');
  _usuarios = res.ok ? (res.data.usuarios || res.data || []) : [];

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
        <td data-label="Nombre" style="font-weight:500;">${u.nombre_completo}</td>
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
          <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
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
              <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;padding:0.75rem;font-size:0.8125rem;color:#1E40AF;">
                <i class="fas fa-info-circle" style="margin-right:0.375rem;"></i>
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
      <div class="modal" style="max-width:400px;">
        <div class="modal-header">
          <h2>Eliminar Usuario</h2>
          <button class="btn-close" id="btnCerrarDel"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
          <p>¿Eliminar al usuario <strong>${u.nombre_completo}</strong>? Esta acción no se puede deshacer.</p>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" id="btnCancelarDel">Cancelar</button>
          <button class="btn-danger" id="btnConfirmarDel" style="padding:0.5rem 1rem;"><i class="fas fa-trash"></i> Eliminar</button>
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
      <div class="modal" style="max-width:500px;">
        <div class="modal-header" style="background:#FEF3C7;border-bottom-color:#FDE68A;">
          <h2><i class="fas fa-exclamation-triangle" style="color:#D97706;margin-right:0.5rem;"></i>Email no enviado</h2>
          <button class="btn-close" id="btnCerrarCred"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
          <div style="background:#FEF3C7;border:1px solid #FDE68A;border-radius:8px;padding:1rem;margin-bottom:1rem;">
            <p style="margin:0;font-size:0.875rem;color:#92400E;">
              <strong>⚠️ No se pudo enviar el email automáticamente.</strong><br>
              Proporciona estas credenciales manualmente al usuario.
            </p>
          </div>
          <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:1rem;">
            <p style="margin:0 0 0.75rem;font-weight:600;color:#1E293B;">Credenciales de acceso:</p>
            <div style="display:flex;flex-direction:column;gap:0.5rem;">
              <div>
                <span style="font-size:0.75rem;color:#64748B;text-transform:uppercase;font-weight:600;">Usuario:</span>
                <div style="background:#fff;border:1px solid #E2E8F0;border-radius:6px;padding:0.5rem;margin-top:0.25rem;font-family:monospace;font-weight:600;color:#0F172A;">
                  ${usuarioData.usuario}
                </div>
              </div>
              <div>
                <span style="font-size:0.75rem;color:#64748B;text-transform:uppercase;font-weight:600;">Contraseña temporal:</span>
                <div style="background:#FEF3C7;border:1px solid #FDE68A;border-radius:6px;padding:0.5rem;margin-top:0.25rem;font-family:monospace;font-weight:600;color:#D97706;">
                  ${usuarioData.clave_temporal}
                </div>
              </div>
            </div>
          </div>
          ${usuarioData.error_email ? `
            <div style="margin-top:1rem;font-size:0.8125rem;color:#64748B;">
              <strong>Error:</strong> ${usuarioData.error_email}
            </div>
          ` : ''}
        </div>
        <div class="modal-footer">
          <button class="btn-primary" id="btnCopiar" style="flex:1;">
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
