// Kontrak endpoint admin backend Rust (lihat frontend/README.md).
// Endpoint admin wajib header Authorization: Bearer <token>, kecuali login.

import { request } from './api';
import { getToken } from './session';

export interface AdminSummary {
  /** Total nominal pembayaran lunas hari ini (Rupiah) */
  today_amount: number;
  today_count: number;
  /** Total nominal semua pembayaran lunas */
  total_amount: number;
}

export interface LoginResult {
  token: string;
  expires_at: string;
}

function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** POST /admin/login */
export function login(username: string, password: string): Promise<LoginResult> {
  return request<LoginResult>('/admin/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

/** GET /admin/summary */
export function getAdminSummary(): Promise<AdminSummary> {
  return request<AdminSummary>('/admin/summary', { headers: authHeaders() });
}
