/* global send, socket */
'use strict';
const backupButton = document.getElementById('session-backup');
const backupStatus = document.getElementById('session-backup-status');
const backupFile = document.getElementById('session-backup-file');
const sessionBackup = {
    connected: false, saving: false, timer: null,
    render() {
        backupButton.disabled = !this.connected || this.saving;
        backupButton.textContent = this.saving ? 'Đang sao lưu…' : 'Sao lưu';
        backupButton.setAttribute('aria-busy', String(this.saving));
    },
    finish() { clearTimeout(this.timer); this.timer = null; this.saving = false; this.render(); },
    onConnection(connected) {
        this.connected = connected;
        if (!connected) {
            if (this.saving) backupStatus.textContent = 'Mất kết nối trước khi nhận xác nhận sao lưu. Kết nối lại rồi thử lại.';
            this.finish();
        } else if (!backupFile.textContent && !this.saving) backupStatus.textContent = 'Bấm Sao lưu để giữ dữ liệu tại thời điểm này.';
        this.render();
    },
    onMessage(data) {
        if (data.type === 'session_backup_saved') {
            this.finish();
            const time = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'medium', timeZone: 'Asia/Bangkok' }).format(new Date(data.savedAt));
            backupStatus.textContent = `Đã sao lưu lúc ${time} · ${Number(data.donorCount || 0).toLocaleString('vi-VN')} người tặng quà · ${Number(data.diamonds || 0).toLocaleString('vi-VN')} xu.`;
            backupFile.textContent = data.fileName; backupFile.hidden = false;
        } else if (data.type === 'session_backup_error') {
            this.finish(); backupStatus.textContent = data.message || 'Không sao lưu được. Vui lòng thử lại.';
        }
    },
    save() {
        if (!this.connected || this.saving || socket?.readyState !== WebSocket.OPEN) return;
        this.saving = true; backupStatus.textContent = 'Đang lưu bản sao phiên LIVE…'; this.render();
        this.timer = setTimeout(() => { this.finish(); backupStatus.textContent = 'Chưa nhận được xác nhận sao lưu. Bấm Sao lưu để thử lại.'; }, 10000);
        send({ type: 'session_backup' });
    }
};
window.sessionBackup = sessionBackup;
backupButton.addEventListener('click', () => sessionBackup.save());
sessionBackup.onConnection(socket?.readyState === WebSocket.OPEN);
