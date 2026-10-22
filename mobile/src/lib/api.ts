import { API_URL } from './config';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export interface Transaction {
  id: number;
  payment_id: string | null;
  amount: number;
  tx_id: string;
  paid_at: string;
}

export interface LoginResult {
  token: string;
  expires_at: string;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(body?.message ?? `HTTP ${res.status}`, res.status);
  }
  return body as T;
}

/** POST /admin/login */
export function login(username: string, password: string): Promise<LoginResult> {
  return request<LoginResult>('/admin/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

/** GET /transactions?after_id=&limit= — butuh token admin */
export function listTransactions(
  token: string,
  params: { afterId?: number; limit?: number } = {},
): Promise<Transaction[]> {
  const query = new URLSearchParams();
  if (params.afterId !== undefined) query.set('after_id', String(params.afterId));
  if (params.limit !== undefined) query.set('limit', String(params.limit));
  const qs = query.toString();
  return request<Transaction[]>(`/transactions${qs ? `?${qs}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}
