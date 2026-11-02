'use strict';
const { chromium } = require('@playwright/test');
const { spawn } = require('node:child_process');
const WebSocket = require('ws');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'barclub-backup-ui-'));
    const listener = net.createServer();
    await new Promise(resolve => listener.listen(0, '127.0.0.1', resolve));
    const port = listener.address().port;
    await new Promise(resolve => listener.close(resolve));
    const child = spawn(process.execPath, ['server.js'], { cwd: path.join(__dirname, '..'), windowsHide: true,
        env: { ...process.env, HOST: '127.0.0.1', PORT: String(port), DATA_DIR: directory }, stdio: 'ignore' });
    let socket, browser;
    const stop = async () => {
        if (child.exitCode === null) { const done = new Promise(resolve => child.once('exit', resolve)); child.kill(); await done; }
    };
    try {
        let ready = false;
        for (let i = 0; i < 150; i++) {
            try { if ((await fetch(`http://127.0.0.1:${port}/api/health`)).ok) { ready = true; break; } } catch { /* startup */ }
            await sleep(25);
        }
        assert.ok(ready, 'Isolated bridge started');
        socket = new WebSocket(`ws://127.0.0.1:${port}`);
        await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
        socket.send(JSON.stringify({ type: 'register', role: 'control' }));
        socket.send(JSON.stringify({ type: 'demo_event', action: 'gift', manualUsername: 'demo-backup-anh', giftName: 'Electro Vibes', value: 349 }));
        browser = await chromium.launch({ channel: 'chrome', headless: true });
        const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
        page.setDefaultTimeout(10000);
        const errors = []; page.on('pageerror', error => errors.push(error.message));
        await page.goto(`http://127.0.0.1:${port}/control.html`);
        await page.getByRole('button', { name: 'Session', exact: true }).click();
        await page.waitForFunction(() => window.sessionBackup?.connected);
        await page.getByRole('button', { name: 'Sao lưu', exact: true }).click();
        await page.waitForFunction(() => document.getElementById('session-backup-status').textContent.startsWith('Đã sao lưu lúc'));
        const first = await page.locator('#session-backup-file').textContent();
        assert.match(first, /^session-manual-[\w.-]+\.json$/);
        const backup = JSON.parse(fs.readFileSync(path.join(directory, 'backups', first), 'utf8'));
        assert.equal(backup.guestDjUserId, 'demo-backup-anh');
        assert.equal(backup.vipScores[0].score, 349);
        assert.match(await page.locator('#session-backup-status').textContent(), /1 người tặng quà · 349 xu/);
        await page.getByRole('button', { name: 'Sao lưu', exact: true }).click();
        await page.waitForFunction(previous => document.getElementById('session-backup-file').textContent !== previous, first);
        assert.equal(fs.readdirSync(path.join(directory, 'backups')).length, 2);
        await page.screenshot({ path: path.resolve(__dirname, '../../docs/media/session-backup-control.png'), fullPage: true });
        await page.setViewportSize({ width: 390, height: 844 });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'Mobile view does not overflow');
        await stop();
        await page.waitForFunction(() => !window.sessionBackup.connected);
        assert.equal(await page.locator('#session-backup').isDisabled(), true);
        assert.deepEqual(errors, []);
        console.log('Backup UI passed: click creates real files, repeat saves keep both copies, mobile layout and disconnect state work.');
    } finally {
        socket?.terminate();
        if (browser) await browser.close();
        await stop();
        assert.equal(path.dirname(path.resolve(directory)), path.resolve(os.tmpdir()));
        fs.rmSync(directory, { recursive: true, force: true });
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
