/**
 * Shared HTTP client for material-search API calls.
 *
 * Configuration (set in .env.local):
 *   VITE_API_BASE_URL  – Base URL of the backend, e.g. http://localhost:8080
 *
 * Usage:
 *   import { apiClient } from './apiClient';
 *   const data = await apiClient.get<MyType>('/api/materials/fields');
 *   const result = await apiClient.post<MyResult>('/api/materials/search', body);
 */

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';

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
// Internal helper
// ---------------------------------------------------------------------------

async function request<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  const url = `${BASE_URL}${path}`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    // TODO: add auth headers here when needed, e.g.:
    // Authorization: `Bearer ${getToken()}`,
  };

  const init: RequestInit = {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  };

  const response = await fetch(url, init);

  if (!response.ok) {
    let responseBody: unknown;
    try {
      responseBody = await response.json();
    } catch {
      responseBody = await response.text().catch(() => null);
    }
    throw new ApiError(response.status, response.statusText, responseBody);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Public client
// ---------------------------------------------------------------------------

export const apiClient = {
  /**
   * HTTP GET request.
   * @param path - API path relative to VITE_API_BASE_URL (e.g. '/api/materials/fields')
   */
  get<T>(path: string): Promise<T> {
    return request<T>('GET', path);
  },

  /**
   * HTTP POST request.
   * @param path - API path relative to VITE_API_BASE_URL
   * @param body - Request body (will be JSON-serialised)
   */
  post<T>(path: string, body: unknown): Promise<T> {
    return request<T>('POST', path, body);
  },
};
