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

## Metode Deployment

Anda dapat men-deploy worker ini menggunakan dua metode: melalui dasbor Cloudflare (cara mudah) atau menggunakan Wrangler CLI (untuk pengguna tingkat lanjut).

### Metode 1: Melalui Dasbor Cloudflare (Cara Mudah)

Metode ini tidak memerlukan instalasi apa pun di komputer Anda.

**Langkah-langkah Deployment:**

1.  **Login ke Cloudflare**: Buka dasbor [Cloudflare](https://dash.cloudflare.com/) Anda.
2.  **Buka Workers**: Di menu sebelah kiri, navigasi ke **Workers & Pages**.
3.  **Buat Worker**: Klik **Create application**, lalu pilih **Create Worker**.
4.  **Beri Nama Worker**: Beri nama worker Anda (misalnya, `vless-proxy-viral`), lalu klik **Deploy**.
5.  **Edit Kode**: Setelah worker dibuat, klik **Edit code**.
6.  **Salin dan Tempel Kode**: Hapus semua kode yang ada di editor, lalu salin seluruh konten dari file `_worker.js` ini dan tempelkan ke editor.
7.  **Deploy Perubahan**: Klik **Deploy** untuk menyimpan skrip.

**Konfigurasi (Variabel Lingkungan):**

Ini adalah cara yang paling direkomendasikan untuk mengonfigurasi worker Anda.

1.  Di halaman worker Anda, klik tab **Settings** > **Variables**.
2.  Di bawah **Environment Variables**, klik **Add variable**.
3.  Tambahkan variabel berikut dan klik **Save and Deploy** setelah selesai:
    - **`UUID`**: Masukkan UUID Anda. Untuk menggunakan beberapa UUID, pisahkan dengan koma (contoh: `uuid1,uuid2,uuid3`).
    - **`PROXYIP`**: (Opsional) Masukkan IP atau domain proxy kustom Anda.
    - **`DNS_RESOLVER_URL`**: (Opsional) Ganti URL DoH jika diperlukan.

### Metode 2: Menggunakan Wrangler CLI (Cara Lanjutan)

Metode ini memungkinkan Anda men-deploy dan mengelola worker langsung dari baris perintah (command line), menggunakan file `wrangler.toml` yang sudah disediakan.

**Prasyarat:**

-   [Node.js](https://nodejs.org/) (versi 16.13.0 atau lebih baru)
-   NPM (biasanya terinstal bersama Node.js)

**Langkah-langkah Deployment:**

1.  **Instal Wrangler**: Buka terminal atau command prompt dan jalankan perintah berikut:
    ```bash
    npm install -g wrangler
    ```

2.  **Login ke Wrangler**: Hubungkan wrangler dengan akun Cloudflare Anda:
    ```bash
    wrangler login
    ```

3.  **Dapatkan Kode Proyek**: Clone repositori ini ke komputer lokal Anda.
    ```bash
    # Ganti URL dengan URL repositori ini jika perlu
    git clone https://github.com/user/repo.git
    cd repo
    ```

4.  **Konfigurasi `wrangler.toml`**:
    -   Buka file `wrangler.toml`.
    -   Ubah `name` menjadi nama worker yang Anda inginkan.
    -   Di bawah bagian `[vars]`, atur nilai `UUID` dan `PROXYIP` (jika diperlukan).

5.  **Deploy Worker**: Jalankan perintah berikut untuk men-deploy worker Anda:
    ```bash
    wrangler deploy
    ```
    Wrangler akan secara otomatis membaca konfigurasi dan variabel dari `wrangler.toml` dan men-deploy worker ke akun Cloudflare Anda.

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