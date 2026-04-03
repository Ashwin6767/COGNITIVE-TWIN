const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
const REQUEST_TIMEOUT_MS = 12000;
const MAX_RETRIES = 3;

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new ApiError(0, 'Request timed out. Please check your connection and try again.');
    }
    throw new ApiError(0, 'Unable to reach the server. Please check your connection and try again.');
  } finally {
    clearTimeout(timer);
  }
}

async function request(path, options = {}, retries = MAX_RETRIES) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let lastError;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetchWithTimeout(`${API_BASE}${path}`, { ...options, headers }, REQUEST_TIMEOUT_MS);

      if (res.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        throw new ApiError(401, 'Unauthorized');
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new ApiError(res.status, body.detail || 'Request failed');
      }

      return res.json();
    } catch (err) {
      lastError = err;
      // Only retry on network/timeout errors (status 0), not on HTTP errors
      if (err instanceof ApiError && err.status !== 0) throw err;
      if (attempt < retries - 1) {
        await sleep(Math.pow(2, attempt) * 1000); // 1s, 2s, 4s backoff
      }
    }
  }
  throw lastError;
}

export const api = {
  get: (path) => request(path),
  post: (path, data) => request(path, { method: 'POST', body: JSON.stringify(data) }),
  put: (path, data) => request(path, { method: 'PUT', body: JSON.stringify(data) }),
  patch: (path, data) => request(path, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (path) => request(path, { method: 'DELETE' }),
};

export { ApiError };
