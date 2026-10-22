// Jembatan: watcher GoBiz → backend Rust.
// Setiap pembayaran masuk yang dideteksi watcher dikirim ke POST /internal/transactions.
// Kalau backend belum bisa dihubungi, pengiriman diulang dari antrean di memori.
import 'dotenv/config';
import { getGoPayWatcher } from './gobiz.js';

const BACKEND_URL = (process.env.BACKEND_URL ?? 'http://127.0.0.1:8080').replace(/\/$/, '');
const INTERNAL_SECRET = process.env.INTERNAL_SECRET;
const WATCH_INTERVAL_MS = Number(process.env.WATCH_INTERVAL_MS ?? 6_000);
const RETRY_MS = 10_000;

if (!INTERNAL_SECRET) {
  console.error('INTERNAL_SECRET belum diisi di .env (harus sama dengan backend/.env)');
  process.exit(1);
}

/** @type {{ amount: number, txId: string }[]} */
const queue = [];

async function send({ amount, txId }) {
  const res = await fetch(`${BACKEND_URL}/internal/transactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Secret': INTERNAL_SECRET,
    },
    body: JSON.stringify({
      amount: Math.round(amount),
      tx_id: String(txId),
      paid_at: new Date().toISOString(),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${body}`);
  }
  return res.status;
}

async function flush() {
  while (queue.length > 0) {
    const item = queue[0];
    try {
      const status = await send(item);
      queue.shift();
      console.log(`[bridge] ${status === 201 ? 'Tersimpan' : 'Sudah ada'}: Rp ${item.amount} | ${item.txId}`);
    } catch (err) {
      console.error(`[bridge] Gagal kirim Rp ${item.amount} | ${item.txId}: ${err.message}. Dicoba lagi nanti.`);
      return;
    }
  }
}

const watcher = getGoPayWatcher(WATCH_INTERVAL_MS);

watcher.on('payment', (data) => {
  console.log(`[bridge] Pembayaran masuk: Rp ${data.amount} | ${data.txId}`);
  queue.push({ amount: data.amount, txId: data.txId });
  void flush();
});

setInterval(() => void flush(), RETRY_MS);

watcher.start();
console.log(`[bridge] Berjalan. Backend: ${BACKEND_URL}`);
