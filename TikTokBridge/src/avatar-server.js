'use strict';

const http = require('node:http');
const sharp = require('sharp');
const { isLoopbackAddress } = require('./security');

// A separate local image service can be updated without resetting a LIVE session.
const AVATAR_PORT = 3001;
const MAX_BYTES = 4 * 1024 * 1024;
const CDN_DOMAINS = ['tiktokcdn.com', 'tiktokcdn-us.com', 'tiktokcdn-eu.com', 'ibytedtos.com', 'byteoversea.com'];

function validateAvatarUrl(value) {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443') ||
        !CDN_DOMAINS.some(domain => url.hostname === domain || url.hostname.endsWith(`.${domain}`))) {
        throw new Error('Unsupported avatar host');
    }
    return url;
}

async function readImage(response) {
    if (!response.ok || !/^image\//i.test(response.headers.get('content-type') || '') ||
        Number(response.headers.get('content-length')) > MAX_BYTES) {
        await response.body?.cancel();
        throw new Error('Invalid image response');
    }
    const chunks = [];
    let size = 0;
    for await (const chunk of response.body) {
        size += chunk.length;
        if (size > MAX_BYTES) throw new Error('Image too large');
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
}

function createAvatarServer({ fetchImage = fetch } = {}) {
    const cache = new Map();
    const pending = new Map();
    async function convert(source) {
        const cached = cache.get(source);
        if (cached && cached.expires > Date.now()) return cached.data;
        cache.delete(source);
        if (pending.has(source)) return pending.get(source);
        if (pending.size >= 16) throw new Error('Avatar service busy');
        const work = (async () => {
            let current = validateAvatarUrl(source);
            for (let redirects = 0; redirects <= 3; redirects++) {
                const response = await fetchImage(current.href, {
                    redirect: 'manual', signal: AbortSignal.timeout(8000),
                    headers: { Accept: 'image/webp,image/png,image/jpeg', 'User-Agent': 'BarClub-Avatar/1.0' }
                });
                if ([301, 302, 303, 307, 308].includes(response.status)) {
                    await response.body?.cancel();
                    current = validateAvatarUrl(new URL(response.headers.get('location'), current).href);
                    continue;
                }
                const input = await readImage(response);
                const data = await sharp(input, { limitInputPixels: 16 * 1024 * 1024, animated: false })
                    .rotate().resize(256, 256, { fit: 'cover' }).png().toBuffer();
                cache.set(source, { data, expires: Date.now() + 10 * 60 * 1000 });
                while (cache.size > 256) cache.delete(cache.keys().next().value);
                return data;
            }
            throw new Error('Too many redirects');
        })();
        pending.set(source, work);
        try { return await work; } finally { pending.delete(source); }
    }

    return http.createServer(async (request, response) => {
        response.setHeader('X-Content-Type-Options', 'nosniff');
        response.setHeader('Cache-Control', 'no-store');
        const allowedHosts = new Set([`127.0.0.1:${request.socket.localPort}`, `localhost:${request.socket.localPort}`]);
        if (!isLoopbackAddress(request.socket.remoteAddress) || !allowedHosts.has(request.headers.host) || request.headers.origin) {
            response.writeHead(403).end(); return;
        }
        if (request.method !== 'GET') { response.writeHead(405).end(); return; }
        const url = new URL(request.url, 'http://127.0.0.1');
        if (url.pathname === '/health') {
            response.setHeader('Content-Type', 'application/json');
            response.end(JSON.stringify({ appId: 'bar-club-avatar', status: 'ok' })); return;
        }
        if (url.pathname !== '/avatar') { response.writeHead(404).end(); return; }
        let source;
        try {
            source = url.searchParams.get('url');
            if (!source || source.length > 2048) throw new Error('Invalid avatar URL');
            validateAvatarUrl(source);
        } catch { response.writeHead(400).end('Invalid avatar URL'); return; }
        try {
            const data = await convert(source);
            response.writeHead(200, { 'Content-Type': 'image/png', 'Content-Length': data.length });
            response.end(data);
        } catch {
            response.writeHead(502).end('Avatar unavailable');
        }
    });
}

function startAvatarServer() {
    const server = createAvatarServer();
    server.on('error', async error => {
        if (error.code === 'EADDRINUSE') {
            try {
                const response = await fetch(`http://127.0.0.1:${AVATAR_PORT}/health`, { signal: AbortSignal.timeout(2000) });
                if ((await response.json()).appId === 'bar-club-avatar') return;
            } catch { /* Report a conflict with an unrelated local service. */ }
        }
        console.warn(`Avatar service could not start on ${AVATAR_PORT}: ${error.code}`);
    });
    server.listen(AVATAR_PORT, '127.0.0.1', () => console.log(`Avatar PNG service: http://127.0.0.1:${AVATAR_PORT}`));
    return server;
}

if (require.main === module) startAvatarServer();
module.exports = { createAvatarServer, startAvatarServer, validateAvatarUrl };
