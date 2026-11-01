'use strict';
const fs = require('node:fs');
const path = require('node:path');

class SessionStore {
    constructor(file) { this.file = file; this.timer = null; this.latest = null; }
    load() {
        if (!fs.existsSync(this.file)) return null;
        const state = JSON.parse(fs.readFileSync(this.file, 'utf8'));
        return state.version === 1 && Date.now() - state.savedAt < 12 * 60 * 60 * 1000 ? state : null;
    }
    schedule(state) {
        this.latest = state;
        if (this.timer) return;
        this.timer = setTimeout(() => {
            this.timer = null;
            try { this.flush(); } catch (error) { console.error('Could not checkpoint LIVE session:', error.message); }
        }, 1000);
        this.timer.unref();
    }
    flush() {
        if (!this.latest) return;
        clearTimeout(this.timer); this.timer = null;
        fs.mkdirSync(path.dirname(this.file), { recursive: true });
        fs.writeFileSync(`${this.file}.tmp`, JSON.stringify({ ...this.latest, version: 1, savedAt: Date.now() }));
        fs.renameSync(`${this.file}.tmp`, this.file);
    }
}
module.exports = { SessionStore };
