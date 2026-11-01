const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { buildViewerGuide } = require('../src/viewer-guide');
const { LikeMilestones } = require('../src/like-milestones');
const master = require('../config/master.json');
const catalog = require('../config/gift-catalog.json');
const observed = new Map(require('../config/observed-gifts.json').map(g => [g.giftId, g]));

test('100 free likes are not a 100-coin gift', () => {
    const guide = buildViewerGuide(master, observed, catalog);
    const likes = guide.guideItems.find(item => item.source === 'like');
    assert.equal(likes.requiredLikes, 100);
    assert.equal(likes.coinCount, 0);
    assert.equal(likes.diamondCount, 0);
    assert.equal(likes.action, 'grow');
    assert.ok(!guide.guideItems.some(item => item.source === 'gift' && item.giftName === 'tim'));
});

test('every active guide item ships a local icon, even before receiving live gifts', () => {
    const guide = buildViewerGuide(master, new Map(), catalog);
    for (const item of guide.guideItems) {
        assert.ok(item.iconResource, item.giftName);
        assert.ok(fs.existsSync(path.join(__dirname, '../../UnityProject/Assets/Resources', item.iconResource + '.png')), item.giftName);
    }
});

test('unverified manual gift prices are not presented as verified coin prices', () => {
    const guide = buildViewerGuide({ rules: [{ enabled: true, source: 'gift', trigger: 'Unknown gift', action: 'grow', displayDiamonds: 100 }] }, new Map(), []);
    const gift = guide.guideItems.find(item => item.source === 'gift');
    assert.equal(gift.priceVerified, false);
    assert.equal(gift.coinCount, 0);
});

test('catalog aliases work before the first gift and live values take precedence', () => {
    const config = { rules: [{ enabled: true, source: 'gift', giftId: '5655', trigger: 'hoa hong', action: 'camera' }] };
    const gift = buildViewerGuide(config, new Map([['5655', { giftId: '5655', giftName: 'Live Rose', diamondCount: 2 }]]), catalog).guideItems[1];
    assert.equal(gift.coinCount, 2);
    assert.equal(gift.giftName, 'Live Rose');
    assert.ok(gift.iconResource);
});

test('likes accumulate per viewer and trigger only after reaching 100', () => {
    const counter = new LikeMilestones();
    const a = counter.apply({ type: 'like', userId: 'a', likeCount: 99 });
    assert.equal(a.likeMilestone, undefined);
    assert.equal(counter.apply({ type: 'like', userId: 'b', likeCount: 1 }).likeMilestone, undefined);
    const milestone = counter.apply({ type: 'like', userId: 'a', likeCount: 1, spectatorOnly: true, diamondCount: 100 });
    assert.equal(milestone.likeMilestone, true);
    assert.equal(milestone.action, 'grow');
    assert.equal(milestone.diamondCount, 0);
    assert.equal(milestone.spectatorOnly, false);
    assert.equal(counter.apply({ type: 'like', userId: 'a', likeCount: 1 }).likeMilestone, undefined);
});

test('likes reset with the session and paid gifts never count as likes', () => {
    const counter = new LikeMilestones();
    const gift = { type: 'gift', userId: 'a', diamondCount: 100, likeCount: 100 };
    assert.deepEqual(counter.apply(gift), gift);
    assert.equal(gift.likeMilestone, undefined);
    counter.apply({ type: 'like', userId: 'a', likeCount: 99 });
    counter.clear();
    assert.equal(counter.apply({ type: 'like', userId: 'a', likeCount: 1 }).likeMilestone, undefined);
});
