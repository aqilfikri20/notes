# Aplikasi Catatan

Aplikasi React + Vite ini menyimpan catatan ke MySQL melalui API Express.

## Menjalankan aplikasi

1. Pastikan MySQL berjalan dan salin `.env.example` menjadi `.env` jika file `.env` belum ada.
2. Isi koneksi MySQL di `.env` (`MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`).
3. Isi `SESSION_SECRET` dengan nilai acak yang panjang.
4. Jalankan `npm install`, lalu `npm run dev`.

Saat server API mulai, database `notes_app` serta tabel akun dan catatan dibuat otomatis. Vite tersedia di `http://localhost:5173`, sedangkan API berjalan di port `3001`.

Tanpa akun, catatan tersimpan di localStorage browser. Pendaftaran membuat akun dan menyalin catatan perangkat ke database tanpa menghapus salinan localStorage. Login membuka catatan akun; logout kembali menampilkan catatan perangkat.

Untuk menjalankan versi produksi, jalankan `npm run build` lalu `npm run start`. Server Express akan menyajikan folder `dist` dan API.

Skema tabel juga tersedia di `server/schema.sql`.
