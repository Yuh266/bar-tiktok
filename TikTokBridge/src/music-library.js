'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID, createHash } = require('node:crypto');

const MAX_UPLOAD_BYTES = 250 * 1024 * 1024;
const EXTENSIONS = new Set(['.mp3', '.wav', '.ogg']);
function fail(message, status = 400) { return Object.assign(new Error(message), { status }); }
function safeFilename(value) {
    const name = String(value || '').normalize('NFC');
    const extension = path.extname(name).toLowerCase();
    if (!EXTENSIONS.has(extension) || /[\\/\x00-\x1f]/.test(name)) throw fail('Chọn file MP3, WAV hoặc OGG.');
    const stem = path.basename(name, path.extname(name)).replace(/[<>:"|?*]/g, '_').replace(/[. ]+$/g, '').trim().slice(0, 120);
    if (!stem) throw fail('Tên file nhạc không hợp lệ.');
    return stem + extension;
}
function audioSignature(buffer, extension) {
    if (extension === '.wav') return buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WAVE';
    if (extension === '.ogg') return buffer.toString('ascii', 0, 4) === 'OggS';
    return (buffer.length >= 10 && buffer.toString('ascii', 0, 3) === 'ID3') ||
        (buffer.length >= 4 && buffer[0] === 255 && (buffer[1] & 224) === 224 && (buffer[1] & 6) !== 0);
}
class MusicLibrary {
    constructor({ directory, temporaryDirectory, maximumBytes = MAX_UPLOAD_BYTES }) {
        this.directory = path.resolve(directory); this.temporaryDirectory = path.resolve(temporaryDirectory);
        this.maximumBytes = maximumBytes;
    }
    async list() {
        await fs.mkdir(this.directory, { recursive: true });
        const entries = await fs.readdir(this.directory, { withFileTypes: true });
        const tracks = await Promise.all(entries.filter(entry => entry.isFile() && EXTENSIONS.has(path.extname(entry.name).toLowerCase())).map(async entry => {
            const file = path.join(this.directory, entry.name);
            const stat = await fs.stat(file);
            return { id: createHash('sha256').update(entry.name).digest('hex').slice(0, 24),
                name: entry.name.replace(/^[0-9a-f-]{36}__/i, ''), bytes: stat.size, path: file };
        }));
        return tracks.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    }
    async upload(stream, filename, declaredLength) {
        const name = safeFilename(filename);
        if (Number.isFinite(declaredLength) && declaredLength > this.maximumBytes) throw fail('File vượt giới hạn 250 MB.', 413);
        await fs.mkdir(this.directory, { recursive: true });
        await fs.mkdir(this.temporaryDirectory, { recursive: true });
        const id = randomUUID();
        const temporary = path.join(this.temporaryDirectory, `${id}.part`);
        const destination = path.join(this.directory, `${id}__${name}`);
        let handle; let bytes = 0; let header = Buffer.alloc(0);
        try {
            handle = await fs.open(temporary, 'wx');
            for await (const chunk of stream) {
                bytes += chunk.length;
                if (bytes > this.maximumBytes) throw fail('File vượt giới hạn 250 MB.', 413);
                if (header.length < 16) header = Buffer.concat([header, chunk.subarray(0, 16 - header.length)]);
                await handle.writeFile(chunk);
            }
            await handle.close(); handle = null;
            if (!bytes || !audioSignature(header, path.extname(name))) throw fail('Nội dung file không phải định dạng nhạc đã chọn.');
            if (Number.isFinite(declaredLength) && bytes !== declaredLength) throw fail('File tải lên chưa đầy đủ. Vui lòng thử lại.');
            await fs.rename(temporary, destination);
            return { name, bytes };
        } finally {
            if (handle) await handle.close();
            await fs.rm(temporary, { force: true });
        }
    }
}
module.exports = { MusicLibrary, MAX_UPLOAD_BYTES, safeFilename };
