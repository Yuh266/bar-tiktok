/* global send, socket */
'use strict';
const screenEl = id => document.getElementById(id);
const screenControl = {
    items: [], state: {}, draft: null, connected: false, uploadToken: '', dirty: false, saving: false, uploading: false,
    onConnection(connected) {
        this.connected = connected; if (!connected) { this.uploadToken = ''; this.saving = false; }
        else send({ type: 'screen_refresh' });
        this.renderStatus();
    },
    onMessage(data) {
        if (data.type === 'music_upload_token') { this.uploadToken = data.token || ''; this.renderStatus(); }
        if (data.type === 'screen_library') { this.items = data.items || []; this.renderLibrary(); this.renderForm(); }
        if (data.type === 'screen_state') {
            this.state = data;
            if (this.saving && data.settings && data.settings.revision > this.savedFromRevision) {
                this.saving = false; this.dirty = false;
                screenEl('screen-message').textContent = data.playerConnected ? 'Đã lưu cấu hình. Đang áp dụng trên game…' : 'Đã lưu. Màn hình sẽ áp dụng khi mở game.';
            }
            if (data.settings && (!this.draft || (!this.dirty && JSON.stringify(this.draft) !== JSON.stringify(data.settings)))) {
                this.draft = { ...data.settings, playlist: [...data.settings.playlist] }; this.renderForm(); this.renderLibrary();
            }
            if (!this.dirty && data.playerConnected && data.report?.revision === data.settings?.revision && !data.report?.loading && !data.report?.error)
                screenEl('screen-message').textContent = 'Đã áp dụng trên màn hình game.';
            this.renderStatus();
        }
        if (data.type === 'screen_error') { this.saving = false; screenEl('screen-message').textContent = data.message; this.renderStatus(); }
    },
    change(values) {
        if (!this.draft) return;
        Object.assign(this.draft, values); this.dirty = true; screenEl('screen-message').textContent = 'Có thay đổi chưa áp dụng.';
        this.renderPreview(); this.renderStatus();
    },
    renderStatus() {
        const actual = this.state.report || {}; const current = this.items.find(item => item.id === actual.currentId);
        screenEl('screen-status').textContent = !this.connected ? 'Đang chờ kết nối máy chủ…'
            : !this.state.playerConnected ? 'Chưa mở game. Bạn vẫn có thể tải nội dung và lưu cấu hình.'
            : actual.error || (actual.loading ? 'Game đang tải nội dung…' : actual.revision !== this.state.settings?.revision ? 'Đang áp dụng cấu hình trên game…'
                : actual.mode === 'blank' ? 'Màn hình game đang tắt.' : actual.mode === 'text' ? 'Game đang hiển thị chữ.' : `Game đang hiển thị: ${current?.name || 'nội dung đã chọn'}`);
        screenEl('screen-save').disabled = !this.connected || !this.draft || this.saving;
        screenEl('screen-upload').disabled = !this.connected || !this.uploadToken || this.uploading || !screenEl('screen-files').files.length;
        screenEl('screen-files').disabled = this.uploading;
        const slidesReady = this.connected && this.state.playerConnected && actual.mode === 'slideshow' && (this.state.settings?.playlist?.length || 0) > 1;
        screenEl('screen-next').disabled = screenEl('screen-previous').disabled = !slidesReady;
        screenEl('screen-refresh').disabled = !this.connected;
    },
    renderForm() {
        const select = screenEl('screen-single'); select.replaceChildren();
        const empty = document.createElement('option'); empty.value = ''; empty.textContent = 'Chọn ảnh/video'; select.append(empty);
        for (const item of this.items) { const option = document.createElement('option'); option.value = item.id; option.textContent = item.name; select.append(option); }
        if (this.draft) {
            screenEl('screen-mode').value = this.draft.mode; select.value = this.draft.selectedId;
            screenEl('screen-seconds').value = this.draft.slideSeconds; screenEl('screen-text').value = this.draft.text;
            screenEl('screen-color').value = this.draft.color; screenEl('screen-background').value = this.draft.background;
            screenEl('screen-font').value = this.draft.fontSize; screenEl('screen-font-value').textContent = this.draft.fontSize;
            screenEl('screen-scroll').checked = this.draft.scroll;
        }
        for (const block of document.querySelectorAll('[data-screen-mode]')) block.hidden = block.dataset.screenMode !== this.draft?.mode;
        this.renderPlaylist(); this.renderPreview(); this.renderStatus();
    },
    renderPreview() {
        const box = screenEl('screen-preview'); box.replaceChildren(); if (!this.draft) return;
        const draft = this.draft; box.style.background = draft.mode === 'blank' ? '#000000' : draft.background;
        if (draft.mode === 'text') {
            const text = document.createElement('div'); text.className = 'screen-preview-text' + (draft.scroll ? ' screen-marquee' : '');
            text.textContent = draft.text; text.style.color = draft.color;
            text.style.fontSize = `${Math.max(10, draft.fontSize * (box.clientWidth || 480) / 1280)}px`; box.append(text);
        } else if (draft.mode !== 'blank') {
            const id = draft.mode === 'single' ? draft.selectedId : draft.playlist[0]; const item = this.items.find(item => item.id === id);
            if (item) {
                const media = document.createElement(item.kind === 'image' ? 'img' : 'video'); media.src = item.url;
                if (item.kind === 'image') media.alt = item.name;
                else { media.muted = true; media.controls = true; media.preload = 'metadata'; media.playsInline = true; }
                box.append(media);
            } else { const hint = document.createElement('p'); hint.textContent = 'Chọn nội dung từ thư viện'; box.append(hint); }
        }
    },
    renderLibrary() {
        screenEl('screen-item-count').textContent = this.items.length;
        const list = screenEl('screen-library'); list.replaceChildren();
        for (const item of this.items) {
            const row = document.createElement('div'); row.className = 'music-track-row';
            const choose = document.createElement('input'); choose.type = 'checkbox'; choose.checked = this.draft?.playlist.includes(item.id) || false;
            choose.setAttribute('aria-label', `Thêm ${item.name} vào slideshow`);
            choose.addEventListener('change', () => {
                if (!this.draft) return;
                const ids = this.draft.playlist.filter(id => id !== item.id); if (choose.checked) ids.push(item.id);
                this.change({ playlist: ids }); this.renderPlaylist();
            });
            const info = document.createElement('div'); info.className = 'music-track-info';
            const name = document.createElement('strong'); name.textContent = item.name;
            const details = document.createElement('small'); details.textContent = `${item.kind === 'video' ? 'VIDEO' : 'ẢNH'} · ${(item.bytes / 1024 / 1024).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} MB`;
            info.append(name, details);
            const select = document.createElement('button'); select.type = 'button'; select.className = 'btn btn-secondary btn-sm'; select.textContent = 'Chọn'; select.setAttribute('aria-label', `Chọn phát ${item.name}`);
            select.addEventListener('click', () => { this.change({ mode: 'single', selectedId: item.id }); this.renderForm(); });
            row.append(choose, info, select); list.append(row);
        }
        if (!this.items.length) { const hint = document.createElement('p'); hint.className = 'help'; hint.textContent = 'Tải ảnh hoặc video đầu tiên để bắt đầu.'; list.append(hint); }
    },
    renderPlaylist() {
        const list = screenEl('screen-playlist'); list.replaceChildren(); if (!this.draft) return;
        for (const [index, id] of this.draft.playlist.entries()) {
            const item = this.items.find(item => item.id === id); if (!item) continue;
            const row = document.createElement('div'); row.className = 'screen-playlist-row';
            const name = document.createElement('span'); name.textContent = `${index + 1}. ${item.name}`; row.append(name);
            for (const [label, delta] of [['↑', -1], ['↓', 1], ['×', 0]]) {
                const button = document.createElement('button'); button.type = 'button'; button.className = 'btn btn-secondary btn-sm'; button.textContent = label;
                button.setAttribute('aria-label', `${delta === -1 ? 'Đưa lên' : delta === 1 ? 'Đưa xuống' : 'Bỏ khỏi slide'} ${item.name}`);
                button.disabled = delta === -1 ? index === 0 : delta === 1 ? index === this.draft.playlist.length - 1 : false;
                button.addEventListener('click', () => {
                    const next = [...this.draft.playlist]; if (!delta) next.splice(index, 1); else [next[index], next[index + delta]] = [next[index + delta], next[index]];
                    this.change({ playlist: next }); this.renderPlaylist(); this.renderLibrary();
                }); row.append(button);
            }
            list.append(row);
        }
    }
};
window.screenControl = screenControl;
screenEl('screen-mode').addEventListener('change', event => { screenControl.change({ mode: event.target.value }); screenControl.renderForm(); });
screenEl('screen-single').addEventListener('change', event => screenControl.change({ selectedId: event.target.value }));
for (const [id, key, number] of [['screen-seconds', 'slideSeconds', true], ['screen-text', 'text'], ['screen-color', 'color'], ['screen-background', 'background'], ['screen-font', 'fontSize', true]])
    screenEl(id).addEventListener('input', event => { screenControl.change({ [key]: number ? Number(event.target.value) : event.target.value }); screenEl('screen-font-value').textContent = screenControl.draft?.fontSize || 64; });
screenEl('screen-scroll').addEventListener('change', event => screenControl.change({ scroll: event.target.checked }));
screenEl('screen-save').addEventListener('click', () => {
    if (!screenControl.draft || screenControl.saving) return;
    screenControl.saving = true; screenControl.savedFromRevision = screenControl.state.settings?.revision || 0;
    send({ type: 'screen_save', settings: screenControl.draft }); screenControl.renderStatus();
});
screenEl('screen-refresh').addEventListener('click', () => send({ type: 'screen_refresh' }));
for (const action of ['next', 'previous']) screenEl(`screen-${action}`).addEventListener('click', () => send({ type: 'screen_command', action }));
screenEl('screen-select-all').addEventListener('click', () => { screenControl.change({ playlist: screenControl.items.map(item => item.id), mode: 'slideshow' }); screenControl.renderForm(); screenControl.renderLibrary(); });
screenEl('screen-files').addEventListener('change', () => screenControl.renderStatus());
screenEl('screen-upload').addEventListener('click', async () => {
    const files = [...screenEl('screen-files').files]; if (!files.length || screenControl.uploading) return;
    if (files.some(file => !/\.(png|jpe?g|mp4|mov|m4v|webm)$/i.test(file.name) || file.size > (/\.(png|jpe?g)$/i.test(file.name) ? 20 : 500) * 1024 * 1024)) {
        screenEl('screen-upload-status').textContent = 'Chọn ảnh PNG/JPG tối đa 20 MB hoặc video tối đa 500 MB.'; return;
    }
    screenControl.uploading = true; screenControl.renderStatus(); const progress = screenEl('screen-upload-progress'); progress.hidden = false; let uploaded = 0;
    try {
        for (const file of files) {
            screenEl('screen-upload-status').textContent = `Đang tải ${uploaded + 1}/${files.length}: ${file.name}`;
            await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest(); xhr.open('POST', '/api/screen/upload'); xhr.timeout = 300000;
                xhr.setRequestHeader('Content-Type', 'application/octet-stream'); xhr.setRequestHeader('X-Screen-Filename', encodeURIComponent(file.name)); xhr.setRequestHeader('X-Screen-Token', screenControl.uploadToken);
                xhr.upload.onprogress = event => { if (event.lengthComputable) progress.value = (uploaded + event.loaded / event.total) / files.length * 100; };
                xhr.onload = () => { let body = {}; try { body = JSON.parse(xhr.responseText); } catch { /* HTTP error */ }
                    if (xhr.status === 201) resolve(); else reject(Error(body.error || 'Không tải được nội dung.')); };
                xhr.onerror = xhr.ontimeout = () => reject(Error('Mất kết nối hoặc tải quá lâu. Vui lòng thử lại.')); xhr.send(file);
            }); uploaded++;
        }
        progress.value = 100; screenEl('screen-files').value = ''; screenEl('screen-upload-status').textContent = `Đã tải ${uploaded} nội dung.`;
    } catch (error) { screenEl('screen-upload-status').textContent = `${uploaded ? `Đã tải ${uploaded} nội dung. ` : ''}${error.message}`; }
    finally { screenControl.uploading = false; screenControl.renderStatus(); }
});
screenControl.onConnection(socket?.readyState === WebSocket.OPEN); screenControl.renderForm();
