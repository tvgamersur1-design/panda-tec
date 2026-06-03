import { api } from './api.js';
import { getUser, saveUser } from './auth.js';

let _fotoInput = null;
let _subiendo = false;

export function initSettings() {
  const modal = document.getElementById('settingsModal');
  const openBtn = document.getElementById('btnOpenSettings');
  const closeBtn = document.getElementById('btnCloseSettings');
  const fotoInput = document.getElementById('settingsFotoInput');
  const btnClave = document.getElementById('btnCambiarClave');
  const claveActual = document.getElementById('settingsClaveActual');
  const nuevaClave = document.getElementById('settingsNuevaClave');
  const confirmarClave = document.getElementById('settingsConfirmarClave');

  _fotoInput = fotoInput;

  openBtn.addEventListener('click', () => abrirModal(modal));
  closeBtn.addEventListener('click', () => cerrarModal(modal));
  modal.addEventListener('click', e => { if (e.target === modal) cerrarModal(modal); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal.classList.contains('open')) cerrarModal(modal); });

  fotoInput.addEventListener('change', () => subirFoto(modal));

  btnClave.addEventListener('click', async () => {
    const actual = claveActual.value.trim();
    const nueva = nuevaClave.value.trim();
    const confirma = confirmarClave.value.trim();

    if (!actual || !nueva || !confirma) {
      window.showToast('Completa todos los campos', 'warning');
      return;
    }
    if (nueva.length < 6) {
      window.showToast('La nueva contraseña debe tener al menos 6 caracteres', 'warning');
      return;
    }
    if (nueva !== confirma) {
      window.showToast('Las contraseñas nuevas no coinciden', 'error');
      return;
    }

    btnClave.disabled = true;
    btnClave.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando…';

    const res = await api.put('/auth/perfil', { clave_actual: actual, nueva_clave: nueva });

    if (res.ok) {
      window.showToast('Contraseña actualizada correctamente', 'success');
      claveActual.value = '';
      nuevaClave.value = '';
      confirmarClave.value = '';
    } else {
      window.showToast(res.data.error || 'Error al cambiar contraseña', 'error');
    }

    btnClave.disabled = false;
    btnClave.innerHTML = '<i class="fas fa-key"></i> Actualizar contraseña';
  });
}

function abrirModal(modal) {
  const user = getUser();
  if (user && user.foto) {
    const avatar = document.querySelector('#settingsAvatar');
    avatar.innerHTML = `<img src="${user.foto}" alt="Foto" />`;
  }
  modal.classList.add('open');
}

function cerrarModal(modal) {
  modal.classList.remove('open');
}

async function subirFoto(modal) {
  if (_subiendo) return;
  const file = _fotoInput.files[0];
  if (!file) return;

  if (file.size > 2 * 1024 * 1024) {
    window.showToast('La imagen no puede superar 2MB', 'warning');
    _fotoInput.value = '';
    return;
  }

  _subiendo = true;
  const formData = new FormData();
  formData.append('imagen', file);

  const res = await api.postForm('/auth/perfil/foto', formData);

  if (res.ok && res.data.foto) {
    const user = getUser();
    user.foto = res.data.foto;
    saveUser(user);

    document.querySelector('#settingsAvatar').innerHTML =
      `<img src="${res.data.foto}" alt="Foto" />`;

    const sidebarImg = document.querySelector('.sidebar-user div:first-child');
    if (sidebarImg) {
      sidebarImg.innerHTML =
        `<img src="${res.data.foto}" alt="${user.nombre_completo || ''}" />`;
    }

    window.showToast('Foto actualizada correctamente', 'success');
  } else {
    window.showToast(res.data.error || 'Error al subir foto', 'error');
  }

  _subiendo = false;
  _fotoInput.value = '';
}
