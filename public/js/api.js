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

const _cache = new Map();
const CACHE_TTL = 60000;

export const api = {
  async get(path) {
    const cached = _cache.get(path);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
      return cached.result;
    }
    const result = await request(path, { method: 'GET', headers: buildHeaders() });
    if (result.ok) {
      _cache.set(path, { result, timestamp: Date.now() });
    }
    return result;
  },
  getCached(path) {
    const cached = _cache.get(path);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
      return cached.result;
    }
    return null;
  },
  invalidate(path) {
    _cache.delete(path);
  },
  invalidatePrefix(prefix) {
    for (const key of _cache.keys()) {
      if (key.startsWith(prefix)) _cache.delete(key);
    }
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

  // ── Polling ligero ──────────────────────────────────────────────────────
  _pollTimer: null,
  _pollCallback: null,
  _pollInterval: 30000, // 30 segundos

  startPolling(callback, interval) {
    this.stopPolling();
    if (interval) this._pollInterval = interval;
    this._pollCallback = callback;
    this._pollTimer = setInterval(() => {
      if (this._pollCallback) this._pollCallback();
    }, this._pollInterval);
  },

  stopPolling() {
    if (this._pollTimer) {
      clearInterval(this._pollTimer);
      this._pollTimer = null;
    }
    this._pollCallback = null;
  },

  async checkForUpdates(endpoint) {
    this.invalidate(endpoint);
    return this.get(endpoint);
  },
};
