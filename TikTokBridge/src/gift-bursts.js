'use strict';

// Suppress repeats of the same gift for one second; changing gifts always presents.
class GiftBursts {
    constructor({ now = Date.now, cooldownMs = 1000 } = {}) {
        this.now = now;
        this.cooldownMs = cooldownMs;
        this.lastPresentation = new Map();
    }

    allowPresentation({ userId, giftId, giftName } = {}) {
        if (!userId) return false;
        const now = this.now();
        const giftKey = giftId ? `id:${giftId}` : `name:${String(giftName || '').trim().toLowerCase()}`;
        const last = this.lastPresentation.get(userId);
        if (last && last.giftKey === giftKey && now - last.at < this.cooldownMs) return false;
        this.lastPresentation.set(userId, { giftKey, at: now });
        if (this.lastPresentation.size > 2000) {
            for (const [id, previous] of this.lastPresentation)
                if (now - previous.at >= this.cooldownMs) this.lastPresentation.delete(id);
        }
        return true;
    }

    clear() { this.lastPresentation.clear(); }
}

module.exports = { GiftBursts };
