'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeGift } = require('../src/tiktok/normalize-event');
const { sanitizeMasterConfig, resolveMasterRule, applyRule } = require('../src/master/rules');
const { buildViewerGuide } = require('../src/viewer-guide');
const master = sanitizeMasterConfig(require('../config/master.json'));
const catalog = require('../config/gift-catalog.json');

test('real Finger Heart IDs trigger dragon flight while preserving every coin in a combo', () => {
    for (const repeatCount of [1, 3]) {
        const event = normalizeGift({ userId: 'viewer', giftId: 5487, giftName: 'Gift', diamondCount: 5, repeatCount });
        const applied = applyRule(event, resolveMasterRule(master, event));
        assert.equal(applied.action, 'dragon');
        assert.equal(applied.durationMs, 5000);
        assert.equal(applied.diamondCount, 5 * repeatCount);
    }
    assert.equal(resolveMasterRule(master, { type: 'gift', giftName: 'Trái tim ngón tay' }).action, 'dragon');
});

test('viewer guide presents dragon riding with the verified five-coin Finger Heart icon', () => {
    const guide = buildViewerGuide(master, new Map(), catalog);
    const dragon = guide.guideItems.find(item => item.action === 'dragon');
    assert.equal(dragon.giftId, '5487');
    assert.equal(dragon.coinCount, 5);
    assert.equal(dragon.priceVerified, true);
    assert.equal(dragon.iconResource, 'GiftIcons/5487');
});
