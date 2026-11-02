'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const WebSocket = require('ws');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

test('Electro DJ seat survives other gifts, reconnects and a bridge restart until the next Electro giver', { timeout: 20000 }, async t => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'barclub-dj-seat-'));
    const listener = net.createServer();
    await new Promise(resolve => listener.listen(0, '127.0.0.1', resolve));
    const port = listener.address().port;
    await new Promise(resolve => listener.close(resolve));
    let child;
    const clients = [];
    const stop = async () => {
        if (child && child.exitCode === null) {
            const done = new Promise(resolve => child.once('exit', resolve)); child.kill(); await done;
        }
    };
    t.after(async () => {
        clients.forEach(client => client.socket.terminate());
        await stop();
        assert.equal(path.dirname(path.resolve(directory)), path.resolve(os.tmpdir()));
        fs.rmSync(directory, { recursive: true, force: true });
    });
    const start = async () => {
        child = spawn(process.execPath, ['server.js'], { cwd: path.join(__dirname, '..'), windowsHide: true,
            env: { ...process.env, HOST: '127.0.0.1', PORT: String(port), DATA_DIR: directory }, stdio: 'ignore' });
        for (let i = 0; i < 150; i++) {
            try { if ((await fetch(`http://127.0.0.1:${port}/api/health`)).ok) return; } catch { /* startup */ }
            await sleep(25);
        }
        throw Error('Isolated bridge did not start');
    };
    const connect = async (role = 'control') => {
        const socket = new WebSocket(`ws://127.0.0.1:${port}`);
        const messages = [];
        socket.on('message', raw => messages.push(JSON.parse(raw)));
        await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
        const client = { socket, messages, send: data => socket.send(JSON.stringify(data)), async until(predicate) {
            for (let i = 0; i < 120; i++) {
                const found = messages.find(predicate); if (found) return found;
                await sleep(25);
            }
            throw Error('Expected DJ seat message did not arrive');
        } };
        clients.push(client);
        client.send({ type: 'register', role });
        await client.until(m => m.type === (role === 'overlay' ? 'snapshot' : 'floor_roster'));
        return client;
    };
    const gift = (client, user, name, value) => client.send({ type: 'demo_event', action: 'gift', manualUsername: user, giftName: name, value });
    await start();
    const operator = await connect();
    gift(operator, 'electro-a', 'Electro Vibes', 349);
    const first = await operator.until(m => m.type === 'gift' && m.userId === 'electro-a');
    assert.equal(first.action, 'topdj');
    assert.equal(first.guestDjUserId, 'electro-a');
    gift(operator, 'other-b', 'Rose', 1);
    assert.equal((await operator.until(m => m.type === 'gift' && m.userId === 'other-b')).guestDjUserId, 'electro-a');
    gift(operator, 'dragon-c', 'Finger Heart', 5);
    const dragon = await operator.until(m => m.type === 'gift' && m.userId === 'dragon-c');
    assert.equal(dragon.action, 'dragon');
    assert.equal(dragon.diamondCount, 5);
    assert.equal(dragon.guestDjUserId, 'electro-a');
    const reconnected = await connect('overlay');
    assert.equal((await reconnected.until(m => m.type === 'snapshot')).guestDjUserId, 'electro-a');
    gift(operator, 'electro-b', 'Electro Vibes', 349);
    assert.equal((await operator.until(m => m.type === 'gift' && m.userId === 'electro-b')).guestDjUserId, 'electro-b');
    operator.send({ type: 'reset_leaderboard' });
    await operator.until(m => m.type === 'leaderboard_reset');
    assert.equal((await operator.until(m => m.type === 'floor_roster' && m.guestDjUserId === 'electro-b')).guestDjUserId, 'electro-b');
    await sleep(1200);
    assert.equal(JSON.parse(fs.readFileSync(path.join(directory, 'session.json'), 'utf8')).guestDjUserId, 'electro-b');
    await stop();
    await start();
    const restored = await connect();
    assert.equal((await restored.until(m => m.type === 'floor_roster')).guestDjUserId, 'electro-b');
    restored.send({ type: 'kick_player', userId: 'electro-b' });
    await restored.until(m => m.type === 'player_kicked');
    const kicked = await restored.until(m => m.type === 'floor_roster' && !m.players.some(p => p.userId === 'electro-b'));
    assert.equal(kicked.guestDjUserId, '');
});
