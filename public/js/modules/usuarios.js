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
      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Usuario</th>
            <th>Correo</th>
            <th>Rol</th>
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
  tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:#94A3B8;"><i class="fas fa-spinner fa-spin"></i></td></tr>`;
  const res = await api.get('/usuarios');
  _usuarios = res.ok ? (res.data.usuarios || res.data || []) : [];

  if (_usuarios.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><i class="fas fa-users"></i><p>No hay usuarios registrados</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = _usuarios.map(u => {
    const rolClass = u.rol === 'admin' ? 'rol-admin' : u.rol === 'vendedor' ? 'rol-vendedor' : 'rol-almacen';
    return `
      <tr>
        <td style="font-weight:500;">${u.nombre_completo}</td>
        <td>${u.usuario}</td>
        <td>${u.correo}</td>
        <td><span class="rol-badge ${rolClass}">${u.rol}</span></td>
        <td>
          <span class="badge ${u.activo ? 'badge-ok' : 'badge-muted'}">
            ${u.activo ? '● Activo' : '○ Inactivo'}
          </span>
        </td>
        <td>
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
              <div class="form-group">
                <label for="fClave">Contraseña *</label>
                <input id="fClave" name="clave" type="password" required minlength="6" />
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
      window.showToast(esEdicion ? 'Usuario actualizado' : 'Usuario creado correctamente', 'success');
      cerrar();
      await cargarUsuarios(container, user);
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
    await cargarUsuarios(container, user);
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
      await cargarUsuarios(container, user);
    } else {
      window.showToast(res.data?.error || 'Error al eliminar', 'error');
    }
  });
}
