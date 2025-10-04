# Proksi VLESS Worker yang Aman & Tersembunyi

Ini adalah implementasi Cloudflare Worker untuk VLESS yang dirancang dengan fokus pada keamanan dan agar tidak mudah terdeteksi. Berbeda dengan implementasi lain, skrip ini tidak menyajikan halaman web atau tautan konfigurasi apa pun. Ia bertindak murni sebagai proksi WebSocket, membuatnya terlihat seperti lalu lintas API biasa.

## Konsep Utama

- **Tidak Ada Jejak (No Footprint)**: Mengakses URL worker melalui browser akan langsung dialihkan ke situs lain (`google.com` secara default), sehingga tidak ada tanda-tanda bahwa ini adalah server proksi.
- **Proksi Dinamis**: Server VLESS tujuan tidak diatur secara kaku di dalam worker. Sebaliknya, Anda menentukannya langsung di **path URL** pada konfigurasi klien VLESS Anda.
- **Keamanan Melalui Kerahasiaan (Security Through Obscurity)**: Dengan menggunakan path URL khusus, koneksi Anda menyatu dengan lalu lintas web biasa, sehingga lebih sulit bagi penyedia layanan internet untuk mendeteksi dan memblokirnya.

## Cara Kerja

Worker ini mendengarkan koneksi WebSocket yang masuk. Ia menggunakan struktur URL tertentu untuk mengetahui ke mana harus meneruskan lalu lintas VLESS Anda.

Struktur URL yang digunakan di klien Anda adalah:
`wss://<nama-worker-anda>.<subdomain-anda>.workers.dev:443`

Dan yang terpenting, **Path** diatur ke:
`/proxy/<server-vless-anda.com>`

Worker akan secara otomatis mengekstrak `<server-vless-anda.com>` dari path dan, setelah menerima paket VLESS pertama, akan membuat **koneksi TCP mentah** ke server tersebut pada port yang Anda tentukan di klien.

## Deployment

Anda dapat menggunakan metode deployment favorit Anda:

### 1. Melalui Dasbor Cloudflare

1.  **Buat Worker**: Di dasbor Cloudflare, navigasi ke **Workers & Pages** dan buat worker baru.
2.  **Salin Kode**: Salin seluruh konten dari `_worker.js` dan tempelkan ke editor kode worker.
3.  **Atur UUID**: Buka tab **Settings** > **Variables**. Tambahkan Environment Variable baru:
    -   Nama Variabel: `UUID`
    -   Nilai Variabel: `d342d11e-d424-4583-b36e-524ab1f0afa4` (atau UUID Anda sendiri)
4.  **Simpan & Deploy**.

### 2. Menggunakan Wrangler CLI

1.  **Konfigurasi `wrangler.toml`**:
    -   Pastikan `name` sesuai dengan nama worker yang Anda inginkan.
    -   Atur `UUID` di bawah `[vars]`.
2.  **Deploy**: Jalankan `wrangler deploy` dari terminal Anda.

## Konfigurasi Klien VLESS (Contoh untuk V2RayN)

Karena worker ini tidak menghasilkan tautan konfigurasi, Anda harus mengaturnya secara manual di klien Anda.

1.  Buka klien V2RayN (atau klien lain yang Anda gunakan).
2.  Tambahkan server baru dengan tipe **VLESS**.
3.  Isi konfigurasi sebagai berikut:
    -   **Address (Alamat)**: `nama-worker-anda.subdomain-anda.workers.dev`
    -   **Port**: `443` (atau port lain yang didukung Cloudflare seperti 8443, 2096, dll.)
    -   **ID (UUID)**: `d342d11e-d424-4583-b36e-524ab1f0afa4` (atau UUID yang Anda atur di worker)
    -   **Flow**: (Biarkan kosong atau default)
    -   **Encryption (Enkripsi)**: `none`
    -   **Transport (Transportasi)**: `ws` (WebSocket)
    -   **Host**: Biarkan **kosong**. Worker akan mengabaikannya.
    -   **Path**: `/proxy/server-vless-anda.com` (Ganti `server-vless-anda.com` dengan alamat server VLESS tujuan Anda).
    -   **Security (Keamanan)**: `tls`

Simpan konfigurasi, dan Anda siap untuk terhubung.

**Catatan Penting**: Port yang Anda atur di klien (misalnya, `443`) adalah port yang akan digunakan oleh worker untuk terhubung ke `server-vless-anda.com`. Pastikan server VLESS Anda di `server-vless-anda.com` benar-benar berjalan di port tersebut.