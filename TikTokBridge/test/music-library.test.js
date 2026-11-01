'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { Readable } = require('node:stream');
const { MusicLibrary, safeFilename } = require('../src/music-library');
const wav = () => { const bytes = Buffer.alloc(48); bytes.write('RIFF'); bytes.write('WAVE', 8); return bytes; };
async function setup(t, maximumBytes) {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'barclub-music-'));
    t.after(() => fs.rm(directory, { recursive: true, force: true }));
    const library = new MusicLibrary({ directory: path.join(directory, 'tracks'), temporaryDirectory: path.join(directory, 'uploads'), maximumBytes });
    return library;
}
test('music uploads keep Unicode names, avoid overwrites and ignore unsupported files', async t => {
    const library = await setup(t); const bytes = wav();
    await library.upload(Readable.from([bytes]), 'Nhạc thử.wav', bytes.length);
    await library.upload(Readable.from([bytes]), 'Nhạc thử.wav', bytes.length);
    await fs.writeFile(path.join(library.directory, 'ignore.txt'), 'text');
    const tracks = await library.list();
    assert.equal(tracks.length, 2); assert.notEqual(tracks[0].id, tracks[1].id);
    assert.ok(tracks.every(track => track.name === 'Nhạc thử.wav' && track.bytes === bytes.length));
});
test('music filenames reject traversal, unsupported extensions and empty names', () => {
    for (const name of ['../x.mp3', '..\\x.mp3', 'x.exe', 'x.mp3.exe', '.wav', 'x\u0000.mp3']) assert.throws(() => safeFilename(name));
    assert.equal(safeFilename('Bài 01.WAV'), 'Bài 01.wav');
});
test('invalid audio and an interrupted upload leave no playable or temporary files', async t => {
    const library = await setup(t);
    await assert.rejects(library.upload(Readable.from([Buffer.from('not audio')]), 'fake.wav', 9), /Nội dung/);
    const broken = Readable.from((async function* () { yield wav(); throw Error('connection lost'); })());
    await assert.rejects(library.upload(broken, 'broken.wav', NaN), /connection lost/);
    assert.deepEqual(await library.list(), []);
    assert.deepEqual(await fs.readdir(library.temporaryDirectory), []);
});
test('oversized music is rejected before writing and during streamed transfers', async t => {
    const library = await setup(t, 40);
    await assert.rejects(library.upload(Readable.from([wav()]), 'large.wav', 48), error => error.status === 413);
    await assert.rejects(library.upload(Readable.from([wav()]), 'stream.wav', NaN), error => error.status === 413);
    assert.deepEqual(await library.list(), []);
    assert.deepEqual(await fs.readdir(library.temporaryDirectory), []);
});
