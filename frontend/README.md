# Soundbox QRIS — Frontend

Frontend untuk aplikasi soundbox QRIS: layar soundbox menampilkan dan mengumumkan setiap
pembayaran lunas, dan admin dashboard menampilkan ringkasan transaksi. Dibangun dengan
**Astro + React**, berbicara ke **backend Rust** (MySQL) lewat HTTP JSON.

## Menjalankan

```bash
cp .env.example .env   # sesuaikan PUBLIC_API_URL
npm install
npm run dev            # http://localhost:4321
npm run build          # output statis di dist/
```

## Halaman

| Route        | Fungsi                                                                                   |
|--------------|------------------------------------------------------------------------------------------|
| `/`          | Redirect ke `/soundbox`                                                                   |
| `/soundbox`  | Layar soundbox: nominal transaksi lunas terakhir, polling tiap 3 detik, chime + TTS id-ID |
| `/admin`     | Dashboard admin: ringkasan hari ini dan transaksi lunas terbaru, auto-refresh 10 detik |

> Browser memblokir audio sebelum ada klik, jadi di `/soundbox` tekan **Aktifkan Suara** sekali.

## Kontrak API backend

Semua URL berada di bawah `PUBLIC_API_URL` (default `http://localhost:8080/api`).
Backend perlu mengizinkan CORS dari origin frontend. Format waktu wajib ISO 8601 (UTC).

### `GET /transactions?after_id=&limit=`
- Tanpa `after_id`: `limit` transaksi **terbaru**, diurutkan `id` naik.
- Dengan `after_id`: transaksi dengan `id > after_id`, diurutkan `id` naik.

```json
[
  { "id": 42, "payment_id": "pay_01H...", "amount": 15000, "tx_id": "TXN-...", "paid_at": "2026-10-22T10:01:12Z" }
]
```

### `GET /admin/summary`
Wajib diproteksi autentikasi di backend. Frontend mengirim token dari halaman `/admin/login`.

```json
{
  "today_amount": 150000,
  "today_count": 7,
  "total_amount": 3250000
}
```

## Struktur

```
src/
  lib/api.ts        klien HTTP + tipe data untuk transaksi
  lib/admin.ts      klien HTTP untuk endpoint admin
  lib/speech.ts     chime (Web Audio) & TTS (speechSynthesis, id-ID)
  lib/format.ts     format Rupiah & tanggal
  components/       Soundbox.tsx, AdminDashboard.tsx (React islands)
  pages/            index.astro (redirect), soundbox.astro, admin.astro
  layouts/          Layout.astro
```

## Audio pengumuman

Nominal diumumkan dengan menyambung klip per kata dari `public/audio/` (41 file MP3, suara ElevenLabs `d15jrIAARvF899pDoC6T`, model eleven_multilingual_v2). Nama file mengikuti teksnya, misalnya `dua-belas.mp3`, `dua-ratus.mp3`, `ribu.mp3`, `pembayaran-diterima.mp3`.

Susunan kalimat dibuat di `src/lib/speech.ts` (`amountToClipNames`). Kalau ada klip yang hilang, soundbox memakai suara bawaan browser.
