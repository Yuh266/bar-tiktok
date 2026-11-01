'use strict';
const { chromium } = require('@playwright/test');
const assert = require('node:assert/strict');
const path = require('node:path');
function wav(seconds) {
    const rate = 8000; const bytes = Buffer.alloc(44 + rate * seconds * 2);
    bytes.write('RIFF'); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write('WAVEfmt ', 8); bytes.writeUInt32LE(16, 16);
    bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(1, 22); bytes.writeUInt32LE(rate, 24); bytes.writeUInt32LE(rate * 2, 28);
    bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34); bytes.write('data', 36); bytes.writeUInt32LE(bytes.length - 44, 40);
    for (let index = 0; index < rate * seconds; index++) bytes.writeInt16LE(Math.round(Math.sin(index * 2 * Math.PI * 440 / rate) * 2000), 44 + index * 2);
    return bytes;
}
(async () => {
    const base = new URL(process.argv[2] || 'http://127.0.0.1:3100');
    if (base.hostname !== '127.0.0.1' || base.port === '3000') throw Error('Use an isolated bridge with a muted game');
    const browser = await chromium.launch({ channel: 'chrome', headless: true }); let page;
    console.log('Music test browser launched');
    try {
        page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }); page.setDefaultTimeout(15000);
        const errors = []; page.on('pageerror', error => errors.push(error.message));
        await page.goto(`${base.origin}/control.html`); await page.locator('[data-tab="music"]').click();
        console.log('Music control page loaded');
        await page.waitForFunction(() => window.musicControl?.state.playerConnected && window.musicControl.uploadToken);
        await page.locator('#music-files').setInputFiles([
            { name: 'Test Alpha.wav', mimeType: 'audio/wav', buffer: wav(90) },
            { name: 'Test Beta.wav', mimeType: 'audio/wav', buffer: wav(100) }
        ]);
        await page.locator('#music-upload').click();
        await page.waitForFunction(() => window.musicControl.tracks.length === 2 && window.musicControl.state.playing);
        console.log('Upload and native playback passed');
        const alpha = await page.evaluate(() => window.musicControl.tracks.find(t => t.name === 'Test Alpha.wav').id);
        const beta = await page.evaluate(() => window.musicControl.tracks.find(t => t.name === 'Test Beta.wav').id);
        await page.locator('#music-toggle').click();
        await page.waitForFunction(() => window.musicControl.state.paused && !window.musicControl.state.playing);
        await page.locator('#music-seek-input').fill('00:30'); await page.locator('#music-jump').click();
        await page.waitForFunction(() => window.musicControl.state.paused && Math.abs(window.musicControl.state.position - 30) < 0.5);
        await page.waitForTimeout(1100);
        assert.ok(Math.abs(await page.evaluate(() => window.musicControl.state.position) - 30) < 0.5);
        await page.locator('#music-toggle').click(); await page.waitForFunction(() => window.musicControl.state.playing);
        await page.getByRole('button', { name: 'Phát Test Beta.wav', exact: true }).click();
        await page.waitForFunction(id => window.musicControl.state.trackId === id && window.musicControl.state.playing, beta);
        await page.locator('#music-forward').click(); await page.waitForFunction(() => window.musicControl.state.position >= 10);
        await page.locator('#music-back').click(); await page.waitForFunction(() => window.musicControl.state.position < 5);
        await page.locator('#music-previous').click(); await page.waitForFunction(id => window.musicControl.state.trackId === id && window.musicControl.state.playing, alpha);
        await page.locator('#music-next').click(); await page.waitForFunction(id => window.musicControl.state.trackId === id && window.musicControl.state.playing, beta);
        await page.locator('#music-seek-input').fill('00:20'); await page.locator('#music-jump').click();
        await page.waitForFunction(() => window.musicControl.state.position >= 20);
        await page.locator('#music-files').setInputFiles({ name: 'Test Gamma.wav', mimeType: 'audio/wav', buffer: wav(90) });
        await page.locator('#music-upload').click();
        await page.waitForFunction(id => window.musicControl.tracks.length === 3 && window.musicControl.state.trackId === id && window.musicControl.state.position >= 20, beta);
        console.log('Pause, seek, skip and upload without restarting playback passed');
        const box = await page.locator('#music-seek').boundingBox();
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        await page.waitForFunction(() => window.musicControl.state.position > 45 && window.musicControl.state.position < 55);
        await page.locator('#music-seek-input').fill('01:39'); await page.locator('#music-jump').click();
        await page.waitForFunction(() => window.musicControl.tracks.find(t => t.id === window.musicControl.state.trackId)?.name === 'Test Gamma.wav' && window.musicControl.state.playing);
        await page.screenshot({ path: path.resolve(__dirname, '../../docs/media/music-control.png'), fullPage: true });
        await page.setViewportSize({ width: 390, height: 844 });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        await page.reload(); await page.locator('[data-tab="music"]').click();
        await page.waitForFunction(() => window.musicControl.state.playerConnected && window.musicControl.tracks.length === 3);
        assert.deepEqual(errors, []);
        console.log('Music UI and real Unity playback smoke passed');
    } finally { if (page && !page.isClosed()) await page.close(); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
