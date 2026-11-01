'use strict';

class LikeMilestones {
    constructor(threshold = 100, maximumUsers = 2000) {
        this.threshold = threshold;
        this.maximumUsers = maximumUsers;
        this.counts = new Map();
    }
    clear() { this.counts.clear(); }
    apply(event) {
        if (event.type !== 'like' || !event.userId) return event;
        const total = (this.counts.get(event.userId) || 0) + Math.max(0, Number(event.likeCount) || 0);
        this.counts.delete(event.userId);
        this.counts.set(event.userId, total % this.threshold);
        if (this.counts.size > this.maximumUsers) this.counts.delete(this.counts.keys().next().value);
        event.diamondCount = 0;
        event.unitDiamondCount = 0;
        if (total >= this.threshold) {
            event.likeMilestone = true;
            event.action = 'grow';
            event.durationMs = 8000;
            event.label = `${this.threshold} TIM MIỄN PHÍ`;
            event.spectatorOnly = false;
        }
        return event;
    }
}
module.exports = { LikeMilestones };
