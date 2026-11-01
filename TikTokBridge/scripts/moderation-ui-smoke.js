'use strict';
const { chromium } = require('@playwright/test');
const WebSocket = require('ws');
const assert = require('node:assert/strict');
const path = require('node:path');

(async () => {
    const base = new URL(process.argv[2] || 'http://127.0.0.1:3100');
    if (base.hostname !== '127.0.0.1' || base.port === '3000') throw new Error('Use an isolated test bridge');
    const socket = new WebSocket(`ws://${base.host}`);
    await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
    socket.send(JSON.stringify({ type: 'register', role: 'control' }));
    const seed = (name, value) => socket.send(JSON.stringify({ type: 'demo_event', action: 'gift', manualUsername: name, value }));
    seed('demo-admin-an', 5); seed('demo-admin-binh', 2);
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    let page;
    try {
        page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
        page.setDefaultTimeout(10000);
        const errors = []; page.on('pageerror', error => errors.push(error.message));
        await page.goto(`${base.origin}/control.html`);
        await page.getByRole('button', { name: 'Người chơi', exact: true }).click();
        await page.waitForFunction(() => window.floorModeration.players.length === 2);
        await page.getByRole('button', { name: 'Reset BXH quà tặng', exact: true }).click();
        await page.getByRole('button', { name: 'Hủy', exact: true }).click();
        assert.equal(await page.locator('#moderation-leaderboard li').count(), 2);
        await page.getByRole('button', { name: 'Reset BXH quà tặng', exact: true }).click();
        await page.getByRole('button', { name: 'Xác nhận reset BXH', exact: true }).click();
        await page.waitForFunction(() => window.floorModeration.vipScores.length === 0);
        assert.equal(await page.locator('#floor-player-list tr').count(), 2);
        await page.locator('#floor-player-search').fill('admin-an');
        assert.equal(await page.locator('#floor-player-list tr').count(), 1);
        assert.match(await page.locator('#floor-player-match-count').textContent(), /1 \/ 2/);
        await page.getByRole('button', { name: 'Kick khỏi sàn', exact: true }).click();
        await page.waitForFunction(() => !window.floorModeration.players.some(p => p.userId === 'demo-admin-an'));
        await page.locator('#floor-player-search').fill('');
        assert.equal(await page.locator('#floor-player-list tr').count(), 1);
        seed('demo-admin-an', 1);
        await page.waitForFunction(() => window.floorModeration.players.length === 2);
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({ path: path.resolve(__dirname, '../../docs/media/moderation-control.png'), fullPage: true });
        await page.setViewportSize({ width: 390, height: 844 });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        assert.deepEqual(errors, []);
        console.log('Moderation UI smoke passed');
    } finally { socket.close(); if (page && !page.isClosed()) await page.close(); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
