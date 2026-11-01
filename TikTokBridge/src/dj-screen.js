'use strict';
const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const { MusicLibrary } = require('./music-library');
const IMAGES = new Set(['.png', '.jpg', '.jpeg']);
const EXTENSIONS = new Set([...IMAGES, '.mp4', '.m4v', '.mov', '.webm']);
const bad = message => Object.assign(new Error(message), { status: 400 });
function signature(buffer, extension) {
    if (extension === '.png') return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    if (extension === '.jpg' || extension === '.jpeg') return buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255;
    if (extension === '.webm') return buffer.subarray(0, 4).equals(Buffer.from([26, 69, 223, 163]));
    return buffer.length >= 12 && ['ftyp', 'moov', 'mdat', 'wide', 'free'].includes(buffer.toString('ascii', 4, 8));
}
function defaults(items = []) {
    return { mode: items.length ? 'single' : 'blank', selectedId: (items.find(item => item.kind === 'video') || items[0])?.id || '',
        playlist: items.map(item => item.id), slideSeconds: 8, text: 'Chào mừng đến với Bar Club!',
        color: '#f9d55c', background: '#07101f', fontSize: 64, scroll: false, revision: 0 };
}
function normalizeSettings(input, items) {
    if (!input || typeof input !== 'object' || Array.isArray(input) || !['single', 'slideshow', 'text', 'blank'].includes(input.mode)) throw bad('Chọn chế độ màn hình hợp lệ.');
    const base = defaults(items); const ids = new Set(items.map(item => item.id));
    const text = String(input.text ?? base.text).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '').slice(0, 500).trim();
    const selectedId = typeof input.selectedId === 'string' && ids.has(input.selectedId) ? input.selectedId : '';
    const playlist = [...new Set((Array.isArray(input.playlist) ? input.playlist : []).filter(id => typeof id === 'string' && ids.has(id)))];
    if (input.mode === 'single' && !selectedId) throw bad('Chọn một ảnh hoặc video để phát.');
    if (input.mode === 'slideshow' && !playlist.length) throw bad('Chọn ít nhất một ảnh hoặc video cho slideshow.');
    if (input.mode === 'text' && !text) throw bad('Nhập chữ muốn hiển thị.');
    const number = (value, fallback, min, max) => Number.isFinite(Number(value)) ? Math.min(max, Math.max(min, Number(value))) : fallback;
    const color = (value, fallback) => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : fallback;
    return { mode: input.mode, selectedId, playlist, slideSeconds: number(input.slideSeconds, 8, 2, 120), text,
        color: color(input.color, base.color), background: color(input.background, base.background),
        fontSize: Math.round(number(input.fontSize, 64, 24, 160)), scroll: input.scroll === true, revision: 0 };
}
class DjScreen {
    constructor({ directory, dataDirectory }) {
        this.file = path.join(dataDirectory, 'dj-screen.json');
        this.items = []; this.settings = null; this.saved = false; this.work = Promise.resolve();
        try { this.settings = JSON.parse(fsSync.readFileSync(this.file, 'utf8')); this.saved = true; } catch { /* first run */ }
        this.library = new MusicLibrary({ directory, temporaryDirectory: path.join(dataDirectory, 'screen-uploads'),
            maximumBytes: 500 * 1024 * 1024, extensions: EXTENSIONS, signature,
            maximumByExtension: { '.png': 20 * 1024 * 1024, '.jpg': 20 * 1024 * 1024, '.jpeg': 20 * 1024 * 1024 },
            invalidTypeMessage: 'Chọn PNG/JPG hoặc MP4/WebM/MOV/M4V.',
            validateFile: async (file, extension) => {
                if (!IMAGES.has(extension)) return;
                const metadata = await sharp(file, { limitInputPixels: 16777216 }).metadata();
                if (!metadata.width || !metadata.height || metadata.width > 4096 || metadata.height > 4096) throw bad('Ảnh tối đa 4096 × 4096 pixel.');
            }
        });
    }
    async refresh() {
        this.items = (await this.library.list()).map(item => ({ ...item, kind: IMAGES.has(path.extname(item.path).toLowerCase()) ? 'image' : 'video' }));
        if (!this.saved) this.settings = defaults(this.items);
        else {
            try { this.settings = { ...normalizeSettings(this.settings, this.items), revision: Number(this.settings.revision) || 0 }; }
            catch { this.settings = { ...defaults(this.items), revision: Number(this.settings?.revision) || 0 }; }
        }
    }
    publicItems() { return this.items.map(({ path: ignored, ...item }) => ({ ...item, url: `/api/screen/media/${item.id}` })); }
    save(input) {
        const run = this.work.then(async () => {
            const settings = normalizeSettings(input, this.items); settings.revision = (Number(this.settings?.revision) || 0) + 1;
            await fs.mkdir(path.dirname(this.file), { recursive: true });
            await fs.writeFile(`${this.file}.tmp`, JSON.stringify(settings)); await fs.rename(`${this.file}.tmp`, this.file);
            this.settings = settings; this.saved = true; return settings;
        });
        this.work = run.catch(() => {}); return run;
    }
}
module.exports = { DjScreen, normalizeSettings, signature };
