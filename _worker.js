// VLESS WebSocket Worker
// This JavaScript file is designed to be used as a Cloudflare Worker to handle VLESS WebSocket connections.
// It provides a flexible way to connect clients to VLESS servers through Cloudflare, supporting both HTTP and WebSocket connections.

// Version Information
// The current version of the script is based on commit 43fad05dcdae3b723c53c226f8181fc5bd47223e.
// The timestamp for this version is 2023-06-22 15:20:02 UTC.

// Configuration
// userID: Ganti dengan UUID Anda. Ini adalah kredensial utama untuk koneksi VLESS.
let userID = 'd342d11e-d424-4583-b36e-524ab1f0afa4';

// proxyIPs: Masukkan alamat IP atau domain dari server VLESS Anda.
// Worker akan secara acak memilih salah satu dari daftar ini untuk setiap koneksi.
// Contoh: ['192.168.1.1', 'vless-server.com']
let proxyIPs = ['104.18.1.102'];

let dohURL = 'https://cloudflare-dns.com/dns-query'; // Biarkan default jika tidak yakin.

// hostnames: Daftar domain untuk fitur "domain terbalik".
// Jika permintaan tidak cocok dengan path VLESS, worker akan mengalihkan ke salah satu domain ini.
const hostnames = [
    'www.wikipedia.org',
    'www.bing.com',
    'www.microsoft.com',
];

// Fungsi untuk memeriksa apakah sebuah string adalah UUID yang valid.
function isValidUUID(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

export default {
    async fetch(request, env, ctx) {
        // Mengambil konfigurasi dari environment variables jika ada.
        userID = env.UUID || userID;
        proxyIPs = env.PROXYIP ? env.PROXYIP.split(',') : proxyIPs;
        dohURL = env.DOH_URL || dohURL;

        const url = new URL(request.url);
        const pathSegments = url.pathname.split('/');

        // Endpoint untuk informasi debug Cloudflare.
        if (url.pathname.startsWith('/cf')) {
            return new Response(JSON.stringify(request.cf, null, 4), {
                headers: { "Content-Type": "application/json;charset=UTF-8" },
            });
        }

        // Memeriksa apakah path URL mengandung UUID yang valid.
        if (pathSegments.length > 1 && isValidUUID(pathSegments[1])) {
            return vlessOverWSHandler(request);
        } else {
            // Jika tidak, alihkan ke salah satu domain di `hostnames` (domain terbalik).
            const randomHostname = hostnames[Math.floor(Math.random() * hostnames.length)];
            const newURL = `https://${randomHostname}${url.pathname}${url.search}`;
            return Response.redirect(newURL, 302);
        }
    }
};

/**
 * Menangani koneksi VLESS melalui WebSocket.
 * Fungsi ini bertindak sebagai jembatan, meneruskan data antara klien dan server VLESS.
 * @param {Request} request
 */
async function vlessOverWSHandler(request) {
    const upgradeHeader = request.headers.get('Upgrade');
    if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
        return new Response('Expected a WebSocket upgrade request', { status: 426 });
    }

    const [client, server] = Object.values(new WebSocketPair());

    // Memilih proxy IP secara acak dari daftar.
    const proxyIP = proxyIPs[Math.floor(Math.random() * proxyIPs.length)];
    const targetURL = new URL(request.url);
    targetURL.hostname = proxyIP;
    targetURL.protocol = 'https'; // Pastikan koneksi ke proxy menggunakan TLS.

    // Membuat koneksi WebSocket ke server VLESS (proxyIP).
    const remoteSocket = new WebSocket(targetURL.toString(), {
        headers: { 'Host': targetURL.hostname }
    });

    let earlyData = [];
    let remoteSocketOpened = false;

    // Saat koneksi ke server VLESS terbuka.
    remoteSocket.addEventListener('open', () => {
        remoteSocketOpened = true;
        // Kirim data yang mungkin sudah diterima dari klien sebelumnya.
        earlyData.forEach(data => remoteSocket.send(data));
        earlyData = [];
    });

    // Meneruskan pesan dari klien ke server VLESS.
    server.addEventListener('message', event => {
        if (remoteSocketOpened) {
            remoteSocket.send(event.data);
        } else {
            // Jika koneksi ke server belum siap, simpan datanya sementara.
            earlyData.push(event.data);
        }
    });

    // Meneruskan pesan dari server VLESS ke klien.
    remoteSocket.addEventListener('message', event => {
        server.send(event.data);
    });

    // Menangani penutupan koneksi.
    const closeHandler = () => {
        if (!server.readyState === WebSocket.CLOSED) server.close(1000);
        if (!remoteSocket.readyState === WebSocket.CLOSED) remoteSocket.close(1000);
    };
    server.addEventListener('close', closeHandler);
    server.addEventListener('error', closeHandler);
    remoteSocket.addEventListener('close', closeHandler);
    remoteSocket.addEventListener('error', closeHandler);

    // Menerima koneksi WebSocket dari klien.
    server.accept();

    return new Response(null, {
        status: 101,
        webSocket: client,
    });
}