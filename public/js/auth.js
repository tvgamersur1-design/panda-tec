/**
 * auth.js — Módulo de autenticación del frontend
 */

import { api } from './api.js';

const TOKEN_KEY = 'panta_token';
const USER_KEY  = 'panta_user';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser() {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function isLoggedIn() {
  return Boolean(getToken());
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  sessionStorage.clear();
  // Reemplaza la entrada del historial para que el botón atrás no regrese al dashboard
  window.location.replace('/index.html');
}

export async function login(usuario, clave) {
  const result = await api.post('/auth/login', { usuario, clave });
  if (result.ok && result.data.token) {
    localStorage.setItem(TOKEN_KEY, result.data.token);
    const user = result.data.usuario || result.data.user || null;
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
  return { ok: result.ok, data: result.data };
}
