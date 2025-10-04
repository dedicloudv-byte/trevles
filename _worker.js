// @ts-ignore
import { connect } from 'cloudflare:sockets';

// ==================================================================================
// Konfigurasi Utama
// ==================================================================================

// Atur UUID Anda di sini. Ini HARUS cocok dengan UUID di konfigurasi klien VLESS Anda.
// Anda juga dapat mengatur ini melalui Environment Variable 'UUID' di dasbor Cloudflare.
let userID = 'd342d11e-d424-4583-b36e-524ab1f0afa4';

// Path khusus yang akan Anda gunakan di klien VLESS Anda untuk memberi tahu worker
// server VLESS mana yang akan dihubungi.
// Contoh: /proxy/
const proxyPath = '/proxy/';

// URL Fallback: Jika seseorang mencoba mengakses worker Anda melalui browser,
// mereka akan dialihkan ke URL ini. Ini menyembunyikan fakta bahwa ini adalah proksi.
const fallbackURL = 'https://www.google.com';

// ==================================================================================
// Anda tidak perlu mengubah apa pun di bawah baris ini.
// ==================================================================================

export default {
	/**
	 * @param {import("@cloudflare/workers-types").Request} request
	 * @param {{UUID: string}} env
	 * @returns {Promise<Response>}
	 */
	async fetch(request, env) {
		try {
			// Ambil UUID dari environment variable jika ada, jika tidak gunakan yang di atas.
			userID = env.UUID || userID;
			if (!isValidUUID(userID)) {
				throw new Error('UUID tidak valid di konfigurasi worker.');
			}

			const upgradeHeader = request.headers.get('Upgrade');
			if (upgradeHeader && upgradeHeader.toLowerCase() === 'websocket') {
				// Permintaan ini adalah koneksi VLESS WebSocket.
				return await handleVlessRequest(request);
			} else {
				// Semua permintaan HTTP biasa lainnya dialihkan.
				return Response.redirect(fallbackURL, 302);
			}
		} catch (err) {
			const e = err;
			return new Response(e.toString(), { status: 500 });
		}
	},
};

/**
 * Menangani permintaan VLESS WebSocket yang masuk.
 * @param {import("@cloudflare/workers-types").Request} request
 */
async function handleVlessRequest(request) {
	const url = new URL(request.url);

	// Memeriksa apakah path URL dimulai dengan path proksi yang telah ditentukan.
	if (!url.pathname.startsWith(proxyPath)) {
		return new Response('Path tidak valid. Pastikan path di klien VLESS Anda benar.', { status: 400 });
	}

	// Mengekstrak hostname server VLESS tujuan dari URL.
	const remoteHostname = url.pathname.substring(proxyPath.length);
	if (!remoteHostname) {
		return new Response('Hostname server VLESS tidak ditentukan di path URL.', { status: 400 });
	}

	const [client, webSocket] = Object.values(new WebSocketPair());
	webSocket.accept();

	let remoteSocket;
	let remoteSocketWapper = { value: null };

	const readableWebSocketStream = makeReadableWebSocketStream(webSocket);

	// Proses data dari klien WebSocket
	readableWebSocketStream.pipeTo(new WritableStream({
		async write(chunk, controller) {
			if (remoteSocketWapper.value) {
				const writer = remoteSocketWapper.value.writable.getWriter();
				await writer.write(chunk);
				writer.releaseLock();
				return;
			}

			// Ini adalah data pertama dari klien, berisi header VLESS.
			const {
				hasError,
				message,
				portRemote,
				rawDataIndex,
				vlessVersion
			} = processVlessHeader(chunk, userID);

			if (hasError) {
				throw new Error(message);
			}

			const remotePort = portRemote ?? 443;

			try {
				// Membuat koneksi TCP Socket mentah ke server VLESS tujuan
				remoteSocket = connect({
					hostname: remoteHostname,
					port: remotePort,
				});
				remoteSocketWapper.value = remoteSocket;

				const vlessResponseHeader = new Uint8Array([vlessVersion[0], 0]);

				// Meneruskan data dari server VLESS (remote) kembali ke klien (webSocket)
				remoteSocketToWS(remoteSocket, webSocket, vlessResponseHeader);

				const writer = remoteSocket.writable.getWriter();
				// Mengirim sisa data dari paket pertama (setelah header VLESS)
				await writer.write(chunk.slice(rawDataIndex));
				writer.releaseLock();

			} catch (error) {
				controller.error(error);
				throw error;
			}
		},
		abort(reason) {
			console.log("readableWebSocketStream aborted", reason);
			safeCloseWebSocket(webSocket);
			if (remoteSocket) {
				remoteSocket.close();
			}
		},
	})).catch((error) => {
		console.error("readableWebSocketStream pipeTo error", error);
		safeCloseWebSocket(webSocket);
		if (remoteSocket) {
			remoteSocket.close();
		}
	});

	return new Response(null, {
		status: 101,
		webSocket: client,
	});
}

/**
 * Membuat stream yang dapat dibaca dari WebSocket.
 */
function makeReadableWebSocketStream(webSocket) {
	const stream = new ReadableStream({
		start(controller) {
			webSocket.addEventListener('message', (event) => {
				controller.enqueue(event.data);
			});
			webSocket.addEventListener('close', () => {
				controller.close();
			});
			webSocket.addEventListener('error', (err) => {
				controller.error(err);
			});
		},
	});
	return stream;
}

/**
 * Meneruskan data dari remote TCP socket ke client WebSocket.
 */
async function remoteSocketToWS(remoteSocket, webSocket, vlessResponseHeader) {
	let vlessHeader = vlessResponseHeader;
	await remoteSocket.readable.pipeTo(new WritableStream({
		async write(chunk, controller) {
			if (webSocket.readyState !== WebSocket.READY_STATE_OPEN) {
				controller.error('webSocket.readyState is not open');
				return;
			}
			if (vlessHeader) {
				webSocket.send(await new Blob([vlessHeader, chunk]).arrayBuffer());
				vlessHeader = null;
			} else {
				webSocket.send(chunk);
			}
		},
		close() {
			safeCloseWebSocket(webSocket);
		},
		abort(reason) {
			console.error("remoteSocket.readable aborted", reason);
			safeCloseWebSocket(webSocket);
		},
	})).catch(error => {
		console.error("remoteSocketToWS pipeTo error:", error);
		safeCloseWebSocket(webSocket);
	});
}

/**
 * Mem-parsing header VLESS dari data yang masuk.
 */
function processVlessHeader(vlessBuffer, userID) {
	if (vlessBuffer.byteLength < 24) {
		return { hasError: true, message: 'invalid data' };
	}
	const version = new Uint8Array(vlessBuffer.slice(0, 1));
	const uuid = new Uint8Array(vlessBuffer.slice(1, 17));
	if (stringify(uuid) !== userID) {
		return { hasError: true, message: 'invalid user' };
	}

	const optLength = new Uint8Array(vlessBuffer.slice(17, 18))[0];
	const command = new Uint8Array(vlessBuffer.slice(18 + optLength, 19 + optLength))[0];
	if (command !== 1) { // 1 = TCP
		return { hasError: true, message: `command ${command} is not supported` };
	}

	const portIndex = 19 + optLength;
	const portRemote = new DataView(vlessBuffer.slice(portIndex, portIndex + 2)).getUint16(0);

	const addressIndex = portIndex + 2;
	const addressType = new Uint8Array(vlessBuffer.slice(addressIndex, addressIndex + 1))[0];
	let addressLength = 0;
	let addressValueIndex = addressIndex + 1;
	let addressValue = '';

	switch (addressType) {
		case 1: addressLength = 4; break; // IPv4
		case 2: addressLength = new Uint8Array(vlessBuffer.slice(addressValueIndex, addressValueIndex + 1))[0]; addressValueIndex += 1; break; // Domain
		case 3: addressLength = 16; break; // IPv6
		default: return { hasError: true, message: `invalid addressType: ${addressType}` };
	}
	// Nilai address tidak benar-benar dibutuhkan di sini karena kita sudah tahu host tujuan,
	// tetapi kita tetap mem-parsingnya untuk mendapatkan rawDataIndex yang benar.
	const rawDataIndex = addressValueIndex + addressLength;

	return {
		hasError: false,
		portRemote,
		rawDataIndex,
		vlessVersion: version,
	};
}

function isValidUUID(uuid) {
	const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
	return uuidRegex.test(uuid);
}

function safeCloseWebSocket(socket) {
	try {
		if (socket.readyState === WebSocket.READY_STATE_OPEN || socket.readyState === WebSocket.READY_STATE_CLOSING) {
			socket.close();
		}
	} catch (error) {
		console.error('safeCloseWebSocket error', error);
	}
}

const byteToHex = [];
for (let i = 0; i < 256; ++i) {
	byteToHex.push((i + 256).toString(16).slice(1));
}
function stringify(arr, offset = 0) {
	const unsafeStringify = (arr, offset = 0) => (
		byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] +
		byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + '-' +
		byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + '-' +
		byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + '-' +
		byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + '-' +
		byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] +
		byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] +
		byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]]
	).toLowerCase();
	const uuid = unsafeStringify(arr, offset);
	if (!isValidUUID(uuid)) {
		throw TypeError('Stringified UUID is invalid');
	}
	return uuid;
}