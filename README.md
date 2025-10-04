# VLESS Worker untuk Cloudflare

Skrip ini memungkinkan Anda untuk membuat proksi VLESS berkinerja tinggi menggunakan infrastruktur serverless dari Cloudflare Workers. Ini adalah implementasi populer yang didasarkan pada proyek [EDtunnel](https://github.com/3Kmfi6HP/EDtunnel), yang menawarkan banyak fitur canggih langsung dari kotaknya.

## Fitur Utama

- **Proksi VLESS**: Meneruskan lalu lintas VLESS melalui jaringan global Cloudflare.
- **Koneksi WebSocket**: Menggunakan WebSocket untuk menyamarkan lalu lintas agar lebih tahan terhadap sensor.
- **Halaman Konfigurasi Otomatis**: Secara otomatis menghasilkan halaman web dengan informasi konfigurasi, tautan, dan kode QR untuk kemudahan pengaturan klien.
- **Tautan Langganan (Subscribe Link)**: Menghasilkan tautan langganan yang kompatibel dengan berbagai aplikasi klien populer seperti Clash, V2RayNG, Sing-box, dan lainnya.
- **Dukungan Multi-UUID**: Anda dapat menggunakan beberapa UUID dalam satu worker, yang dipisahkan dengan koma.
- **Domain Terbalik (Fallback)**: Jika ada permintaan yang masuk ke worker tanpa path UUID yang benar, permintaan tersebut akan dialihkan ke situs web yang sah (seperti Wikipedia atau Bing) untuk menyembunyikan keberadaan proksi.
- **Konfigurasi Mudah**: Pengaturan dapat dilakukan langsung di dalam skrip atau melalui *Environment Variables* di dasbor Cloudflare untuk fleksibilitas maksimum.

## Cara Deploy (Penyebaran)

1.  **Login ke Cloudflare**: Buka dasbor [Cloudflare](https://dash.cloudflare.com/) Anda.
2.  **Buka Workers**: Di menu sebelah kiri, navigasi ke **Workers & Pages**.
3.  **Buat Worker**: Klik tombol **Create application**, lalu pilih **Create Worker**.
4.  **Beri Nama Worker**: Beri nama worker Anda, misalnya `vless-proxy-viral`, lalu klik **Deploy**.
5.  **Edit Kode**: Klik **Edit code** untuk membuka editor.
6.  **Salin dan Tempel Kode**: Hapus semua kode yang ada di editor, lalu salin seluruh konten dari file `_worker.js` dan tempelkan ke editor.
7.  **Deploy Perubahan**: Klik **Deploy** untuk menyimpan dan mengaktifkan skrip.

## Konfigurasi

Anda dapat mengonfigurasi worker dengan dua cara:

### 1. Langsung di dalam Kode (Tidak Direkomendasikan)

Anda bisa mengedit variabel-variabel berikut di bagian atas file `_worker.js`:

- `userID`: Ganti dengan UUID Anda.
- `พร็อกซีไอพีs`: Daftar alamat IP atau domain dari server VLESS Anda.

### 2. Melalui Environment Variables (Sangat Direkomendasikan)

Ini adalah cara yang lebih aman dan fleksibel.

1.  Di halaman worker Anda, klik tab **Settings**.
2.  Pilih menu **Variables**.
3.  Di bawah **Environment Variables**, klik **Add variable**.
4.  Tambahkan variabel berikut:
    - **`UUID`**: Masukkan UUID Anda. Untuk menggunakan beberapa UUID, pisahkan dengan koma (contoh: `uuid1,uuid2,uuid3`).
    - **`PROXYIP`**: (Opsional) Masukkan IP atau domain proxy Anda.
    - **`DNS_RESOLVER_URL`**: (Opsional) Ganti URL DoH jika diperlukan.

5.  Klik **Save and Deploy**.

## Cara Penggunaan

Setelah worker Anda berhasil di-deploy:

1.  Buka URL worker Anda di browser dengan menambahkan path UUID Anda.
    - Format: `https://<nama-worker>.<subdomain-anda>.workers.dev/<uuid-anda>`
2.  Halaman web akan muncul, menampilkan:
    - Tautan konfigurasi VLESS mentah.
    - Tombol untuk menyalin tautan.
    - Tautan langganan untuk berbagai klien.
3.  Salin tautan yang sesuai dan impor ke dalam aplikasi klien VLESS Anda.

Selesai! Anda sekarang memiliki proksi VLESS yang berjalan di Cloudflare.