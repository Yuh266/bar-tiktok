(function (root) {
    'use strict';
    function spoken(value, fallback) {
        return String(value || '').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 48) || fallback;
    }
    function thanksText(gift) {
        const name = spoken(gift.nickname, 'bạn');
        const giftName = spoken(gift.giftName, 'quà');
        return `Cảm ơn ${name} đã tặng ${Math.max(1, Number(gift.repeatCount) || 1)} ${giftName} nhé!`;
    }
    class GiftSpeechQueue {
        constructor({ speak, cancel = () => {}, blocked = () => {}, now = Date.now }) {
            this.speak = speak; this.cancel = cancel; this.now = now;
            this.blocked = blocked;
            this.pending = new Map(); this.queue = []; this.active = false; this.paused = false; this.generation = 0;
        }
        enqueue(gift) {
            const key = `${gift.userId}|${gift.giftId || gift.giftName}`;
            const existing = this.pending.get(key);
            if (existing) {
                existing.gift.repeatCount += Math.max(1, Number(gift.repeatCount) || 1);
                return;
            }
            const entry = { gift: { ...gift, repeatCount: Math.max(1, Number(gift.repeatCount) || 1) }, at: this.now() };
            entry.timer = setTimeout(() => this.flush(key), 200);
            this.pending.set(key, entry);
        }
        flush(key) {
            const entries = key ? [[key, this.pending.get(key)]] : [...this.pending.entries()];
            for (const [id, entry] of entries) {
                if (!entry) continue;
                clearTimeout(entry.timer); this.pending.delete(id);
                this.queue.push({ text: thanksText(entry.gift), at: entry.at });
            }
            if (this.queue.length > 20) {
                this.queue.splice(10, this.queue.length - 10,
                    { text: 'Cảm ơn tất cả các bạn vừa tặng quà cho cả phòng nhé!', at: this.now() });
            }
            this.pump();
        }
        pump() {
            if (this.active || this.paused) return;
            while (this.queue.length && this.now() - this.queue[0].at > 45000) this.queue.shift();
            const entry = this.queue.shift();
            if (!entry) return;
            this.active = true;
            const generation = this.generation;
            let finished = false;
            const done = error => {
                if (finished || generation !== this.generation) return;
                finished = true; clearTimeout(watchdog); this.active = false;
                if (error === 'not-allowed') {
                    this.queue.unshift(entry); this.paused = true; this.blocked(); return;
                }
                this.pump();
            };
            const watchdog = this.watchdog = setTimeout(() => { this.cancel(); done(); }, 15000);
            try { this.speak(entry.text, done); } catch { done(); }
        }
        stop() {
            this.generation++;
            clearTimeout(this.watchdog);
            for (const entry of this.pending.values()) clearTimeout(entry.timer);
            this.pending.clear(); this.queue = []; this.active = false; this.paused = false; this.cancel();
        }
        resume() { this.paused = false; this.pump(); }
    }
    if (typeof module !== 'undefined') module.exports = { GiftSpeechQueue, thanksText };
    else { root.GiftSpeechQueue = GiftSpeechQueue; root.thanksText = thanksText; }
})(typeof window === 'undefined' ? globalThis : window);
