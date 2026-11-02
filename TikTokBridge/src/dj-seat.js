'use strict';
const { normalizeText } = require('./master/rules');
const NAMES = new Set(['electro vibes', 'electro mai đinh', 'electro mai dinh']);

class DjSeat {
    constructor(userId = '') { this.userId = typeof userId === 'string' ? userId : ''; }
    claim(event) {
        if (event.type === 'gift' && event.action === 'topdj' && event.userId &&
            !event.spectatorOnly && !event.suppressGiftPresentation &&
            (String(event.giftId) === '166583' || NAMES.has(normalizeText(event.giftName))))
            this.userId = event.userId;
        return this.userId;
    }
    clear() { this.userId = ''; }
}
module.exports = { DjSeat };
