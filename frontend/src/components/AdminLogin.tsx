import { useState } from 'react';
import { ApiError } from '../lib/api';
import { login } from '../lib/admin';
import { setToken } from '../lib/session';

/** Tujuan setelah login dari ?next=, hanya path lokal yang diterima */
function nextPath(): string {
  const next = new URLSearchParams(window.location.search).get('next');
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/admin';
}

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: { preventDefault: () => void }) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { token } = await login(username, password);
      setToken(token);
      window.location.href = nextPath();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Username atau password salah.');
      } else {
        setError('Gagal menghubungi server. Coba lagi.');
      }
      setSubmitting(false);
    }
  }

  return (
    <section className="card stack" style={{ maxWidth: 420, margin: '32px auto' }}>
      <h1>Login Admin</h1>
      <form onSubmit={handleSubmit} className="stack">
        <div>
          <label htmlFor="username">Username</label>
          <input
            id="username"
            name="username"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div className="row">
          <button type="submit" disabled={submitting}>
            {submitting ? 'Memproses…' : 'Masuk'}
          </button>
        </div>
      </form>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
