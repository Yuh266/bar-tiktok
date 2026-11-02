'use strict';
const { normalizeText } = require('./master/rules');
const order = new Map([['camera', 0], ['change', 1], ['walk', 2], ['medal', 3], ['fireworks', 4], ['grow', 5], ['topdj', 6], ['dragon', 7]]);

function buildViewerGuide(master, observed, catalog, likeThreshold = 100) {
    const join = (master.rules || []).find(r => r.enabled && r.source === 'chat' && r.action === 'join');
    const items = (master.rules || []).filter(r => r.enabled && r.source === 'gift' && order.has(r.action))
        .sort((a, b) => order.get(a.action) - order.get(b.action)).slice(0, 12).map(rule => {
            const aliases = String(rule.trigger || '').split(',').map(normalizeText).filter(Boolean);
            const matches = item => rule.giftId ? item.giftId === rule.giftId : aliases.includes(normalizeText(item.giftName));
            const learned = [...observed.values()].find(matches);
            const verified = catalog.find(matches);
            const id = rule.giftId || learned?.giftId || verified?.giftId || '';
            const coinCount = Number(learned?.diamondCount) || Number(verified?.coinCount) || 0;
            return {
                giftId: id, source: 'gift', action: rule.action,
                giftName: learned?.giftName || String(rule.trigger || '').split(',')[0].trim() || verified?.giftName || 'Quà tặng',
                coinCount, diamondCount: coinCount, priceVerified: coinCount > 0 && Boolean(learned || verified),
                giftPictureUrl: learned?.giftPictureUrl || verified?.giftPictureUrl || '',
                iconResource: verified ? `GiftIcons/${id}` : '', label: rule.label || rule.action
            };
        });
    items.unshift({ source: 'like', giftId: '', giftName: `${likeThreshold} tim mỗi người`,
        requiredLikes: likeThreshold, action: 'grow', coinCount: 0, diamondCount: 0,
        priceVerified: true, iconResource: 'GiftIcons/like-heart', giftPictureUrl: '', label: 'Nhân vật khổng lồ' });
    return { type: 'viewer_guide', joinCommand: join ? String(join.trigger || '').split(',')[0].trim() : '', guideItems: items };
}
module.exports = { buildViewerGuide };
