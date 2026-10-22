// Kontrak API backend Rust (lihat frontend/README.md).
// Semua endpoint berada di bawah PUBLIC_API_URL, misal http://localhost:8080/api

import { getToken } from './session';

export type PaymentStatus = 'pending' | 'paid' | 'expired';

export interface Payment {
  id: string;
  amount: number;
  qris: string;
  status: PaymentStatus;
  created_at: string;
  expires_at: string;
  paid_at: string | null;
}

export interface Transaction {
  id: number;
  payment_id: string | null;
  amount: number;
  tx_id: string;
  paid_at: string;
}

const API_BASE = (import.meta.env.PUBLIC_API_URL ?? 'http://localhost:8080/api').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(body?.message ?? `HTTP ${res.status}`, res.status);
  }
  return body as T;
}

/** GET /transactions?after_id=&limit= — transaksi lunas, urut id naik */
export function listTransactions(params: { afterId?: number; limit?: number } = {}): Promise<Transaction[]> {
  const query = new URLSearchParams();
  if (params.afterId !== undefined) query.set('after_id', String(params.afterId));
  if (params.limit !== undefined) query.set('limit', String(params.limit));
  const qs = query.toString();
  const token = getToken();
  return request<Transaction[]>(`/transactions${qs ? `?${qs}` : ''}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}
