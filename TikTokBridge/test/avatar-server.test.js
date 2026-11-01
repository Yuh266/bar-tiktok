'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const sharp = require('sharp');
const { createAvatarServer, validateAvatarUrl } = require('../src/avatar-server');

async function withServer(options, run) {
    const server = createAvatarServer(options);
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    try { await run(`http://127.0.0.1:${server.address().port}`); }
    finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}

test('converts an actual WebP to a square PNG and shares concurrent downloads', async () => {
    const webp = await sharp({ create: { width: 80, height: 40, channels: 3, background: '#c04080' } }).webp().toBuffer();
    let calls = 0;
    await withServer({ fetchImage: async () => {
        calls++;
        return new Response(webp, { headers: { 'Content-Type': 'image/webp' } });
    } }, async base => {
        const path = `${base}/avatar?url=${encodeURIComponent('https://p19-common-sign.tiktokcdn.com/avatar.webp?token=abc')}`;
        const results = await Promise.all([fetch(path), fetch(path)]);
        for (const result of results) {
            assert.equal(result.status, 200);
            assert.equal(result.headers.get('content-type'), 'image/png');
            const png = Buffer.from(await result.arrayBuffer());
            const metadata = await sharp(png).metadata();
            assert.equal(metadata.format, 'png');
            assert.equal(metadata.width, metadata.height);
            assert.ok(metadata.width <= 256);
        }
        assert.equal((await fetch(path)).status, 200);
        assert.equal(calls, 1);
    });
});

test('does not fetch local URLs, deceptive hosts, credentials, or non-HTTPS images', async () => {
    let calls = 0;
    await withServer({ fetchImage: async () => { calls++; throw new Error('unexpected fetch'); } }, async base => {
        for (const url of ['http://p19.tiktokcdn.com/a', 'https://127.0.0.1/a',
            'https://tiktokcdn.com.evil.test/a', 'https://evil-tiktokcdn.com/a',
            'https://user:password@p19.tiktokcdn.com/a', 'https://p19.tiktokcdn.com:8443/a']) {
            assert.throws(() => validateAvatarUrl(url));
            assert.equal((await fetch(`${base}/avatar?url=${encodeURIComponent(url)}`)).status, 400);
        }
        assert.equal(calls, 0);
    });
});

test('validates redirects and never follows a CDN redirect to a local service', async () => {
    let calls = 0;
    await withServer({ fetchImage: async () => {
        calls++;
        return new Response(null, { status: 302, headers: { Location: 'http://127.0.0.1/private' } });
    } }, async base => {
        const response = await fetch(`${base}/avatar?url=https://p19.tiktokcdn.com/avatar.webp`);
        assert.equal(response.status, 502);
        assert.equal(calls, 1);
    });
});

test('rejects oversized images and retries failed downloads instead of caching failure', async () => {
    const png = await sharp({ create: { width: 16, height: 16, channels: 3, background: '#3377bb' } }).png().toBuffer();
    let calls = 0;
    await withServer({ fetchImage: async () => {
        calls++;
        return calls === 1
            ? new Response('too big', { headers: { 'Content-Type': 'image/webp', 'Content-Length': '5000000' } })
            : new Response(png, { headers: { 'Content-Type': 'image/png' } });
    } }, async base => {
        const path = `${base}/avatar?url=https://p19.tiktokcdn.com/avatar.webp`;
        assert.equal((await fetch(path)).status, 502);
        assert.equal((await fetch(path)).status, 200);
        assert.equal(calls, 2);
        assert.equal((await fetch(path, { headers: { Origin: 'https://example.com' } })).status, 403);
    });
});
