import { getGoPayWatcher } from './gobiz.js';

// Atur seberapa sering API di-poll (default: 6000ms = 6 detik)
const watcher = getGoPayWatcher(6_000);

try {
  const tx = await watcher.waitForPayment(50000, {
    timeout: 5 * 60_000, // batas waktu maksimum menunggu (bukan frekuensi cek)
    tolerance: 0         // toleransi selisih nominal (Rp)
  });

  console.log('✅ Pembayaran diterima!');
  console.log('Nominal     :', tx.amount);
  console.log('ID Transaksi:', tx.txId);
  console.log('Detail      :', tx.entry);
} catch (err) {
  console.error('❌', err.message); // timeout atau error lain
}