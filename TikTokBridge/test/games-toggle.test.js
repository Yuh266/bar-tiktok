'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { EngagementEngine } = require('../src/engagement');

test('turning games off cancels the active round without a result or winner and clears teams', () => {
    let time = 100000;
    const engine = new EngagementEngine({ now: () => time, config: { autoEnabled: true } });
    engine.command('battle_start', { seconds: 30 });
    engine.process({ type: 'chat', userId: 'viewer', nickname: 'Viewer', comment: 'đỏ' });
    time += 30000;
    const state = engine.command('games_config', { enabled: false });
    assert.equal(state.gamesEnabled, false); assert.equal(state.activity, '');
    assert.equal(state.resultUntil, 0); assert.equal(state.lastResult, '');
    assert.equal(state.battle.status, 'idle'); assert.deepEqual(state.battle.winnerUserIds, []);
    assert.equal(state.members[0].team, '');
    assert.equal(state.auto.enabled, false); assert.equal(state.auto.nextAt, 0);
    engine.process({ type: 'like', userId: 'viewer', nickname: 'Viewer', likeCount: 100000 });
    assert.equal(engine.energy.celebrations, 50);
    assert.equal(engine.energy.value, 0);
    assert.ok(engine.energy.partyUntil > time);
    time += 3600000; engine.tick(); assert.equal(engine.activity, '');
    assert.throws(() => engine.command('vote_start'), /đang tắt/);
    assert.throws(() => engine.command('auto_config', { enabled: true }), /Bật trò chơi/);
});

test('game switch survives reconstruction, leaves floor control usable and can enable games again', () => {
    let time = 100000;
    const engine = new EngagementEngine({ now: () => time, config: { autoEnabled: true } });
    engine.command('games_config', { enabled: false });
    engine.command('floor_set', { theme: 'classic' });
    const restored = new EngagementEngine({ now: () => time, config: engine.settings() });
    assert.equal(restored.snapshot().gamesEnabled, false);
    assert.equal(restored.floorTheme, 'classic');
    restored.command('games_config', { enabled: true });
    time += 15000; restored.tick(); assert.ok(restored.activity);
    assert.equal(restored.snapshot().gamesEnabled, true);
});
