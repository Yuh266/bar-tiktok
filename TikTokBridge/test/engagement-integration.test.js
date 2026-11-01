'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const net = require('node:net');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const WebSocket = require('ws');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function freePort() {
    const server = net.createServer();
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    await new Promise(resolve => server.close(resolve)); return port;
}
async function client(port, role) {
    const socket = new WebSocket(`ws://127.0.0.1:${port}`);
    const messages = [];
    socket.on('message', data => messages.push(JSON.parse(data)));
    await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
    socket.send(JSON.stringify({ type: 'register', role }));
    return { socket, messages, send: data => socket.send(JSON.stringify(data)), async until(predicate) {
        for (let attempt = 0; attempt < 100; attempt++) {
            const found = messages.find(predicate);
            if (found) return found;
            await sleep(25);
        }
        throw new Error('Expected bridge message did not arrive');
    } };
}

test('bridge enforces activity permissions, filters gift streaks, avoids duplicate scores and restores donors', { timeout: 20000 }, async t => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'barclub-integration-'));
    const provider = new WebSocket.Server({ port: 0, host: '127.0.0.1' });
    await new Promise(resolve => provider.once('listening', resolve));
    const port = await freePort();
    let child;
    const clients = [];
    const start = async () => {
        child = spawn(process.execPath, ['server.js'], { cwd: path.join(__dirname, '..'), windowsHide: true,
            env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', DATA_DIR: directory,
                LIVE_PROVIDER: 'tikfinity', TIKFINITY_WS_URL: `ws://127.0.0.1:${provider.address().port}` }, stdio: 'ignore' });
        for (let attempt = 0; attempt < 100; attempt++) {
            try { if ((await fetch(`http://127.0.0.1:${port}/api/health`)).ok) return; } catch { /* startup */ }
            await sleep(25);
        }
        throw new Error('Test bridge did not start');
    };
    const stop = async () => {
        for (const item of clients.splice(0)) item.socket.terminate();
        if (child && child.exitCode === null) { const exited = new Promise(resolve => child.once('exit', resolve)); child.kill(); await exited; }
    };
    t.after(async () => {
        await stop();
        for (const socket of provider.clients) socket.terminate();
        await new Promise(resolve => provider.close(resolve));
        fs.rmSync(directory, { recursive: true, force: true });
    });
    await start();
    const control = await client(port, 'control'); const overlay = await client(port, 'overlay'); clients.push(control, overlay);
    overlay.send({ type: 'engagement_command', action: 'battle_start' });
    assert.match((await overlay.until(m => m.type === 'error')).message, /Master/);
    const connected = new Promise(resolve => provider.once('connection', resolve));
    control.send({ type: 'set_username', username: 'test_creator' });
    const source = await connected;
    await control.until(m => m.type === 'status' && m.state === 'connected');
    control.send({ type: 'engagement_command', action: 'battle_start', seconds: 30 });
    await overlay.until(m => m.type === 'engagement_state' && m.engagement.activity === 'battle');
    source.send(JSON.stringify({ event: 'chat', data: { msgId: 'join-red', userId: 'viewer-1', nickname: 'Minh', comment: 'đỏ' } }));
    assert.equal((await overlay.until(m => m.type === 'chat')).team, 'red');
    source.send(JSON.stringify({ event: 'chat', data: { msgId: 'join-blue-content', userId: 'viewer-blue', nickname: 'Blue viewer', content: 'xanh' } }));
    const blue = await overlay.until(m => m.type === 'chat' && m.userId === 'viewer-blue');
    assert.equal(blue.comment, 'xanh');
    assert.equal(blue.team, 'blue');
    assert.equal(blue.spectatorOnly, false);
    assert.equal(blue.joinedNow, true);
    source.send(JSON.stringify({ event: 'chat', data: { msgId: 'join-hey-content', userId: 'viewer-hey', nickname: 'New viewer', content: 'hey' } }));
    assert.equal((await overlay.until(m => m.type === 'chat' && m.userId === 'viewer-hey')).action, 'join');
    control.send({ type: 'speech_claim', enabled: true });
    await control.until(m => m.type === 'speech_status' && m.active);
    control.send({ type: 'engagement_command', action: 'auto_config', enabled: false, minGapSeconds: 45, maxGapSeconds: 70 });
    control.send({ type: 'engagement_command', action: 'floor_set', theme: 'lava' });
    control.send({ type: 'engagement_command', action: 'energy_goal', goal: 500 });
    await overlay.until(m => m.type === 'engagement_state' && m.engagement.floorTheme === 'lava' && m.engagement.energy.goal === 500);
    const gift = { event: 'gift', data: { msgId: 'gift-final', userId: 'viewer-1', nickname: 'Minh', giftId: '5655', giftName: 'Rose', giftType: 1, repeatCount: 3, repeatEnd: false, diamondCount: 1 } };
    source.send(JSON.stringify(gift)); await sleep(50);
    assert.equal(overlay.messages.filter(m => m.type === 'gift').length, 0);
    gift.data.repeatEnd = true;
    source.send(JSON.stringify(gift)); source.send(JSON.stringify(gift));
    assert.equal((await control.until(m => m.type === 'gift_thanks')).repeatCount, 3);
    await overlay.until(m => m.type === 'gift'); await sleep(50);
    assert.equal(overlay.messages.filter(m => m.type === 'gift').length, 1);
    assert.equal(control.messages.filter(m => m.type === 'gift_thanks').length, 1);
    assert.equal((await overlay.until(m => m.type === 'gift')).diamondCount, 3);
    // A second browser tab claims speech and the old tab is disabled.
    const second = await client(port, 'control'); clients.push(second);
    second.send({ type: 'speech_claim', enabled: true });
    await control.until(m => m.type === 'speech_status' && !m.active);
    source.send(JSON.stringify({ ...gift, data: { ...gift.data, msgId: 'gift-second' } }));
    await second.until(m => m.type === 'gift_thanks');
    control.send({ type: 'engagement_command', action: 'activity_stop' });
    await overlay.until(m => m.type === 'engagement_state' && m.engagement.battle.status === 'results' && m.engagement.members.every(member => member.team === ''));
    const resultViewer = await client(port, 'overlay'); clients.push(resultViewer);
    assert.ok((await resultViewer.until(m => m.type === 'snapshot')).players.every(player => player.team === ''));
    await sleep(1200);
    const saved = JSON.parse(fs.readFileSync(path.join(directory, 'session.json')));
    assert.equal(saved.vipScores[0].score, 6);
    await stop(); await start();
    const restored = await client(port, 'overlay'); clients.push(restored);
    const snapshot = await restored.until(m => m.type === 'snapshot');
    assert.equal(snapshot.vipScores[0].score, 6);
    const activity = await restored.until(m => m.type === 'engagement_state');
    assert.equal(activity.engagement.floorTheme, 'lava');
    assert.equal(activity.engagement.energy.goal, 500);
    assert.equal(activity.engagement.auto.enabled, false);
    assert.equal(activity.engagement.auto.minGapSeconds, 45);
    assert.equal(activity.engagement.auto.maxGapSeconds, 70);

    // Moderation is reserved for the operator; it changes the floor independently of donations.
    restored.send({ type: 'reset_leaderboard' });
    restored.send({ type: 'kick_player', userId: 'viewer-1' });
    await restored.until(m => m.type === 'error');
    assert.equal(restored.messages.filter(m => m.type === 'leaderboard_reset' || m.type === 'player_kicked').length, 0);
    const operator = await client(port, 'control'); clients.push(operator);
    await operator.until(m => m.type === 'floor_roster' && m.vipScores.some(v => v.score === 6));
    operator.send({ type: 'kick_player', userId: 'viewer-1' });
    await restored.until(m => m.type === 'player_kicked' && m.userId === 'viewer-1');
    const kicked = await operator.until(m => m.type === 'floor_roster' && !m.players.some(p => p.userId === 'viewer-1'));
    assert.equal(kicked.vipScores[0].score, 6);
    await restored.until(m => m.type === 'status' && m.state === 'connected');
    const nextSource = [...provider.clients].find(socket => socket.readyState === WebSocket.OPEN);
    assert.ok(nextSource);
    nextSource.send(JSON.stringify({ event: 'like', data: { msgId: 'passive-after-kick', userId: 'viewer-1', nickname: 'Minh', likeCount: 3 } }));
    assert.equal((await restored.until(m => m.type === 'like' && m.eventId === 'passive-after-kick')).spectatorOnly, true);
    nextSource.send(JSON.stringify({ event: 'chat', data: { msgId: 'rejoin-after-kick', userId: 'viewer-1', nickname: 'Minh', content: 'hey' } }));
    const rejoined = await restored.until(m => m.type === 'chat' && m.eventId === 'rejoin-after-kick');
    assert.equal(rejoined.spectatorOnly, false); assert.equal(rejoined.joinedNow, true);
    await operator.until(m => m.type === 'floor_roster' && m.players.some(p => p.userId === 'viewer-1'));
    operator.send({ type: 'reset_leaderboard' });
    await restored.until(m => m.type === 'leaderboard_reset');
    const reset = await operator.until(m => m.type === 'floor_roster' && m.vipScores.length === 0);
    assert.ok(reset.players.some(p => p.userId === 'viewer-1'));
    const afterReset = await client(port, 'overlay'); clients.push(afterReset);
    assert.equal((await afterReset.until(m => m.type === 'metrics')).diamonds, 6);
    assert.equal((await afterReset.until(m => m.type === 'snapshot')).vipScores.length, 0);
    nextSource.send(JSON.stringify({ ...gift, data: { ...gift.data, msgId: 'fresh-score-after-reset', repeatCount: 1 } }));
    await operator.until(m => m.type === 'floor_roster' && m.vipScores.some(v => v.score === 1));
    operator.send({ type: 'kick_player', userId: 'viewer-blue' });
    await restored.until(m => m.type === 'player_kicked' && m.userId === 'viewer-blue');
    await sleep(1200); await stop(); await start();
    const persisted = await client(port, 'overlay'); clients.push(persisted);
    const finalSnapshot = await persisted.until(m => m.type === 'snapshot');
    assert.equal(finalSnapshot.players.some(p => p.userId === 'viewer-blue'), false);
    assert.equal(finalSnapshot.vipScores[0].score, 1);
    assert.ok(finalSnapshot.removedPlayers.includes('viewer-blue'));
});
