'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { EngagementEngine, ViewerStore, localDay } = require('../src/engagement');
const { SessionStore } = require('../src/session-store');
const { GiftSpeechQueue, thanksText } = require('../public/speech');

function setup() {
    let time = Date.UTC(2026, 10, 1, 12);
    const engine = new EngagementEngine({ now: () => time });
    const chat = (userId, comment) => engine.process({ type: 'chat', userId, nickname: userId, comment });
    const advance = ms => { time += ms; engine.tick(); };
    return { engine, chat, advance };
}

test('battle locks teams, caps each viewer at 300 likes, and awards a timed result', () => {
    const { engine, chat, advance } = setup();
    engine.command('battle_start', { seconds: 30 });
    chat('alice', 'đỏ'); chat('alice', 'xanh'); chat('bob', 'xanh');
    assert.equal(engine.teams.get('alice'), 'red');
    assert.equal(engine.battle.redMembers, 1);
    engine.process({ type: 'like', userId: 'alice', likeCount: 19 });
    assert.equal(engine.battle.red, 1);
    engine.process({ type: 'like', userId: 'alice', likeCount: 10000 });
    engine.process({ type: 'gift', userId: 'bob', diamondCount: 999999 });
    assert.equal(engine.battle.red, 16);
    assert.equal(engine.battle.blue, 1);
    assert.throws(() => engine.command('vote_start'));
    advance(30000);
    assert.equal(engine.battle.winner, 'red');
    assert.deepEqual(engine.battle.winnerUserIds, ['alice']);
    assert.equal(engine.teams.size, 0);
    assert.ok(engine.snapshot().members.every(member => member.team === ''));
    assert.equal(engine.activity, '');
    assert.equal(engine.battle.status, 'results');
    advance(12000);
    assert.equal(engine.lastResult, '');
});

test('a tied battle clears both name colors and awards nobody', () => {
    const { engine, chat, advance } = setup();
    engine.command('battle_start', { seconds: 30 });
    chat('red-player', 'đỏ'); chat('blue-player', 'xanh');
    advance(30000);
    assert.equal(engine.battle.winner, 'draw');
    assert.deepEqual(engine.battle.winnerUserIds, []);
    assert.ok(engine.snapshot().members.every(member => member.team === ''));
});

test('votes count one ballot per viewer and ties preserve an eligible current floor', () => {
    const { engine, chat, advance } = setup();
    engine.command('floor_set', { theme: 'disco' });
    engine.command('vote_start', { seconds: 10 });
    chat('alice', '1'); chat('alice', '3'); chat('bob', '2');
    assert.equal(engine.vote.neon, 1);
    assert.equal(engine.vote.lava, 0);
    advance(10000);
    assert.equal(engine.floorTheme, 'disco');
    engine.command('vote_start', { seconds: 10 });
    chat('alice', '3'); advance(10000);
    assert.equal(engine.floorTheme, 'lava');
    assert.throws(() => engine.command('floor_set', { theme: 'bad' }));
});

test('dance ignores early and duplicate chats, succeeds with unique people and expires', () => {
    const { engine, chat, advance } = setup();
    engine.command('dance_start', { seconds: 5, target: 2 });
    chat('alice', 'nhảy'); assert.equal(engine.dance.count, 0);
    advance(3000);
    chat('alice', 'nhảy'); chat('alice', 'dance'); assert.equal(engine.dance.count, 1);
    chat('bob', 'dance');
    assert.equal(engine.dance.success, true);
    assert.ok(engine.energy.partyUntil > engine.now());
    engine.command('dance_start', { seconds: 5, target: 3 });
    advance(8000);
    assert.equal(engine.dance.success, false);
    assert.equal(engine.dance.status, 'results');
});

test('community energy counts only free likes and preserves overflow across a celebration', () => {
    const { engine } = setup();
    engine.command('energy_goal', { goal: 100 });
    engine.process({ type: 'gift', userId: 'alice', diamondCount: 5000 });
    assert.equal(engine.energy.value, 0);
    engine.process({ type: 'like', userId: 'alice', likeCount: 250 });
    assert.equal(engine.energy.value, 50);
    assert.equal(engine.energy.celebrations, 2);
    engine.reset(); assert.equal(engine.energy.value, 0);
});

test('loyalty counts distinct Vietnam calendar days, persists, and excludes demo users', t => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'barclub-loyalty-'));
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    const file = path.join(directory, 'viewers.json');
    const store = new ViewerStore(file);
    const first = Date.UTC(2026, 9, 31, 16, 59);
    assert.equal(localDay(first), '2026-10-31');
    store.visit('alice', 'Alice', first);
    store.visit('alice', 'Alice', first);
    assert.equal(store.visit('alice', 'Alice', first + 60000).loyaltyDays, 2);
    assert.equal(store.visit('alice', 'Alice', first + 86400000 + 60000).loyaltyTitle, 'Khách quen');
    assert.equal(store.visit('demo-1', 'Fake', first).loyaltyDays, 0);
    store.flush();
    assert.equal(new ViewerStore(file).viewers.get('alice').visits, 3);
    assert.equal(new ViewerStore(file).viewers.has('demo-1'), false);
});

test('session checkpoints preserve donor scores and do not load stale sessions', t => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'barclub-session-'));
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    const file = path.join(directory, 'session.json');
    const store = new SessionStore(file);
    store.schedule({ vipScores: [{ userId: 'alice', score: 125 }], username: 'test_creator' }); store.flush();
    assert.equal(new SessionStore(file).load().vipScores[0].score, 125);
    const state = JSON.parse(fs.readFileSync(file)); state.savedAt = 1; fs.writeFileSync(file, JSON.stringify(state));
    assert.equal(store.load(), null);
});

test('gift speech merges bursts, speaks sequentially, and stops without replay', () => {
    const spoken = []; const done = [];
    const queue = new GiftSpeechQueue({ speak: (text, callback) => { spoken.push(text); done.push(callback); } });
    queue.enqueue({ userId: 'a', nickname: 'Minh 💖', giftId: 'rose', giftName: 'hoa hồng', repeatCount: 2 });
    queue.enqueue({ userId: 'a', nickname: 'Minh 💖', giftId: 'rose', giftName: 'hoa hồng', repeatCount: 1 });
    queue.enqueue({ userId: 'b', nickname: 'Lan', giftId: 'rose', giftName: 'hoa hồng', repeatCount: 1 });
    queue.flush();
    assert.deepEqual(spoken, ['Cảm ơn Minh đã tặng 3 hoa hồng nhé!']);
    done[0](); assert.equal(spoken.length, 2);
    queue.stop(); done[1](); assert.equal(queue.active, false);
    assert.equal(thanksText({ nickname: '<img>', repeatCount: 0 }), 'Cảm ơn img đã tặng 1 quà nhé!');
});

test('autoplay waits, opens one round, preserves results and respects its break', () => {
    let time = 100000;
    const engine = new EngagementEngine({ now: () => time, random: () => 0.99, config: { autoEnabled: true } });
    time += 14999; engine.tick(); assert.equal(engine.activity, '');
    time++; engine.tick(); assert.equal(engine.activity, 'battle');
    assert.equal(engine.auto.nextAt, 0);
    const end = engine.battle.endsAt;
    time = end - 1; engine.tick(); assert.equal(engine.activity, 'battle');
    time = end; engine.tick(); assert.equal(engine.battle.status, 'results');
    const next = engine.auto.nextAt;
    assert.ok(next >= time + 30000 && next <= time + 60000);
    time += 11999; engine.tick(); assert.ok(engine.lastResult);
    assert.equal(engine.activity, '');
    time = next - 1; engine.tick(); assert.equal(engine.activity, '');
    time++; engine.tick(); assert.notEqual(engine.activity, 'battle');
    assert.notEqual(engine.activity, '');
});

test('autoplay rotates every kind and avoids repeating across shuffle boundaries', () => {
    let time = 100000;
    const engine = new EngagementEngine({ now: () => time, random: () => 0.99, config: { autoEnabled: true } });
    const rounds = [];
    for (let index = 0; index < 12; index++) {
        time = engine.auto.nextAt; engine.tick(); rounds.push(engine.activity);
        engine.command('activity_stop');
    }
    for (let index = 1; index < rounds.length; index++) assert.notEqual(rounds[index], rounds[index - 1]);
    for (let index = 0; index < rounds.length; index += 3) assert.equal(new Set(rounds.slice(index, index + 3)).size, 3);
});

test('pausing autoplay lets the current round finish and settings survive reconstruction', () => {
    let time = 100000;
    const engine = new EngagementEngine({ now: () => time, config: { autoEnabled: true } });
    engine.command('battle_start', { seconds: 30 });
    engine.command('auto_config', { enabled: false, minGapSeconds: 40, maxGapSeconds: 65 });
    assert.equal(engine.activity, 'battle'); assert.equal(engine.auto.nextAt, 0);
    time += 30000; engine.tick(); assert.equal(engine.activity, '');
    time += 1000000; engine.tick(); assert.equal(engine.activity, '');
    const restored = new EngagementEngine({ config: engine.settings(), now: () => time });
    assert.equal(restored.auto.enabled, false); assert.equal(restored.auto.minGapSeconds, 40);
    restored.command('auto_config', { enabled: true });
    time += 15000; restored.tick(); assert.notEqual(restored.activity, '');
});
