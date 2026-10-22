import { useCallback, useEffect, useState } from 'react';
import { ApiError, listTransactions, type Transaction } from '../lib/api';
import { getAdminSummary, type AdminSummary } from '../lib/admin';
import { formatDateTime, formatRupiah } from '../lib/format';
import { clearToken, getToken, redirectToLogin } from '../lib/session';

const REFRESH_MS = 10_000;

export default function AdminDashboard() {
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, tx] = await Promise.all([getAdminSummary(), listTransactions({ limit: 100 })]);
      setSummary(s);
      // Backend mengembalikan transaksi terbaru urut naik; tampilkan terbaru di atas
      setTransactions([...tx].reverse());
      setError(null);
      setUpdatedAt(new Date());
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        // Token kedaluwarsa atau tidak valid: kembali ke halaman login
        clearToken();
        redirectToLogin();
        return;
      }
      setError(err instanceof Error ? err.message : 'Gagal memuat data dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!getToken()) {
      redirectToLogin();
      return;
    }
    void load();
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  function logout() {
    clearToken();
    redirectToLogin();
  }

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ margin: 0 }}>Admin Dashboard</h1>
          <p className="muted" style={{ margin: 0 }}>
            {updatedAt ? `Diperbarui ${formatDateTime(updatedAt.toISOString())}` : 'Memuat…'} · otomatis tiap 10 detik
          </p>
        </div>
        <div className="row">
          <button type="button" className="secondary" onClick={load} disabled={loading}>
            {loading ? 'Memuat…' : 'Muat ulang'}
          </button>
          <button type="button" className="secondary" onClick={logout}>
            Keluar
          </button>
        </div>
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="stats">
        <StatCard label="Pemasukan hari ini" value={summary ? formatRupiah(summary.today_amount) : '—'} tone="success" />
        <StatCard label="Transaksi lunas hari ini" value={summary ? String(summary.today_count) : '—'} />
        <StatCard label="Total pemasukan" value={summary ? formatRupiah(summary.total_amount) : '—'} />
      </div>

      <section className="card stack">
        <h2>Transaksi Lunas Terbaru</h2>
        {transactions.length === 0 ? (
          <p className="muted">Belum ada transaksi lunas.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th className="hide-sm">ID Transaksi</th>
                  <th className="num">Nominal</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td>{formatDateTime(tx.paid_at)}</td>
                    <td className="hide-sm muted">{tx.tx_id}</td>
                    <td className="num">{formatRupiah(tx.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone?: 'success' }) {
  const color = tone === 'success' ? 'var(--success)' : 'var(--text)';
  return (
    <div className="card stat">
      <span className="muted">{label}</span>
      <strong style={{ fontSize: '1.4rem', color }}>{value}</strong>
    </div>
  );
}
