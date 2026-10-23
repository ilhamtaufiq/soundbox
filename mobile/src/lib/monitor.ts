import { ApiError, listTransactions, type Transaction } from './api';
import { POLL_MS } from './config';
import { startKeepAlive, stopKeepAlive, updateKeepAliveText } from './keepalive';
import { announcePayment } from './player';
import { clearToken, getToken } from './session';

export interface MonitorState {
  running: boolean;
  online: boolean | null;
  last: Transaction | null;
  recent: Transaction[];
  /** Waktu (ms) pembayaran baru terakhir, 0 jika belum ada */
  freshAt: number;
}

const RECENT_COUNT = 5;

let state: MonitorState = { running: false, online: null, last: null, recent: [], freshAt: 0 };
const listeners = new Set<(s: MonitorState) => void>();
let onUnauthorized: (() => void) | null = null;
let looping = false;

function update(patch: Partial<MonitorState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l(state));
}

export function getMonitorState(): MonitorState {
  return state;
}

export function subscribeMonitor(listener: (s: MonitorState) => void): () => void {
  listeners.add(listener);
  listener(state);
  return () => {
    listeners.delete(listener);
  };
}

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function clock(): string {
  return new Date().toLocaleTimeString('id-ID');
}

/**
 * Loop pemantauan. Transaksi yang sudah ada saat mulai tidak diumumkan,
 * hanya yang masuk setelahnya. Status tiap pengecekan ditulis ke notifikasi.
 */
async function pollLoop() {
  let cursor: number | null = null;

  while (looping) {
    try {
      const token = await getToken();
      if (!token) break;

      if (cursor === null) {
        const initial = await listTransactions(token, { limit: RECENT_COUNT });
        cursor = initial.at(-1)?.id ?? 0;
        update({ online: true, last: initial.at(-1) ?? null, recent: [...initial].reverse() });
      } else {
        const incoming = await listTransactions(token, { afterId: cursor, limit: 20 });
        for (const tx of incoming) {
          cursor = tx.id;
          update({
            online: true,
            last: tx,
            recent: [tx, ...state.recent].slice(0, RECENT_COUNT),
            freshAt: Date.now(),
          });
          await announcePayment(tx.amount);
        }
        update({ online: true });
      }
      void updateKeepAliveText(`Cek terakhir ${clock()}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        // Token tidak berlaku lagi: hentikan pemantauan dan minta login ulang
        await clearToken();
        await stopMonitor();
        onUnauthorized?.();
        return;
      }
      update({ online: false });
      void updateKeepAliveText(`Gagal cek ${clock()}, mencoba lagi`);
    }
    await sleep(POLL_MS);
  }
}

export async function startMonitor(): Promise<void> {
  if (looping) return;
  looping = true;
  await startKeepAlive();
  update({ running: true });
  void pollLoop();
}

export async function stopMonitor(): Promise<void> {
  looping = false;
  await stopKeepAlive();
  update({ running: false, online: null });
}
