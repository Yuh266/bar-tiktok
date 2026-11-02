'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { DjSeat } = require('../src/dj-seat');
const { sanitizeMasterConfig, resolveMasterRule, applyRule } = require('../src/master/rules');
const master = sanitizeMasterConfig(require('../config/master.json'));
const electro = userId => applyRule({ type: 'gift', userId, giftId: '166583', giftName: 'Electro Vibes', diamondCount: 349 },
    resolveMasterRule(master, { type: 'gift', giftId: '166583', giftName: 'Electro Vibes' }));

test('Electro Vibes claims the DJ seat, independent of rank and effect duration', () => {
    const seat = new DjSeat();
    const gift = electro('viewer-a');
    assert.equal(gift.action, 'topdj');
    assert.equal(seat.claim(gift), 'viewer-a');
    assert.equal(seat.claim({ type: 'like', userId: 'viewer-b' }), 'viewer-a');
    assert.equal(new DjSeat(seat.userId).userId, 'viewer-a');
});

test('only another Electro Vibes giver replaces the current DJ', () => {
    const seat = new DjSeat('viewer-a');
    assert.equal(seat.claim(electro('viewer-a')), 'viewer-a');
    assert.equal(seat.claim({ ...electro('viewer-b'), giftId: '999', giftName: 'Galaxy', diamondCount: 1000 }), 'viewer-a');
    assert.equal(seat.claim(electro('viewer-b')), 'viewer-b');
    seat.clear();
    assert.equal(seat.userId, '');
});

test('localized gift aliases claim the same seat and suppressed events cannot replace it', () => {
    const seat = new DjSeat('viewer-a');
    assert.equal(seat.claim({ ...electro('viewer-b'), suppressGiftPresentation: true }), 'viewer-a');
    assert.equal(seat.claim({ ...electro('viewer-b'), spectatorOnly: true }), 'viewer-a');
    const gift = { ...electro('viewer-b'), giftId: 'regional-id', giftName: 'Electro mãi đỉnh' };
    assert.equal(seat.claim(gift), 'viewer-b');
});
