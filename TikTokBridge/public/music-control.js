/* global send, socket */
'use strict';
const musicEl = id => document.getElementById(id);
function musicTime(seconds) {
    seconds = Math.max(0, Math.floor(Number(seconds) || 0));
    const parts = [Math.floor(seconds / 60) % 60, seconds % 60].map(value => String(value).padStart(2, '0'));
    if (seconds >= 3600) parts.unshift(String(Math.floor(seconds / 3600)));
    return parts.join(':');
}
const musicControl = {
    tracks: [], state: {}, connected: false, uploadToken: '', uploading: false, seeking: false, receivedAt: 0,
    onConnection(connected) {
        this.connected = connected;
        if (!connected) this.uploadToken = '';
        else send({ type: 'music_refresh' });
        this.renderTracks();
        this.render();
    },
    onMessage(data) {
        if (data.type === 'music_upload_token') { this.uploadToken = data.token || ''; this.render(); }
        if (data.type === 'music_library') { this.tracks = data.tracks || []; this.renderTracks(); this.render(); }
        if (data.type === 'music_state') {
            const changed = ['trackId', 'playing', 'paused', 'loading', 'playerConnected'].some(key => this.state[key] !== data[key]);
            if (this.state.trackId !== data.trackId) this.seeking = false;
            this.state = data; this.receivedAt = performance.now();
            if (changed) this.renderTracks();
            this.render();
        }
        if (data.type === 'music_error') musicEl('music-message').textContent = data.message;
    },
    position() {
        return Math.min(this.state.duration || 0, (this.state.position || 0) +
            (this.connected && this.state.playerConnected && this.state.playing ? (performance.now() - this.receivedAt) / 1000 : 0));
    },
    command(action, extra = {}) {
        musicEl('music-message').textContent = '';
        send({ type: 'music_command', action, ...extra });
    },
    render() {
        const state = this.state; const ready = this.connected && state.playerConnected;
        const current = this.tracks.find(track => track.id === state.trackId);
        musicEl('music-current').textContent = current?.name || (this.tracks.length ? 'Đang chờ game chọn bài' : 'Chưa có bài nhạc');
        musicEl('music-player-status').textContent = !this.connected ? 'Đang chờ kết nối máy chủ…'
            : !state.playerConnected ? 'Mở game để phát và điều khiển nhạc.' : state.error ||
            (state.loading ? 'Đang tải bài nhạc…' : state.paused ? 'Đã tạm dừng' : state.playing ? 'Đang phát' : 'Sẵn sàng phát nhạc');
        musicEl('music-toggle').textContent = state.playing || (state.loading && !state.paused) ? 'Tạm dừng' : 'Phát nhạc';
        for (const id of ['music-toggle', 'music-previous', 'music-next']) musicEl(id).disabled = !ready || !this.tracks.length;
        for (const id of ['music-back', 'music-forward', 'music-jump', 'music-seek']) musicEl(id).disabled = !ready || state.loading || !state.duration;
        musicEl('music-seek').max = Math.floor(state.duration || 0);
        musicEl('music-duration').textContent = musicTime(state.duration);
        this.renderPosition();
        musicEl('music-track-count').textContent = this.tracks.length;
        musicEl('music-upload').disabled = !this.connected || !this.uploadToken || this.uploading || !musicEl('music-files').files.length;
        musicEl('music-files').disabled = this.uploading;
        musicEl('music-refresh').disabled = !this.connected;
    },
    renderPosition() {
        if (this.seeking) return;
        const position = this.position();
        musicEl('music-seek').value = position;
        musicEl('music-position').textContent = musicTime(position);
    },
    renderTracks() {
        const list = musicEl('music-track-list'); list.replaceChildren();
        for (const [index, track] of this.tracks.entries()) {
            const row = document.createElement('div'); row.className = 'music-track-row';
            const info = document.createElement('div'); info.className = 'music-track-info';
            const name = document.createElement('strong'); name.textContent = `${index + 1}. ${track.name}`;
            const details = document.createElement('small'); details.textContent = `${(track.bytes / 1024 / 1024).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} MB`;
            const current = track.id === this.state.trackId;
            if (current) { row.classList.add('is-current'); details.textContent += this.state.paused ? ' · Đã tạm dừng' : ' · Bài hiện tại'; }
            info.append(name, details);
            const play = document.createElement('button'); play.type = 'button'; play.className = 'btn btn-secondary btn-sm';
            play.textContent = 'Phát bài'; play.setAttribute('aria-label', `Phát ${track.name}`);
            play.disabled = !this.connected || !this.state.playerConnected;
            play.addEventListener('click', () => this.command('select', { trackId: track.id }));
            row.append(info, play); list.append(row);
        }
        if (!this.tracks.length) { const empty = document.createElement('p'); empty.className = 'help'; empty.textContent = 'Tải bài nhạc đầu tiên để bắt đầu.'; list.append(empty); }
    }
};
window.musicControl = musicControl;
musicEl('music-previous').addEventListener('click', () => musicControl.command('previous'));
musicEl('music-next').addEventListener('click', () => musicControl.command('next'));
musicEl('music-toggle').addEventListener('click', () => musicControl.command(musicControl.state.playing || (musicControl.state.loading && !musicControl.state.paused) ? 'pause' : 'resume'));
musicEl('music-back').addEventListener('click', () => musicControl.command('seek', { position: Math.max(0, musicControl.position() - 10) }));
musicEl('music-forward').addEventListener('click', () => musicControl.command('seek', { position: musicControl.position() + 10 }));
musicEl('music-refresh').addEventListener('click', () => send({ type: 'music_refresh' }));
musicEl('music-seek').addEventListener('input', event => { musicControl.seeking = true; musicEl('music-position').textContent = musicTime(event.target.value); });
musicEl('music-seek').addEventListener('change', event => { musicControl.seeking = false; musicControl.command('seek', { position: Number(event.target.value) }); });
musicEl('music-seek').addEventListener('blur', () => { musicControl.seeking = false; });
musicEl('music-jump').addEventListener('click', () => {
    const parts = musicEl('music-seek-input').value.trim().split(':');
    const position = parts.reduce((sum, part) => sum * 60 + Number(part), 0);
    if (!parts.length || parts.length > 3 || parts.some(part => !/^\d+$/.test(part)) || !Number.isFinite(position)) {
        musicEl('music-message').textContent = 'Nhập thời gian như 02:30 hoặc số giây.'; return;
    }
    musicControl.command('seek', { position });
});
musicEl('music-files').addEventListener('change', () => musicControl.render());
function uploadMusic(file, onProgress) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest(); xhr.open('POST', '/api/music/upload'); xhr.timeout = 300000;
        xhr.setRequestHeader('Content-Type', 'application/octet-stream');
        xhr.setRequestHeader('X-Music-Filename', encodeURIComponent(file.name)); xhr.setRequestHeader('X-Music-Token', musicControl.uploadToken);
        xhr.upload.onprogress = event => { if (event.lengthComputable) onProgress(event.loaded / event.total); };
        xhr.onload = () => { let body = {}; try { body = JSON.parse(xhr.responseText); } catch { /* HTTP failure */ }
            if (xhr.status === 201) resolve(body); else reject(Error(body.error || 'Không tải được nhạc. Vui lòng thử lại.')); };
        xhr.onerror = () => reject(Error('Mất kết nối khi tải nhạc. Vui lòng thử lại.'));
        xhr.ontimeout = () => reject(Error('Tải nhạc quá lâu. Vui lòng thử lại.'));
        xhr.send(file);
    });
}
musicEl('music-upload').addEventListener('click', async () => {
    const files = [...musicEl('music-files').files]; if (!files.length || musicControl.uploading) return;
    if (files.some(file => file.size > 250 * 1024 * 1024 || !/\.(mp3|wav|ogg)$/i.test(file.name))) {
        musicEl('music-upload-status').textContent = 'Chọn MP3, WAV hoặc OGG, tối đa 250 MB mỗi file.'; return;
    }
    musicControl.uploading = true; musicControl.render(); const progress = musicEl('music-upload-progress'); progress.hidden = false;
    let uploaded = 0;
    try {
        for (const file of files) {
            musicEl('music-upload-status').textContent = `Đang tải ${uploaded + 1}/${files.length}: ${file.name}`;
            await uploadMusic(file, fraction => { progress.value = (uploaded + fraction) / files.length * 100; });
            uploaded++;
        }
        progress.value = 100; musicEl('music-upload-status').textContent = `Đã tải ${uploaded} bài nhạc.`;
        musicEl('music-files').value = '';
    } catch (error) { musicEl('music-upload-status').textContent = `${uploaded ? `Đã tải ${uploaded} bài. ` : ''}${error.message}`; }
    finally { musicControl.uploading = false; musicControl.render(); }
});
setInterval(() => musicControl.renderPosition(), 250);
musicControl.onConnection(socket?.readyState === WebSocket.OPEN);
musicControl.renderTracks(); musicControl.render();
