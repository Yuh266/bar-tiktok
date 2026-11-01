/* global send */
'use strict';
const floorModeration = {
    players: [], vipScores: [], connected: false,
    onConnection(connected) { this.connected = connected; this.render(); },
    onMessage(data) {
        if (data.type === 'floor_roster') {
            this.players = data.players || []; this.vipScores = data.vipScores || []; this.connected = true; this.render();
        }
        if (data.type === 'moderation_ack' || data.type === 'error')
            document.getElementById('moderation-message').textContent = data.message || '';
    },
    render() {
        document.getElementById('floor-player-count').textContent = this.players.length;
        document.getElementById('reset-leaderboard').disabled = !this.connected || !this.vipScores.length;
        const normalize = value => String(value || '').toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
        const query = normalize(document.getElementById('floor-player-search').value.trim());
        const list = document.getElementById('floor-player-list');
        const matches = this.players.filter(player => normalize(`${player.nickname} ${player.uniqueId} ${player.userId}`).includes(query))
            .sort((a, b) => (b.lastActive || 0) - (a.lastActive || 0));
        list.replaceChildren(...matches.map(player => {
            const row = document.createElement('tr'); row.dataset.userId = player.userId;
            const identity = document.createElement('td');
            const box = document.createElement('div'); box.className = 'roster-identity';
            if (player.avatar) {
                const image = document.createElement('img'); image.src = player.avatar; image.alt = ''; image.loading = 'lazy';
                image.addEventListener('error', () => { image.hidden = true; }); box.append(image);
            }
            const labels = document.createElement('span'); const name = document.createElement('strong');
            name.textContent = player.nickname || player.uniqueId || 'Người xem';
            const account = document.createElement('small'); account.textContent = player.uniqueId || player.userId;
            labels.append(name, account); box.append(labels); identity.append(box);
            const score = document.createElement('td'); score.textContent = Number(player.score || 0).toLocaleString('vi-VN');
            const actions = document.createElement('td'); const kick = document.createElement('button');
            kick.type = 'button'; kick.className = 'btn btn-danger btn-sm'; kick.textContent = 'Kick khỏi sàn'; kick.disabled = !this.connected;
            kick.addEventListener('click', () => { kick.disabled = true; send({ type: 'kick_player', userId: player.userId }); });
            actions.append(kick); row.append(identity, score, actions); return row;
        }));
        if (!matches.length) {
            const row = document.createElement('tr'); const cell = document.createElement('td'); cell.colSpan = 3;
            cell.textContent = query ? 'Không có người chơi khớp tìm kiếm.' : 'Chưa có người xem nào trên sàn.';
            row.append(cell); list.append(row);
        }
        const ranking = document.getElementById('moderation-leaderboard');
        ranking.replaceChildren(...this.vipScores.slice(0, 10).map(donor => {
            const row = document.createElement('li'); row.textContent = `${donor.nickname || 'Người xem'} · ${Number(donor.score || 0).toLocaleString('vi-VN')} điểm`; return row;
        }));
        if (!this.vipScores.length) { const row = document.createElement('li'); row.textContent = 'BXH hiện chưa có điểm.'; ranking.append(row); }
    }
};
window.floorModeration = floorModeration;
document.getElementById('floor-player-search').addEventListener('input', () => floorModeration.render());
document.getElementById('reset-leaderboard').addEventListener('click', () => { document.getElementById('leaderboard-confirm').hidden = false; });
document.getElementById('cancel-reset-leaderboard').addEventListener('click', () => { document.getElementById('leaderboard-confirm').hidden = true; });
document.getElementById('confirm-reset-leaderboard').addEventListener('click', () => {
    document.getElementById('leaderboard-confirm').hidden = true;
    send({ type: 'reset_leaderboard' });
});
