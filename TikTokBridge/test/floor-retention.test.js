'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { pruneFloorPlayers } = require('../src/floor-retention');

function viewers(count, lastActive) {
    return new Map(Array.from({ length: count }, (_, index) => {
        const player = { userId: `viewer-${index}`, lastActive: lastActive + index };
        return [player.userId, player];
    }));
}

test('80 or fewer idle avatars stay on the floor even after hours without interaction', () => {
    const players = viewers(80, 0);
    assert.deepEqual(pruneFloorPlayers(players, { now: 36000000 }), []);
    assert.equal(players.size, 80);
});

test('overflow removes only the oldest excess idle avatars, retaining a full floor of 80', () => {
    const players = viewers(82, 0);
    assert.deepEqual(pruneFloorPlayers(players, { now: 36000000 }), ['viewer-0', 'viewer-1']);
    assert.equal(players.size, 80);
    assert.ok(players.has('viewer-2'));
    assert.deepEqual(pruneFloorPlayers(players, { now: 72000000 }), []);
});

test('more than 80 active viewers stay and a refreshed viewer is not selected as idle', () => {
    const players = viewers(81, 10000000);
    assert.deepEqual(pruneFloorPlayers(players, { now: 10001000 }), []);
    assert.equal(players.size, 81);
    players.get('viewer-0').lastActive = 0;
    assert.deepEqual(pruneFloorPlayers(players, { now: 10001000 }), ['viewer-0']);
    assert.equal(players.size, 80);
});

test('the existing 400-viewer safety capacity still applies if everyone is active', () => {
    const players = viewers(401, 10000000);
    assert.deepEqual(pruneFloorPlayers(players, { now: 10001000 }), ['viewer-0']);
    assert.equal(players.size, 400);
});

test('the current DJ keeps the seat during idle and capacity cleanup', () => {
    const idle = viewers(82, 0);
    assert.deepEqual(pruneFloorPlayers(idle, { now: 36000000, protectedUserId: 'viewer-0' }), ['viewer-1', 'viewer-2']);
    assert.ok(idle.has('viewer-0'));
    const active = viewers(401, 10000000);
    assert.deepEqual(pruneFloorPlayers(active, { now: 10001000, protectedUserId: 'viewer-0' }), ['viewer-1']);
    assert.ok(active.has('viewer-0'));
});
