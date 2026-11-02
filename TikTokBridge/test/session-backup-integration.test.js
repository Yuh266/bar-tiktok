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

test('only the control panel can create persistent backups, including the DJ seat and current donor scores', { timeout: 15000 }, async t => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'barclub-backup-integration-'));
    const backupDirectory = path.join(directory, 'backups');
    fs.writeFileSync(backupDirectory, 'blocked for failure test');
    const listener = net.createServer();
    await new Promise(resolve => listener.listen(0, '127.0.0.1', resolve));
    const port = listener.address().port;
    await new Promise(resolve => listener.close(resolve));
    const child = spawn(process.execPath, ['server.js'], { cwd: path.join(__dirname, '..'), windowsHide: true,
        env: { ...process.env, HOST: '127.0.0.1', PORT: String(port), DATA_DIR: directory }, stdio: 'ignore' });
    const clients = [];
    t.after(async () => {
        clients.forEach(client => client.socket.terminate());
        if (child.exitCode === null) { const done = new Promise(resolve => child.once('exit', resolve)); child.kill(); await done; }
        assert.equal(path.dirname(path.resolve(directory)), path.resolve(os.tmpdir()));
        fs.rmSync(directory, { recursive: true, force: true });
    });
    for (let i = 0; i < 150; i++) {
        try { if ((await fetch(`http://127.0.0.1:${port}/api/health`)).ok) break; } catch { /* startup */ }
        await sleep(25);
    }
    const connect = async role => {
        const socket = new WebSocket(`ws://127.0.0.1:${port}`);
        const messages = [];
        socket.on('message', raw => messages.push(JSON.parse(raw)));
        await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
        const client = { socket, messages, send: data => socket.send(JSON.stringify(data)), async until(predicate) {
            for (let i = 0; i < 120; i++) { const found = messages.find(predicate); if (found) return found; await sleep(25); }
            throw Error('Expected backup response did not arrive');
        } };
        clients.push(client);
        if (role) { client.send({ type: 'register', role }); await client.until(m => m.type === 'config'); }
        return client;
    };
    const unregistered = await connect();
    unregistered.send({ type: 'session_backup' });
    await unregistered.until(m => m.type === 'error');
    const overlay = await connect('overlay');
    overlay.send({ type: 'session_backup' });
    await overlay.until(m => m.type === 'error');
    assert.equal(fs.readFileSync(backupDirectory, 'utf8'), 'blocked for failure test');
    const control = await connect('control');
    control.send({ type: 'session_backup' });
    await control.until(m => m.type === 'session_backup_error');
    assert.equal(control.messages.filter(m => m.type === 'session_backup_saved').length, 0);
    fs.unlinkSync(backupDirectory);
    control.send({ type: 'demo_event', action: 'gift', manualUsername: 'backup-guest', giftName: 'Electro Vibes', value: 349 });
    await control.until(m => m.type === 'gift' && m.userId === 'backup-guest');
    control.send({ type: 'session_backup' });
    const first = await control.until(m => m.type === 'session_backup_saved');
    assert.equal(first.donorCount, 1); assert.equal(first.diamonds, 349);
    const backupFile = path.join(backupDirectory, first.fileName);
    assert.equal(path.dirname(backupFile), backupDirectory);
    const original = fs.readFileSync(backupFile, 'utf8');
    const saved = JSON.parse(original);
    assert.equal(saved.guestDjUserId, 'backup-guest');
    assert.equal(saved.vipScores[0].score, 349);
    control.send({ type: 'reset_game' });
    await control.until(m => m.type === 'reset');
    control.send({ type: 'session_backup' });
    const second = await control.until(m => m.type === 'session_backup_saved' && m.fileName !== first.fileName);
    assert.equal(second.donorCount, 0); assert.equal(second.diamonds, 0);
    assert.equal(fs.readFileSync(backupFile, 'utf8'), original);
    assert.equal(fs.readdirSync(backupDirectory).length, 2);
    assert.equal(overlay.messages.filter(m => m.type === 'session_backup_saved').length, 0);
});
