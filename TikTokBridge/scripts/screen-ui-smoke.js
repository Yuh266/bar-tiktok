'use strict';
const { chromium } = require('@playwright/test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
(async () => {
    const base = new URL(process.argv[2] || 'http://127.0.0.1:3100');
    if (base.hostname !== '127.0.0.1' || base.port === '3000') throw Error('Use an isolated test bridge and game');
    const captureDirectory = process.argv[3] || 'C:/tmp/barclub-screen-captures';
    const browser = await chromium.launch({ channel: 'chrome', headless: true }); let page;
    try {
        page = await browser.newPage({ viewport: { width: 1440, height: 1100 } }); page.setDefaultTimeout(15000);
        const errors = []; page.on('pageerror', error => errors.push(error.message));
        await page.goto(`${base.origin}/control.html`); await page.locator('[data-tab="screen"]').click();
        await page.waitForFunction(() => window.screenControl?.state.playerConnected && window.screenControl.uploadToken);
        const png = await sharp(Buffer.from('<svg width="1280" height="720"><rect width="1280" height="360" fill="#c52a30"/><rect y="360" width="1280" height="360" fill="#184ed2"/></svg>')).png().toBuffer();
        const jpg = await sharp({ create: { width: 1280, height: 720, channels: 3, background: '#12ab56' } }).jpeg().toBuffer();
        const video = await fs.readFile(path.resolve(__dirname, '../../DJ_VIDEO/00-dj-mixkit-835.mp4'));
        await page.locator('#screen-files').setInputFiles([
            { name: 'Test Ảnh A.png', mimeType: 'image/png', buffer: png },
            { name: 'Test Image B.jpg', mimeType: 'image/jpeg', buffer: jpg },
            { name: 'Test Video.mp4', mimeType: 'video/mp4', buffer: video }
        ]);
        await page.locator('#screen-upload').click(); await page.waitForFunction(() => window.screenControl.items.length === 3 && !window.screenControl.uploading);
        const apply = async () => {
            const old = await page.evaluate(() => window.screenControl.state.settings.revision);
            await page.locator('#screen-save').click();
            await page.waitForFunction(revision => window.screenControl.state.settings.revision > revision &&
                window.screenControl.state.report.revision === window.screenControl.state.settings.revision &&
                !window.screenControl.state.report.loading && !window.screenControl.state.report.error, old);
            return page.evaluate(() => window.screenControl.state.settings.revision);
        };
        const capture = async (revision, mode) => {
            const filename = path.join(captureDirectory, `screen-${revision}-${mode}.png`);
            for (let i = 0; i < 60; i++) { try { await fs.access(filename); return filename; } catch { await wait(100); } }
            throw Error(`Native capture missing: ${filename}`);
        };
        await page.locator('#screen-mode').selectOption('single');
        const imageId = await page.evaluate(() => window.screenControl.items.find(item => item.name === 'Test Ảnh A.png').id);
        await page.locator('#screen-single').selectOption(imageId);
        const imageRevision = await apply(); const imageCapture = await capture(imageRevision, 'single');
        const decoded = await sharp(imageCapture).raw().toBuffer({ resolveWithObject: true });
        const pixel = (x, y) => [...decoded.data.subarray((y * decoded.info.width + x) * decoded.info.channels, (y * decoded.info.width + x) * decoded.info.channels + 3)];
        assert.ok(pixel(640, 100)[0] > pixel(640, 100)[2], 'Image top should be red');
        assert.ok(pixel(640, 620)[2] > pixel(640, 620)[0], 'Image bottom should be blue');
        const videoId = await page.evaluate(() => window.screenControl.items.find(item => item.kind === 'video').id);
        await page.locator('#screen-single').selectOption(videoId); const videoRevision = await apply(); await capture(videoRevision, 'single');
        console.log('Native image orientation and video playback passed');
        await page.locator('#screen-select-all').click(); await page.locator('#screen-seconds').fill('2');
        await page.getByRole('button', { name: 'Đưa lên Test Video.mp4', exact: true }).click();
        await apply();
        const first = await page.evaluate(() => window.screenControl.state.report.currentId);
        await page.waitForFunction(id => window.screenControl.state.report.currentId !== id && window.screenControl.state.report.showing, first);
        await page.locator('#screen-next').click();
        console.log('Mixed slideshow, ordering and automatic transitions passed');
        await page.locator('#screen-mode').selectOption('text');
        await page.locator('#screen-text').fill('Chào mừng Bar Club!\nTHẢ TIM CÙNG NHAU');
        await page.locator('#screen-color').fill('#ffd44a'); await page.locator('#screen-background').fill('#06142b');
        const textRevision = await apply(); const textCapture = await capture(textRevision, 'text');
        const raw = await sharp(textCapture).raw().toBuffer({ resolveWithObject: true }); let gold = 0;
        for (let i = 0; i < raw.data.length; i += raw.info.channels) if (raw.data[i] > 140 && raw.data[i + 1] > 90 && raw.data[i + 2] < 130) gold++;
        assert.ok(gold > 500, 'Native screen should visibly render colored text');
        await fs.copyFile(textCapture, path.resolve(__dirname, '../../docs/media/dj-screen-text.png'));
        await page.screenshot({ path: path.resolve(__dirname, '../../docs/media/dj-screen-control.png'), fullPage: true });
        await page.locator('#screen-scroll').check(); await apply();
        await page.locator('#screen-refresh').click();
        assert.equal(await page.locator('#screen-scroll').isChecked(), true);
        await page.reload(); await page.locator('[data-tab="screen"]').click();
        await page.waitForFunction(() => window.screenControl.draft?.mode === 'text' && window.screenControl.draft.scroll);
        await page.setViewportSize({ width: 390, height: 844 });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        assert.deepEqual(errors, []);
        console.log('Screen text, marquee, persistence and mobile UI passed');
    } finally { if (page && !page.isClosed()) await page.close(); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
