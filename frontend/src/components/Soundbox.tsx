import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { ApiError, listTransactions, type Transaction } from '../lib/api';
import { formatDateTime, formatRupiah } from '../lib/format';
import { announcePayment, playChime, speak, unlockAudio } from '../lib/speech';
import { clearToken, getToken, redirectToLogin } from '../lib/session';
import '../styles/soundbox.css';

const POLL_MS = 3000;
const RECENT_COUNT = 5;
const FRESH_MS = 6000;
const COUNT_MS = 900;
const CONFETTI_COLORS = ['#22c55e', '#00aed9', '#f59e0b', '#ef4444', '#a78bfa'];

/**
 * Tampilan soundbox: memantau transaksi lunas baru, membunyikan chime dan
 * mengumumkan nominalnya. Transaksi yang sudah ada sebelum halaman dibuka
 * tidak diumumkan ulang, hanya tampil sebagai "Pembayaran terakhir".
 */
export default function Soundbox() {
  const [audioOn, setAudioOn] = useState(false);
  const [online, setOnline] = useState<boolean | null>(null);
  const [recent, setRecent] = useState<Transaction[]>([]); // terbaru di atas
  const [fresh, setFresh] = useState(false);
  const [burst, setBurst] = useState(0);

  // Ref supaya callback polling selalu membaca nilai terbaru tanpa re-subscribe
  const audioRef = useRef(false);
  // id transaksi terakhir yang sudah diproses; null = belum pernah sinkron
  const cursor = useRef<number | null>(null);
  const freshTimer = useRef<number | undefined>(undefined);

  const last = recent[0] ?? null;

  function flash() {
    setFresh(true);
    setBurst((b) => b + 1);
    window.clearTimeout(freshTimer.current);
    freshTimer.current = window.setTimeout(() => setFresh(false), FRESH_MS);
  }

  useEffect(() => {
    // Halaman soundbox hanya untuk admin yang sudah login
    if (!getToken()) {
      redirectToLogin();
      return;
    }

    let active = true;
    let inFlight = false;

    const announce = (tx: Transaction) => {
      setRecent((prev) => [tx, ...prev].slice(0, RECENT_COUNT));
      flash();
      if (audioRef.current) void announcePayment(tx.amount);
    };

    const poll = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        if (cursor.current === null) {
          // Sinkron awal: tampilkan transaksi terakhir tanpa mengumumkannya
          const initial = await listTransactions({ limit: RECENT_COUNT });
          cursor.current = initial.at(-1)?.id ?? 0;
          if (active) setRecent([...initial].reverse());
        } else {
          const incoming = await listTransactions({ afterId: cursor.current, limit: 20 });
          for (const tx of incoming) {
            cursor.current = tx.id;
            if (active) announce(tx);
          }
        }
        if (active) setOnline(true);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          // Token kedaluwarsa atau tidak valid: minta login ulang
          clearToken();
          redirectToLogin();
          return;
        }
        if (active) setOnline(false);
      } finally {
        inFlight = false;
      }
    };

    void poll();
    const timer = setInterval(poll, POLL_MS);
    return () => {
      active = false;
      clearInterval(timer);
      window.clearTimeout(freshTimer.current);
    };
  }, []);

  function enableAudio() {
    unlockAudio();
    audioRef.current = true;
    setAudioOn(true);
    playChime();
    speak('Suara soundbox aktif');
  }

  function testSound() {
    flash();
    void announcePayment(12345);
  }

  function goFullscreen() {
    void document.documentElement.requestFullscreen?.();
  }

  const statusClass = online === null ? 'connecting' : online ? 'online' : 'offline';
  const statusText =
    online === null ? 'Menghubungkan…' : online ? 'Terhubung' : 'Gagal terhubung, mencoba lagi…';
  const label = fresh ? 'Pembayaran diterima' : last ? 'Pembayaran terakhir' : 'Menunggu pembayaran';

  return (
    <section className="stack">
      <Confetti burstKey={burst} />

      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="muted" role="status">
          <span className={`dot ${statusClass}`} aria-hidden="true" />
          {statusText}
        </span>
        <div className="row">
          {audioOn && (
            <button type="button" className="secondary" onClick={testSound}>
              Tes Suara
            </button>
          )}
          <button type="button" className="secondary" onClick={goFullscreen}>
            Layar penuh
          </button>
        </div>
      </div>

      {!audioOn && (
        <div className="card banner">
          <div>
            <strong>Suara belum aktif</strong>
            <p className="muted" style={{ margin: '4px 0 0' }}>
              Browser memblokir suara sampai ada klik. Tekan sekali agar notifikasi suara berbunyi.
            </p>
          </div>
          <button type="button" onClick={enableAudio}>
            Aktifkan Suara
          </button>
        </div>
      )}

      <div className={`card display ${fresh ? 'fresh' : ''}`} aria-live="polite">
        <p className="muted display-label">{label}</p>
        {last ? (
          <>
            <p className={`display-amount ${fresh ? 'pop' : ''}`}>
              <CountUp key={`${last.id}-${fresh}`} value={last.amount} animate={fresh} />
            </p>
            <p className="muted">{formatDateTime(last.paid_at)}</p>
          </>
        ) : (
          <>
            <span className="ring" aria-hidden="true" />
            <p className="display-empty">Belum ada pembayaran masuk</p>
          </>
        )}
      </div>

      {recent.length > 0 && (
        <section className="card">
          <h2>5 pembayaran terakhir</h2>
          <ul className="recent">
            {recent.map((tx) => (
              <li key={tx.id}>
                <span className="muted">{formatDateTime(tx.paid_at)}</span>
                <strong>{formatRupiah(tx.amount)}</strong>
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  );
}

/** Angka yang naik dari 0 ke nilai akhirnya, kalau `animate` true */
function CountUp({ value, animate }: { value: number; animate: boolean }) {
  const [shown, setShown] = useState(animate ? 0 : value);

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!animate || reduceMotion) {
      setShown(value);
      return;
    }
    const start = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / COUNT_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(value * eased));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, animate]);

  return <>{formatRupiah(shown)}</>;
}

/** Serpihan confetti yang jatuh sekali setiap kali `burstKey` berubah */
function Confetti({ burstKey }: { burstKey: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        delay: `${Math.random() * 0.3}s`,
        drift: `${(Math.random() - 0.5) * 160}px`,
        spin: `${Math.random() * 720 - 360}deg`,
      })),
    [burstKey],
  );

  if (burstKey === 0) return null;

  return (
    <div className="confetti" key={burstKey} aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          style={
            {
              left: p.left,
              background: p.color,
              animationDelay: p.delay,
              '--drift': p.drift,
              '--spin': p.spin,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
