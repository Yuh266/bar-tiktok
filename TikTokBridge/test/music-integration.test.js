'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const WebSocket = require('ws');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
test('music uploads require a control token and playback commands reach only the native player', { timeout: 15000 }, async t => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'barclub-music-api-'));
    const portServer = net.createServer(); await new Promise(resolve => portServer.listen(0, '127.0.0.1', resolve));
    const port = portServer.address().port; await new Promise(resolve => portServer.close(resolve));
    const child = spawn(process.execPath, ['server.js'], { cwd: path.join(__dirname, '..'), windowsHide: true, stdio: 'ignore',
        env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', DATA_DIR: directory, MUSIC_DIR: path.join(directory, 'tracks') } });
    const sockets = [];
    t.after(async () => { sockets.forEach(socket => socket.terminate());
        if (child.exitCode === null) { const ended = new Promise(resolve => child.once('exit', resolve)); child.kill(); await ended; }
        fs.rmSync(directory, { recursive: true, force: true }); });
    const base = `http://127.0.0.1:${port}`;
    for (let index = 0; index < 100; index++) { try { if ((await fetch(`${base}/api/health`)).ok) break; } catch { /* startup */ } await sleep(25); }
    const connect = async (role, browser = false) => {
        const socket = new WebSocket(`ws://127.0.0.1:${port}`, browser ? { origin: base } : {}); sockets.push(socket);
        const messages = []; socket.on('message', raw => messages.push(JSON.parse(raw)));
        await new Promise(resolve => socket.once('open', resolve));
        const send = message => socket.send(JSON.stringify(message)); send({ type: 'register', role });
        return { socket, messages, send, async until(predicate) { for (let i = 0; i < 120; i++) { const message = messages.find(predicate); if (message) return message; await sleep(25); } throw Error('Music message missing'); } };
    };
    const bytes = Buffer.alloc(48); bytes.write('RIFF'); bytes.write('WAVE', 8);
    const upload = token => fetch(`${base}/api/music/upload`, { method: 'POST', headers: { 'Content-Type': 'application/octet-stream', 'X-Music-Filename': encodeURIComponent('Test.wav'), ...(token ? { 'X-Music-Token': token } : {}) }, body: bytes });
    assert.equal((await upload()).status, 403);
    const control = await connect('control');
    const token = (await control.until(m => m.type === 'music_upload_token')).token;
    const response = await upload(token); assert.equal(response.status, 201);
    const body = await response.json(); assert.equal(body.tracks.length, 1); assert.equal(body.tracks[0].path, undefined);
    const id = body.tracks[0].id;
    const browser = await connect('overlay', true); browser.send({ type: 'music_player_ready' });
    await browser.until(m => m.type === 'error');
    const player = await connect('overlay'); player.send({ type: 'music_player_ready' });
    const library = await player.until(m => m.type === 'music_library'); assert.ok(library.tracks[0].path.startsWith(directory));
    player.send({ type: 'music_report', trackId: id, position: 10, duration: 60, playing: true });
    await control.until(m => m.type === 'music_state' && m.trackId === id && m.playing);
    player.send({ type: 'music_command', action: 'pause' }); await player.until(m => m.type === 'error');
    control.send({ type: 'music_command', action: 'pause' });
    await player.until(m => m.type === 'music_control' && m.action === 'pause');
    assert.equal((await (await fetch(`${base}/api/music`)).json()).state.playing, true, 'Only actual player reports change playback state');
    player.send({ type: 'music_report', trackId: id, position: 10, duration: 60, paused: true });
    await control.until(m => m.type === 'music_state' && m.paused);
    control.send({ type: 'music_command', action: 'seek', position: -50 });
    assert.equal((await player.until(m => m.type === 'music_control' && m.action === 'seek')).position, 0);
    control.send({ type: 'music_command', action: 'select', trackId: '../../other-file' });
    await control.until(m => m.type === 'music_error');
    player.socket.close();
    await sleep(100);
    assert.equal((await (await fetch(`${base}/api/music`)).json()).state.playerConnected, false);
    control.socket.close(); await sleep(100); assert.equal((await upload(token)).status, 403);
});
