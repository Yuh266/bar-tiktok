'use strict';
const { chromium } = require('@playwright/test');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
(async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'barclub-games-toggle-'));
    const listener = net.createServer(); await new Promise(resolve => listener.listen(0, '127.0.0.1', resolve));
    const port = listener.address().port; await new Promise(resolve => listener.close(resolve));
    let child, browser;
    const stop = async () => { if (child && child.exitCode === null) { const done = new Promise(resolve => child.once('exit', resolve)); child.kill(); await done; } };
    const start = async () => {
        child = spawn(process.execPath, ['server.js'], { cwd: path.join(__dirname, '..'), windowsHide: true,
            env: { ...process.env, HOST: '127.0.0.1', PORT: String(port), DATA_DIR: directory }, stdio: 'ignore' });
        for (let i = 0; i < 150; i++) {
            try { if ((await fetch(`http://127.0.0.1:${port}/api/health`)).ok) return; } catch { /* startup */ }
            await sleep(25);
        }
        throw Error('Isolated bridge failed to start');
    };
    try {
        await start(); browser = await chromium.launch({ channel: 'chrome', headless: true });
        const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }); page.setDefaultTimeout(10000);
        const errors = []; page.on('pageerror', e => errors.push(e.message));
        await page.goto(`http://127.0.0.1:${port}/control.html`);
        await page.locator('[data-tab="engagement"]').click();
        await page.waitForFunction(() => window.liveActivities?.state);
        await page.getByRole('button', { name: 'Bắt đầu đấu đội', exact: true }).click();
        await page.waitForFunction(() => window.liveActivities.state.activity === 'battle');
        await page.getByRole('button', { name: 'Tắt trò chơi', exact: true }).click();
        await page.waitForFunction(() => window.liveActivities.state.gamesEnabled === false);
        assert.equal(await page.evaluate(() => window.liveActivities.state.activity), '');
        assert.equal(await page.evaluate(() => window.liveActivities.state.resultUntil), 0);
        assert.equal(await page.getByRole('button', { name: 'Bắt đầu đấu đội', exact: true }).isDisabled(), true);
        assert.match(await page.locator('#games-status').textContent(), /Đã tắt trò chơi và ẩn ô/);
        assert.equal(JSON.parse(fs.readFileSync(path.join(directory, 'engagement-settings.json'), 'utf8')).gamesEnabled, false);
        await page.screenshot({ path: path.resolve(__dirname, '../../docs/media/games-toggle-control.png'), fullPage: true });
        await stop(); await start();
        await page.reload(); await page.locator('[data-tab="engagement"]').click();
        await page.waitForFunction(() => window.liveActivities?.state?.gamesEnabled === false);
        await page.getByRole('button', { name: 'Bật trò chơi', exact: true }).click();
        await page.waitForFunction(() => window.liveActivities.state.gamesEnabled === true);
        await page.getByRole('button', { name: 'Mở bình chọn', exact: true }).click();
        await page.waitForFunction(() => window.liveActivities.state.activity === 'vote');
        await page.setViewportSize({ width: 390, height: 844 });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        assert.deepEqual(errors, []);
        console.log('Games switch passed: cancels active round, disables controls, persists across restart, enables again, mobile fits.');
    } finally {
        if (browser) await browser.close(); await stop();
        assert.equal(path.dirname(path.resolve(directory)), path.resolve(os.tmpdir()));
        fs.rmSync(directory, { recursive: true, force: true });
    }
})().catch(e => { console.error(e); process.exitCode = 1; });
