'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { Readable } = require('node:stream');
const sharp = require('sharp');
const { DjScreen, normalizeSettings } = require('../src/dj-screen');
async function setup(t) {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'barclub-screen-'));
    t.after(() => fs.rm(directory, { recursive: true, force: true }));
    return new DjScreen({ directory: path.join(directory, 'media'), dataDirectory: path.join(directory, 'data') });
}
test('screen supports mixed media uploads with Unicode names and persistent ordered slideshow settings', async t => {
    const screen = await setup(t);
    const image = await sharp({ create: { width: 40, height: 30, channels: 3, background: '#abcdef' } }).png().toBuffer();
    await screen.library.upload(Readable.from([image]), 'Ảnh thử.png', image.length);
    const video = Buffer.alloc(24); video.write('ftyp', 4);
    await screen.library.upload(Readable.from([video]), 'Test.mp4', video.length);
    await screen.refresh(); assert.equal(screen.items.length, 2);
    assert.ok(screen.items.some(item => item.kind === 'image')); assert.ok(screen.items.some(item => item.kind === 'video'));
    assert.ok(screen.publicItems().every(item => !item.path && item.url.startsWith('/api/screen/media/')));
    const ordered = screen.items.map(item => item.id).reverse();
    const settings = await screen.save({ mode: 'slideshow', playlist: ordered, slideSeconds: 4 });
    assert.equal(settings.revision, 1);
    const restored = new DjScreen({ directory: screen.library.directory, dataDirectory: path.dirname(screen.file) }); await restored.refresh();
    assert.deepEqual(restored.settings.playlist, ordered); assert.equal(restored.settings.slideSeconds, 4);
});
test('screen text settings bound input and reject invalid mode or missing selections', () => {
    const settings = normalizeSettings({ mode: 'text', text: 'Chào\u0000 bạn', color: 'url(javascript:x)', background: '#123456', fontSize: 500, slideSeconds: -5, scroll: true }, []);
    assert.equal(settings.text, 'Chào bạn'); assert.equal(settings.color, '#f9d55c'); assert.equal(settings.background, '#123456');
    assert.equal(settings.fontSize, 160); assert.equal(settings.slideSeconds, 2); assert.equal(settings.scroll, true);
    for (const input of [{ mode: 'single', selectedId: '../../x' }, { mode: 'slideshow', playlist: [] }, { mode: 'text', text: ' ' }, { mode: 'evil' }]) assert.throws(() => normalizeSettings(input, []));
});
test('screen rejects fake images and oversized dimensions and cleans temporary files', async t => {
    const screen = await setup(t);
    await assert.rejects(screen.library.upload(Readable.from([Buffer.from('not a png')]), 'fake.png', 9));
    const image = await sharp({ create: { width: 4097, height: 1, channels: 3, background: '#ffffff' } }).png().toBuffer();
    await assert.rejects(screen.library.upload(Readable.from([image]), 'wide.png', image.length), /4096/);
    assert.deepEqual(await screen.library.list(), []);
    assert.deepEqual(await fs.readdir(screen.library.temporaryDirectory), []);
});
test('screen text and blank configuration persist with no media and concurrent saves retain the last choice', async t => {
    const screen = await setup(t); await screen.refresh();
    await Promise.all([screen.save({ mode: 'text', text: 'Thông báo' }), screen.save({ mode: 'blank' })]);
    const restored = new DjScreen({ directory: screen.library.directory, dataDirectory: path.dirname(screen.file) }); await restored.refresh();
    assert.equal(restored.settings.mode, 'blank'); assert.equal(restored.settings.revision, 2);
});
