/**
 * Shared HTTP client for material-search API calls.
 *
 * Configuration (set in .env.local):
 *   VITE_API_BASE_URL  – Base URL of the backend, e.g. '' (use Vite proxy) or full URL
 *
 * CSRF (SAP Gateway style):
 *   - GET may send X-CSRF-Token: Fetch so the first fields load can seed the token
 *   - POST/PUT/PATCH/DELETE attach the cached token automatically
 *   - On CSRF failure: clear token, re-fetch once, retry the original request once
 *
 * Usage:
 *   import { apiClient } from './apiClient';
 *   const data = await apiClient.get<MyType>('/api/materials/fields');
 *   const result = await apiClient.post<MyResult>('/api/materials/search', body);
 */

import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';

/** Path used only to obtain a CSRF token when none is cached yet. */
const CSRF_FETCH_PATH = '/api/materials/fields';

const MUTATING = new Set(['post', 'put', 'patch', 'delete']);

// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly body: unknown,
  ) {
    super(`API error ${status}: ${statusText}`);
    this.name = 'ApiError';
  }
}

// ---------------------------------------------------------------------------
// Axios instance
// ---------------------------------------------------------------------------

/** Optional Basic auth from env only — never hardcode credentials in source. */
const basicUser = (import.meta.env.VITE_API_BASIC_USER as string | undefined)?.trim();
const basicPass = (import.meta.env.VITE_API_BASIC_PASSWORD as string | undefined)?.trim();

const http = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  ...(basicUser && basicPass
    ? { auth: { username: basicUser, password: basicPass } }
    : {}),
  headers: {
    'Content-Type': 'application/json',
  },
});

// ---------------------------------------------------------------------------
// CSRF token cache (in-memory, single-flight)
// ---------------------------------------------------------------------------

type CsrfConfig = InternalAxiosRequestConfig & {
  /** True after one CSRF-driven retry — avoid infinite loops. */
  __csrfRetried?: boolean;
  /** Internal GET used only to fetch the token — skip mutating CSRF attach. */
  __csrfBootstrap?: boolean;
};

let csrfToken: string | null = null;
let csrfFetchPromise: Promise<string> | null = null;

function readCsrfHeader(headers: unknown): string | null {
  if (!headers || typeof headers !== 'object') return null;

  // AxiosHeaders
  if (typeof (headers as AxiosHeaders).get === 'function') {
    const v =
      (headers as AxiosHeaders).get('x-csrf-token') ??
      (headers as AxiosHeaders).get('X-CSRF-Token');
    if (v == null) return null;
    const s = String(v).trim();
    return s && s.toLowerCase() !== 'required' ? s : null;
  }

  const h = headers as Record<string, unknown>;
  for (const key of Object.keys(h)) {
    if (key.toLowerCase() === 'x-csrf-token') {
      const s = String(h[key] ?? '').trim();
      return s && s.toLowerCase() !== 'required' ? s : null;
    }
  }
  return null;
}

function setHeader(config: AxiosRequestConfig, name: string, value: string): void {
  const headers = config.headers;
  if (headers && typeof (headers as AxiosHeaders).set === 'function') {
    (headers as AxiosHeaders).set(name, value);
    return;
  }
  config.headers = AxiosHeaders.from({
    ...(headers as Record<string, string> | undefined),
    [name]: value,
  });
}

function captureCsrfFromResponse(headers: unknown): void {
  const token = readCsrfHeader(headers);
  if (token) csrfToken = token;
}

/**
 * Ensures a CSRF token is available. Concurrent callers share one in-flight GET.
 */
async function ensureCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken;

  if (!csrfFetchPromise) {
    csrfFetchPromise = (async () => {
      try {
        const res = await http.get(CSRF_FETCH_PATH, {
          headers: { 'X-CSRF-Token': 'Fetch' },
          __csrfBootstrap: true,
        } as unknown as CsrfConfig);

        captureCsrfFromResponse(res.headers);

        if (!csrfToken) {
          throw new ApiError(
            0,
            'CSRF token missing',
            'Server did not return x-csrf-token after Fetch. Check proxy/CORS and Gateway CSRF setup.',
          );
        }
        return csrfToken;
      } finally {
        csrfFetchPromise = null;
      }
    })();
  }

  return csrfFetchPromise;
}

function isMutatingMethod(method?: string): boolean {
  return MUTATING.has((method ?? 'get').toLowerCase());
}

function isCsrfFailure(err: AxiosError): boolean {
  const status = err.response?.status;
  if (status !== 403 && status !== 401) return false;

  const headerTok = readCsrfHeader(err.response?.headers);
  // SAP often echoes Required when CSRF is wrong/missing
  const rawHeader =
    err.response?.headers &&
    (typeof (err.response.headers as AxiosHeaders).get === 'function'
      ? String((err.response.headers as AxiosHeaders).get('x-csrf-token') ?? '')
      : String((err.response.headers as Record<string, string>)['x-csrf-token'] ??
          (err.response.headers as Record<string, string>)['X-CSRF-Token'] ??
          ''));

  if (rawHeader.toLowerCase() === 'required') return true;
  if (headerTok) return false; // got a real token back — not a classic CSRF reject shape

  const body = err.response?.data;
  const text = typeof body === 'string' ? body : JSON.stringify(body ?? '');
  return /csrf|xsrf|token/i.test(text) || status === 403;
}

// ---------------------------------------------------------------------------
// Interceptors
// ---------------------------------------------------------------------------

http.interceptors.request.use(async (config: CsrfConfig) => {
  const method = (config.method ?? 'get').toLowerCase();

  // Bootstrap GET: already asks for token; do not recurse into ensureCsrfToken
  if (config.__csrfBootstrap) {
    setHeader(config, 'X-CSRF-Token', 'Fetch');
    return config;
  }

  if (isMutatingMethod(method)) {
    const token = await ensureCsrfToken();
    setHeader(config, 'X-CSRF-Token', token);
    return config;
  }

  // Non-mutating: if we still have no token, ask SAP while loading fields/detail
  // so the first POST usually needs zero extra round-trips.
  if (!csrfToken && method === 'get') {
    setHeader(config, 'X-CSRF-Token', 'Fetch');
  }

  return config;
});

http.interceptors.response.use(
  (response) => {
    captureCsrfFromResponse(response.headers);
    return response;
  },
  async (error: unknown) => {
    if (!(error instanceof AxiosError) || !error.config) {
      return Promise.reject(error);
    }

    const config = error.config as CsrfConfig;

    if (config.__csrfBootstrap || config.__csrfRetried || !isCsrfFailure(error)) {
      return Promise.reject(error);
    }

    // Token expired / missing — refresh once and retry original request
    csrfToken = null;
    config.__csrfRetried = true;

    try {
      const token = await ensureCsrfToken();
      setHeader(config, 'X-CSRF-Token', token);
      return http.request(config);
    } catch (refreshErr) {
      return Promise.reject(refreshErr);
    }
  },
);

// ---------------------------------------------------------------------------
// Error mapping
// ---------------------------------------------------------------------------

function toApiError(err: unknown): never {
  if (err instanceof ApiError) throw err;
  if (err instanceof AxiosError) {
    throw new ApiError(
      err.response?.status ?? 0,
      err.response?.statusText ?? err.message,
      err.response?.data ?? null,
    );
  }
  throw err;
}

// ---------------------------------------------------------------------------
// Public client (returns unwrapped data)
// ---------------------------------------------------------------------------

export const apiClient = {
  /**
   * HTTP GET request.
   * @param path - API path relative to VITE_API_BASE_URL (e.g. '/api/materials/fields')
   */
  async get<T>(path: string): Promise<T> {
    try {
      const { data } = await http.get<T>(path);
      return data;
    } catch (err) {
      toApiError(err);
    }
  },

  /**
   * HTTP POST request. CSRF token is attached automatically.
   * @param path - API path relative to VITE_API_BASE_URL
   * @param body - Request body (will be JSON-serialised)
   */
  async post<T>(path: string, body: unknown): Promise<T> {
    try {
      const { data } = await http.post<T>(path, body);
      return data;
    } catch (err) {
      toApiError(err);
    }
  },
};
