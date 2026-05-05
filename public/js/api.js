/**
 * api.js — Módulo centralizado de llamadas HTTP al backend
 * Adjunta automáticamente el JWT del localStorage en cada petición.
 * Ante HTTP 401: limpia el storage y redirige a /index.html.
 */

const BASE_URL = (() => {
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:3000/api';
  }
  return `${window.location.origin}/api`;
})();

const TOKEN_KEY = 'panta_token';

function buildHeaders() {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return headers;
}

function buildFormHeaders() {
  const headers = new Headers();
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return headers;
}

async function handleResponse(response) {
  if (response.status === 401) {
    localStorage.clear();
    window.location.href = '/index.html';
    return { ok: false, data: { error: 'No autorizado' }, status: 401 };
  }
  let data;
  try { data = await response.json(); } catch { data = {}; }
  return { ok: response.ok, data, status: response.status };
}

async function request(path, options = {}) {
  try {
    const response = await fetch(`${BASE_URL}${path}`, options);
    return handleResponse(response);
  } catch {
    return { ok: false, data: { error: 'Error de red' }, status: 0 };
  }
}

export const api = {
  get(path) {
    return request(path, { method: 'GET', headers: buildHeaders() });
  },
  post(path, body) {
    return request(path, { method: 'POST', headers: buildHeaders(), body: JSON.stringify(body) });
  },
  put(path, body) {
    return request(path, { method: 'PUT', headers: buildHeaders(), body: JSON.stringify(body) });
  },
  patch(path, body) {
    return request(path, { method: 'PATCH', headers: buildHeaders(), body: JSON.stringify(body) });
  },
  delete(path) {
    return request(path, { method: 'DELETE', headers: buildHeaders() });
  },
  postForm(path, formData) {
    return request(path, { method: 'POST', headers: buildFormHeaders(), body: formData });
  },
  putForm(path, formData) {
    return request(path, { method: 'PUT', headers: buildFormHeaders(), body: formData });
  },
};
