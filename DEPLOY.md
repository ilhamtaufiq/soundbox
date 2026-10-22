# Deploy ke Coolify

Domain: **https://soundbox.cianjur.space**

Stack terdiri dari empat service di `docker-compose.yml`:

| Service    | Fungsi                                                            |
|------------|-------------------------------------------------------------------|
| `frontend` | Halaman soundbox dan admin (nginx). Satu-satunya service publik. Meneruskan `/api/` ke backend. |
| `backend`  | API Rust. Hanya bisa diakses dari jaringan Docker dan lewat `frontend`. |
| `mysql`    | Database `gobiz_soundbox`.                                        |
| `bridge`   | Watcher GoBiz yang mengirim pembayaran masuk ke backend.          |

## Langkah di Coolify

1. Pastikan kode sudah di repository Git (GitHub/GitLab) dan dapat diakses Coolify.
2. Di Coolify, buat resource baru: **Docker Compose**, pilih repository dan branch.
3. Isi environment variable berikut (jangan commit ke Git):

   | Variable | Contoh / keterangan |
   |---|---|
   | `MYSQL_ROOT_PASSWORD` | password root MySQL, huruf dan angka saja |
   | `MYSQL_USER` | `soundbox` (opsional, default `soundbox`) |
   | `MYSQL_PASSWORD` | password user aplikasi, huruf dan angka saja (dipakai di URL database) |
   | `ADMIN_USERNAME` | username login dashboard admin |
   | `ADMIN_PASSWORD` | password login dashboard admin (panjang, acak) |
   | `JWT_SECRET` | string acak panjang, mis. hasil `openssl rand -hex 32` |
   | `INTERNAL_SECRET` | string acak lain, harus sama untuk backend dan bridge |
   | `PUBLIC_WEB3FORMS_KEY` | access key Web3Forms untuk form pendaftaran; dipakai saat build frontend, jadi harus diisi sebelum deploy |
   | `GOPAY_LOGIN_METHOD` | `password` (disarankan di server, lihat catatan bridge) |
   | `GOPAY_EMAIL`, `GOPAY_PASSWORD` | akun GoBiz, jika memakai metode password |

4. Di service **frontend**, isi **Domains** dengan `https://soundbox.cianjur.space` dan port `80`.
5. Deploy. Migrasi database berjalan otomatis saat backend start.

## Catatan penting

- **`PUBLIC_API_URL` ditanam saat build.** Nilainya sudah diset ke `https://soundbox.cianjur.space/api` di `docker-compose.yml`. Kalau domain berubah, ubah juga di sana lalu deploy ulang.
- **Bridge dan login GoBiz.** Login lewat OTP membutuhkan input dari terminal, jadi di container gunakan `GOPAY_LOGIN_METHOD=password`. Sesi tersimpan di dalam container dan hilang saat container dibuat ulang, jadi bridge akan login ulang.
- **Akses soundbox.** Halaman soundbox dan `GET /api/transactions` hanya bisa dipakai setelah login admin. Token disimpan di browser perangkat yang dipakai.
- **Endpoint internal.** `/internal/` diblokir di nginx. Hanya bridge yang mengaksesnya lewat jaringan Docker.
- **Backend tidak punya domain sendiri.** Jangan beri domain ke service `backend`.
- **Audio.** Folder `frontend/public/audio/` ikut ter-build ke image, jadi pastikan file MP3-nya sudah ada di repository.

## Uji lokal sebelum deploy (opsional)

```bash
docker compose build
docker compose up
```

Lalu buka http://localhost (service `frontend` belum dipetakan port ke host; tambahkan `ports: ["8081:80"]` sementara jika ingin mengujinya).
