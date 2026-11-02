'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { SessionStore } = require('../src/session-store');

test('manual backups capture current data immediately and survive later autosaves and resets', t => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'barclub-backup-'));
    t.after(() => {
        assert.equal(path.dirname(path.resolve(directory)), path.resolve(os.tmpdir()));
        fs.rmSync(directory, { recursive: true, force: true });
    });
    const file = path.join(directory, 'session.json');
    const store = new SessionStore(file);
    const state = { username: 'creator', guestDjUserId: 'alice', metrics: { diamonds: 349 },
        players: [{ userId: 'alice', nickname: 'Ánh 🤍', giftPower: 349 }],
        vipScores: [{ userId: 'alice', score: 349 }], removedPlayers: ['removed'] };
    store.schedule(state);
    const first = store.backup(state);
    const backupFile = path.join(directory, 'backups', first.fileName);
    const original = fs.readFileSync(backupFile, 'utf8');
    assert.equal(fs.existsSync(file), false, 'backup does not depend on the delayed autosave');
    const saved = JSON.parse(original);
    assert.deepEqual(saved, { ...state, version: 1, savedAt: first.savedAt });
    const second = store.backup(state);
    assert.notEqual(second.fileName, first.fileName);
    state.vipScores[0].score = 500;
    store.schedule({ metrics: { diamonds: 0 }, players: [], vipScores: [], guestDjUserId: '' }); store.flush();
    assert.equal(fs.readFileSync(backupFile, 'utf8'), original);
    assert.equal(fs.readdirSync(path.join(directory, 'backups')).length, 2);
    assert.ok(fs.readdirSync(path.join(directory, 'backups')).every(name => name.endsWith('.json')));
});
