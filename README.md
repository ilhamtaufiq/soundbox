# Soundbox QRIS

Notifikasi pembayaran QRIS dengan suara. Setiap pembayaran masuk diumumkan di kasir
dengan nominal lengkap dalam Bahasa Indonesia, dan dicatat di dashboard admin.

## Fitur

- **Layar soundbox** (`/soundbox`): menampilkan pembayaran terakhir, membunyikan chime,
  lalu mengumumkan nominal per kata. Ada tampilan layar penuh dan daftar 5 pembayaran terakhir.
- **Dashboard admin** (`/admin`): pemasukan hari ini, jumlah transaksi lunas, total pemasukan,
  dan transaksi terbaru.
- **Login admin** (`/admin/login`): token JWT berlaku 12 jam. Halaman soundbox dan dashboard
  hanya bisa dibuka setelah login.
- **Pendaftaran** (`/daftar`): form yang dikirim ke email lewat Web3Forms.
- **Landing page** (`/`): promosi dan perbandingan dengan produk lain.

## Arsitektur

```
Watcher GoBiz ──► bridge.js ──► POST /internal/transactions ──► backend (Rust + MySQL)
                                                                      ▲
Browser ──► frontend (Astro + React) ──► /api/* (login admin) ───────┘
```

| Folder | Isi |
|---|---|
| `frontend/` | Astro + React. Landing, soundbox, dashboard, login, pendaftaran. |
| `backend/` | Rust (axum, sqlx, MySQL). API transaksi dan auth admin. Migrasi otomatis saat start. |
| `bridge.js` | Menjalankan watcher GoBiz dan meneruskan pembayaran masuk ke backend. |
| `gobiz.js` | Modul GoBiz (login, riwayat, watcher). Dokumentasi lengkap ada di `docs/GOBIZ.md`. |
| `docker-compose.yml` | Stack untuk deploy: `frontend`, `backend`, `mysql`, `bridge`. |

## Prasyarat

- Node.js 24 atau lebih baru
- Rust (cargo) terbaru
- MySQL 8.0

## Menjalankan secara lokal

### 1. Database

Buat database kosong. Tabel dibuat otomatis saat backend pertama kali start.

```bash
mysql -h 127.0.0.1 -u root -e "CREATE DATABASE IF NOT EXISTS gobiz_soundbox CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

### 2. Backend

```bash
cd backend
cp .env.example .env   # lalu isi nilai yang sesuai
cargo run
```

Server berjalan di `http://127.0.0.1:8080`.

| Variabel | Keterangan |
|---|---|
| `DATABASE_URL` | Koneksi MySQL, mis. `mysql://root:@127.0.0.1:3306/gobiz_soundbox` |
| `BIND_ADDR` | Alamat listen, default `127.0.0.1:8080` |
| `CORS_ORIGIN` | Origin frontend yang boleh akses, mis. `http://localhost:4321` |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD` | Akun login dashboard dan soundbox |
| `JWT_SECRET` | String acak panjang untuk menandatangani token |
| `INTERNAL_SECRET` | Rahasia endpoint internal, harus sama dengan bridge |

### 3. Frontend

```bash
cd frontend
cp .env.example .env   # isi PUBLIC_API_URL dan PUBLIC_WEB3FORMS_KEY
npm install
npm run dev
```

Buka `http://localhost:4321`.

| Variabel | Keterangan |
|---|---|
| `PUBLIC_API_URL` | URL backend, mis. `http://localhost:8080/api` |
| `PUBLIC_WEB3FORMS_KEY` | Access key Web3Forms untuk form pendaftaran (opsional saat development) |

Nilai `PUBLIC_*` ditanam saat build, jadi ubah lalu restart `npm run dev` atau build ulang.

### 4. Bridge (watcher pembayaran)

Di root proyek, isi `.env` dengan kredensial GoBiz dan rahasia internal:

```bash
GOPAY_LOGIN_METHOD=password
GOPAY_EMAIL=email@merchant.com
GOPAY_PASSWORD=password_kamu
BACKEND_URL=http://127.0.0.1:8080
INTERNAL_SECRET=sama-dengan-backend
```

```bash
npm install
node bridge.js
```

Login OTP membutuhkan input di terminal. Di server (Docker) gunakan metode `password`.

## Audio pengumuman

Nominal diumumkan dengan menyambung klip per kata dari `frontend/public/audio/`
(41 file MP3). Susunannya dibuat oleh `amountToClipNames` di `frontend/src/lib/speech.ts`.
Kalau ada klip yang hilang, soundbox memakai suara bawaan browser.

## Deploy

Deploy memakai Docker Compose, misalnya di Coolify. Lihat [DEPLOY.md](DEPLOY.md) untuk
daftar environment variable dan langkahnya.

## Struktur proyek

```
backend/            API Rust (src/, migrations/, Dockerfile)
frontend/           Astro + React (src/, public/, Dockerfile, nginx.conf)
docs/GOBIZ.md      Dokumentasi modul gobiz.js
bridge.js           Watcher GoBiz → backend
gobiz.js            Modul GoBiz
docker-compose.yml  Stack deploy
DEPLOY.md           Panduan deploy
```

## Lisensi

Lihat [LICENSE](LICENSE).
