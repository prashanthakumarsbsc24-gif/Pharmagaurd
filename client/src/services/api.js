const BASE = `${(import.meta.env.VITE_API_URL || '').replace(/\/$/, '')}/api`;
const TOKEN_KEY = 'pharmaguard.token';

export const tokenStore = {
  get: () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set: (t) => { try { localStorage.setItem(TOKEN_KEY, t); } catch { /* storage unavailable */ } },
  clear: () => { try { localStorage.removeItem(TOKEN_KEY); } catch { /* storage unavailable */ } },
};

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

async function request(path, { method = 'GET', body } = {}) {
  const token = tokenStore.get();
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Cannot reach the server. Check that the API is running.', 0);
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && token && !path.startsWith('/auth/login')) onUnauthorized();
    throw new ApiError(data?.error || `Request failed (${res.status})`, res.status);
  }
  return data;
}

export const api = {
  options: () => request('/meta/options'),
  register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload }),
  me: () => request('/auth/me'),
  updateRegion: (region) => request('/auth/me', { method: 'PATCH', body: { region } }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  batches: {
    list: () => request('/batches'),
    create: (b) => request('/batches', { method: 'POST', body: b }),
    update: (id, b) => request(`/batches/${id}`, { method: 'PUT', body: b }),
    remove: (id, reason) => request(`/batches/${id}?reason=${reason}`, { method: 'DELETE' }),
    import: (rows, filename) => request('/batches/import', { method: 'POST', body: { rows, filename } }),
  },
  audit: () => request('/audit'),
};
