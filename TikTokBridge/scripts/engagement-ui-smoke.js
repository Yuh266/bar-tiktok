'use strict';
const { chromium } = require('@playwright/test');
const assert = require('node:assert/strict');
const path = require('node:path');

(async () => {
    const base = process.argv[2] || 'http://127.0.0.1:3100';
    if (new URL(base).hostname !== '127.0.0.1') throw new Error('Use an isolated loopback test bridge');
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
        const errors = []; page.on('pageerror', error => errors.push(error.message));
        await page.goto(`${base}/control.html`);
        await page.getByRole('button', { name: 'Tương tác', exact: true }).click();
        await page.waitForFunction(() => window.liveActivities?.state);
        if (await page.evaluate(() => window.liveActivities.state.auto?.enabled)) {
            await page.getByRole('button', { name: 'Tạm dừng tự chạy', exact: true }).click();
            await page.waitForFunction(() => !window.liveActivities.state.auto.enabled);
        }
        await page.locator('#auto-min-gap').fill('30');
        await page.locator('#auto-max-gap').fill('60');
        await page.getByRole('button', { name: 'Lưu thời gian nghỉ', exact: true }).click();
        await page.waitForFunction(() => window.liveActivities.state.auto.minGapSeconds === 30 && window.liveActivities.state.auto.maxGapSeconds === 60);
        await page.getByRole('button', { name: 'Bắt đầu đấu đội', exact: true }).click();
        await page.waitForFunction(() => window.liveActivities.state.activity === 'battle');
        assert.equal(await page.getByRole('button', { name: 'Mở bình chọn', exact: true }).isDisabled(), true);
        await page.getByRole('button', { name: 'Kết thúc sớm', exact: true }).click();
        await page.waitForFunction(() => window.liveActivities.state.activity === '');
        await page.getByRole('button', { name: 'Mở bình chọn', exact: true }).click();
        await page.waitForFunction(() => window.liveActivities.state.activity === 'vote');
        await page.getByRole('button', { name: 'Kết thúc sớm', exact: true }).click();
        await page.waitForFunction(() => window.liveActivities.state.activity === '');
        await page.getByRole('button', { name: 'Mở thử thách', exact: true }).click();
        await page.waitForFunction(() => window.liveActivities.state.activity === 'dance');
        await page.getByRole('button', { name: 'Kết thúc sớm', exact: true }).click();
        await page.waitForFunction(() => window.liveActivities.state.activity === '');
        await page.getByRole('button', { name: 'Dung nham', exact: true }).click();
        await page.waitForFunction(() => window.liveActivities.state.floorTheme === 'lava');
        await page.getByRole('button', { name: 'Neon lục giác', exact: true }).click();
        await page.waitForFunction(() => window.liveActivities.state.floorTheme === 'neon');
        await page.locator('#energy-goal').fill('3000');
        await page.getByRole('button', { name: 'Áp dụng mốc', exact: true }).click();
        await page.waitForFunction(() => window.liveActivities.state.energy.goal === 3000);
        const voices = await page.evaluate(() => speechSynthesis.getVoices().map(voice => ({ name: voice.name, lang: voice.lang })));
        console.log(JSON.stringify({ availableVoices: voices }));
        await page.getByRole('button', { name: 'Bật đọc cảm ơn', exact: true }).click();
        await page.waitForFunction(() => document.getElementById('speech-toggle').textContent === 'Tắt đọc cảm ơn');
        await page.getByRole('button', { name: 'Tắt đọc cảm ơn', exact: true }).click();
        await page.evaluate(() => {
            const speak = speechSynthesis.speak.bind(speechSynthesis);
            speechSynthesis.speak = utterance => {
                utterance.addEventListener('end', () => { window.speechTestResult = 'ended'; });
                utterance.addEventListener('error', event => { window.speechTestResult = event.error; });
                speak(utterance);
            };
        });
        await page.getByRole('button', { name: 'Nghe thử', exact: true }).click();
        await page.waitForFunction(() => window.speechTestResult, { timeout: 20000 });
        assert.equal(await page.evaluate(() => window.speechTestResult), 'ended', 'Vietnamese speech should finish successfully');
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({ path: path.resolve(__dirname, '../../docs/media/engagement-control.png'), fullPage: true });
        await page.setViewportSize({ width: 390, height: 844 });
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
        assert.equal(overflow, false, 'Mobile layout must not scroll horizontally');
        assert.deepEqual(errors, []);
        console.log('Engagement control UI smoke passed');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
