'use strict';
const { chromium } = require('@playwright/test');
const assert = require('node:assert/strict');

(async () => {
    const base = process.argv[2] || 'http://127.0.0.1:3100';
    if (new URL(base).hostname !== '127.0.0.1' || new URL(base).port === '3000') throw new Error('Use an isolated loopback test bridge');
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    console.log('Test browser launched');
    try {
        const context = await browser.newContext();
        // Deterministically model the browser refusing audio until the first user gesture.
        await context.addInitScript(() => {
            window.spokenGifts = []; window.refuseSpeech = true;
            Object.defineProperty(window, 'speechSynthesis', { value: {
                getVoices: () => [], addEventListener: () => {}, cancel: () => {},
                speak: utterance => {
                    window.spokenGifts.push(utterance.text);
                    if (window.refuseSpeech) { window.refuseSpeech = false; utterance.onerror?.({ error: 'not-allowed' }); }
                    else { utterance.onstart?.(); queueMicrotask(() => utterance.onend?.()); }
                }
            } });
        });
        const first = await context.newPage(); first.setDefaultTimeout(10000);
        const errors = []; context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
        first.on('pageerror', error => errors.push(error.message));
        await first.goto(`${base}/control.html`);
        console.log('First control page loaded');
        await first.waitForFunction(() => speechActive);
        await first.evaluate(() => window.liveActivities.onMessage({ type: 'gift_thanks', userId: 'test-only', nickname: 'Test Minh', giftName: 'Rose', repeatCount: 3 }));
        await first.waitForFunction(() => document.getElementById('speech-status').textContent.includes('chặn âm thanh'));
        assert.equal(await first.evaluate(() => window.spokenGifts.length), 1);
        await first.getByRole('button', { name: 'Tương tác', exact: true }).click();
        await first.waitForFunction(() => window.spokenGifts.length === 2 && !speechBlocked);
        console.log('Automatic speech and gesture retry passed');
        assert.equal(await first.evaluate(() => window.spokenGifts[0] === window.spokenGifts[1]), true);
        const second = await context.newPage(); second.setDefaultTimeout(10000);
        await second.goto(`${base}/control.html`);
        await second.waitForFunction(() => speechElsewhere && !speechActive);
        assert.equal(await first.evaluate(() => speechActive), true);
        await first.close();
        await second.waitForFunction(() => speechActive && !speechElsewhere);
        console.log('Tab ownership handoff passed');
        await second.evaluate(() => socket.close());
        await second.waitForFunction(() => !speechActive);
        await second.waitForFunction(() => speechActive);
        console.log('WebSocket reconnect passed');
        await second.getByRole('button', { name: 'Tương tác', exact: true }).click();
        await second.getByRole('button', { name: 'Tắt đọc cảm ơn', exact: true }).click();
        await second.waitForFunction(() => !speechActive && !speechWanted);
        await second.reload();
        await second.waitForFunction(() => window.liveActivities?.state && !speechActive && !speechWanted);
        await second.getByRole('button', { name: 'Tương tác', exact: true }).click();
        await second.getByRole('button', { name: 'Bật đọc cảm ơn', exact: true }).click();
        await second.waitForFunction(() => speechActive);
        await second.reload();
        await second.waitForFunction(() => speechActive);
        assert.deepEqual(errors, []);
        await context.close();
        console.log('Speech default-on, blocked-audio retry, single owner, tab handoff, reconnect and saved preference passed');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
