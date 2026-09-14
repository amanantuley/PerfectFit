/** Browser client for the FastAPI source of truth. */
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1').replace(/\/$/, '');

export type ApiUser = {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  profile_image_url?: string | null;
  role: 'customer' | 'tailor' | 'admin';
};

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers, credentials: 'include' });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(response.status, body.detail || body.error || 'Request failed');
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const authApi = {
  register: (payload: { email: string; password: string; first_name?: string; last_name?: string }) =>
    apiFetch<ApiUser>('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (email: string, password: string) =>
    apiFetch<{ access_token: string; refresh_token: string; token_type: string }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => apiFetch<ApiUser>('/auth/me'),
  logout: () => apiFetch<{ message: string }>('/auth/logout', { method: 'POST' }),
  forgotPassword: (email: string) => apiFetch<{ message: string }>('/auth/forgot-password?email=' + encodeURIComponent(email), { method: 'POST' }),
};
