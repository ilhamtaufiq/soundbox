// Token admin disimpan di localStorage browser ini saja (per-viewer).
// Semua akses dibungkus try/catch karena storage bisa diblokir atau tidak tersedia.

const TOKEN_KEY = 'admin_token';

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // storage tidak tersedia; admin harus login ulang setiap buka halaman
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // tidak ada yang perlu dibersihkan
  }
}

/** Kirim ke halaman login, lalu kembali ke halaman ini setelah login */
export function redirectToLogin(): void {
  const next = encodeURIComponent(window.location.pathname);
  window.location.href = `/admin/login?next=${next}`;
}
