'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { GiftBursts } = require('../src/gift-bursts');

test('same gift can present again at one second even while spam continues', () => {
    let time = 0;
    const bursts = new GiftBursts({ now: () => time });
    const gift = { userId: 'alice', giftId: 'rose' };
    assert.equal(bursts.allowPresentation(gift), true);
    for (let index = 0; index < 9; index++) {
        time += 100;
        assert.equal(bursts.allowPresentation(gift), false);
    }
    time = 999; assert.equal(bursts.allowPresentation(gift), false);
    time = 1000; assert.equal(bursts.allowPresentation(gift), true);
    time = 1999; assert.equal(bursts.allowPresentation(gift), false);
    time = 2000; assert.equal(bursts.allowPresentation(gift), true);
});

test('changing gifts presents immediately including switching back within one second', () => {
    const bursts = new GiftBursts({ now: () => 0 });
    const rose = { userId: 'alice', giftId: 'rose' };
    const heart = { userId: 'alice', giftId: 'heart' };
    assert.equal(bursts.allowPresentation(rose), true);
    assert.equal(bursts.allowPresentation(heart), true);
    assert.equal(bursts.allowPresentation(rose), true);
    assert.equal(bursts.allowPresentation(rose), false);
    assert.equal(bursts.allowPresentation({ userId: 'alice', giftName: 'Gift without ID' }), true);
});

test('senders are independent and clearing a session starts fresh', () => {
    const bursts = new GiftBursts({ now: () => 0 });
    const gift = { userId: 'alice', giftId: 'rose' };
    assert.equal(bursts.allowPresentation(gift), true);
    assert.equal(bursts.allowPresentation({ ...gift, userId: 'bob' }), true);
    assert.equal(bursts.allowPresentation(gift), false);
    assert.equal(bursts.allowPresentation(), false);
    bursts.clear(); assert.equal(bursts.allowPresentation(gift), true);
});
