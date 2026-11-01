/* global send, GiftSpeechQueue */
'use strict';
const liveActivities = {
    state: null,
    pendingFloor: null,
    receivedAt: 0,
    autoInitialized: false,
    onOpen() { this.pendingFloor = null; claimAutomaticSpeech(); },
    onClose() { speechActive = false; speechElsewhere = false; giftSpeech.stop(); updateSpeechStatus(); },
    onMessage(data) {
        if (data.type === 'error') document.getElementById('engagement-message').textContent = data.message;
        if (data.type === 'error' && this.pendingFloor) {
            document.getElementById('floor-message').textContent = data.message;
            this.pendingFloor = null;
        }
        if (data.type === 'engagement_state') {
            this.state = data.engagement; this.receivedAt = Date.now(); this.render();
            if (this.pendingFloor === this.state.floorTheme) {
                document.getElementById('floor-message').textContent = `Đã đổi sàn trong game: ${document.getElementById('floor-current').textContent}.`;
                this.pendingFloor = null;
            }
        }
        if (data.type === 'engagement_ack') document.getElementById('engagement-message').textContent = data.message;
        if (data.type === 'gift_thanks' && speechActive) giftSpeech.enqueue(data);
        if (data.type === 'speech_available') claimAutomaticSpeech();
        if (data.type === 'speech_status') {
            speechActive = Boolean(data.active);
            speechElsewhere = !speechActive && speechWanted && data.reason === 'other-tab';
            if (!speechActive) giftSpeech.stop();
            updateSpeechStatus();
        }
    },
    render() {
        const state = this.state;
        if (!state) return;
        const names = { battle: 'Đấu đội Đỏ – Xanh', vote: 'Bình chọn sàn', dance: 'Cả phòng cùng nhảy' };
        const active = state[state.activity];
        if (state.auto) {
            const auto = state.auto;
            const next = Math.max(0, Math.ceil((auto.nextAt - state.serverTime - (Date.now() - this.receivedAt)) / 1000));
            document.getElementById('auto-toggle').textContent = auto.enabled ? 'Tạm dừng tự chạy' : 'Bật tự chạy';
            document.getElementById('auto-status').textContent = !auto.enabled ? 'Đã tạm dừng tự động.'
                : state.activity ? 'Tự động đang bật · Vòng tiếp theo sẽ được chọn khi vòng này kết thúc.'
                : `Tự động đang bật · Sự kiện tiếp theo sau ${next}s`;
            if (!this.autoInitialized) {
                document.getElementById('auto-min-gap').value = auto.minGapSeconds;
                document.getElementById('auto-max-gap').value = auto.maxGapSeconds;
                this.autoInitialized = true;
            }
        }
        const remaining = active ? Math.max(0, Math.ceil((active.endsAt - state.serverTime - (Date.now() - this.receivedAt)) / 1000)) : 0;
        document.getElementById('activity-status').textContent = state.activity ? `${names[state.activity]} · ${remaining}s` : state.lastResult || 'Sẵn sàng mở hoạt động';
        document.getElementById('battle-score').textContent = `Đỏ ${state.battle.red} (${state.battle.redMembers} người) — Xanh ${state.battle.blue} (${state.battle.blueMembers} người)`;
        document.getElementById('vote-score').textContent = `1 Neon: ${state.vote.neon} · 2 Disco: ${state.vote.disco} · 3 Dung nham: ${state.vote.lava}`;
        document.getElementById('dance-score').textContent = `${state.dance.count}/${state.dance.target} người đã chat “nhảy”`;
        document.getElementById('energy-value').textContent = `${state.energy.value.toLocaleString('vi-VN')} / ${state.energy.goal.toLocaleString('vi-VN')} tim`;
        document.getElementById('energy-progress').value = state.energy.value;
        document.getElementById('energy-progress').max = state.energy.goal;
        const floorNames = { neon: 'Neon lục giác', disco: 'Disco ô vuông', lava: 'Dung nham', classic: 'LED ô vuông cổ điển' };
        for (const label of document.querySelectorAll('[data-floor-current]')) label.textContent = floorNames[state.floorTheme] || state.floorTheme;
        for (const button of document.querySelectorAll('[data-floor-theme]')) {
            const selected = button.dataset.floorTheme === state.floorTheme;
            button.disabled = socket?.readyState !== WebSocket.OPEN || selected;
            button.setAttribute('aria-pressed', String(selected));
            button.setAttribute('aria-label', `${selected ? 'Đang dùng' : 'Dùng sàn'} ${floorNames[button.dataset.floorTheme]}`);
            button.textContent = selected ? 'Đang dùng' : 'Dùng sàn này';
            button.closest('[data-theme-card]')?.classList.toggle('is-selected', selected);
        }
        for (const button of document.querySelectorAll('[data-engagement-start]')) button.disabled = Boolean(state.activity);
        document.getElementById('activity-stop').disabled = !state.activity;
        const list = document.getElementById('loyal-viewers');
        list.replaceChildren(...state.members.filter(member => member.loyaltyDays > 0).sort((a, b) => b.loyaltyDays - a.loyaltyDays).slice(0, 8).map(member => {
            const row = document.createElement('li');
            row.textContent = `${member.nickname} · ${member.loyaltyDays} ngày · ${member.loyaltyTitle || 'Thành viên mới'}`;
            return row;
        }));
        if (!list.childElementCount) { const row = document.createElement('li'); row.textContent = 'Danh hiệu xuất hiện sau 3, 7 và 30 ngày tham gia.'; list.append(row); }
    }
};
window.liveActivities = liveActivities;
setInterval(() => liveActivities.render(), 1000);
for (const button of document.querySelectorAll('[data-engagement-start]')) button.addEventListener('click', () => {
    const action = button.dataset.engagementStart;
    send({ type: 'engagement_command', action, seconds: Number(document.getElementById(`${action}-seconds`).value), target: Number(document.getElementById('dance-target').value) });
});
for (const button of document.querySelectorAll('[data-floor-theme]')) button.addEventListener('click', () => {
    liveActivities.pendingFloor = button.dataset.floorTheme;
    document.getElementById('floor-message').textContent = 'Đang đổi sàn…';
    send({ type: 'engagement_command', action: 'floor_set', theme: button.dataset.floorTheme });
});
document.getElementById('open-floor-tab').addEventListener('click', () => document.querySelector('[data-tab="floors"]').click());
document.getElementById('activity-stop').addEventListener('click', () => send({ type: 'engagement_command', action: 'activity_stop' }));
document.getElementById('energy-save').addEventListener('click', () => send({ type: 'engagement_command', action: 'energy_goal', goal: Number(document.getElementById('energy-goal').value) }));
document.getElementById('auto-toggle').addEventListener('click', () => send({ type: 'engagement_command', action: 'auto_config', enabled: !liveActivities.state?.auto?.enabled }));
document.getElementById('auto-save').addEventListener('click', () => {
    liveActivities.autoInitialized = false;
    send({ type: 'engagement_command', action: 'auto_config',
        minGapSeconds: Number(document.getElementById('auto-min-gap').value), maxGapSeconds: Number(document.getElementById('auto-max-gap').value) });
});

let speechActive = false;
let speechWanted = localStorage.getItem('barclub-speech-enabled') !== 'false';
let speechElsewhere = false;
let speechBlocked = false;
let speechProblem = '';
const synth = window.speechSynthesis;
const speechVoice = document.getElementById('speech-voice');
const speechRate = document.getElementById('speech-rate');
const speechVolume = document.getElementById('speech-volume');
let availableVoices = [];
function populateVoices() {
    availableVoices = synth?.getVoices() || [];
    const selected = localStorage.getItem('barclub-speech-voice');
    speechVoice.replaceChildren(...availableVoices.map(voice => {
        const option = document.createElement('option'); option.value = voice.voiceURI;
        option.textContent = `${voice.name} (${voice.lang})`; return option;
    }));
    const preferred = availableVoices.find(voice => voice.voiceURI === selected) || availableVoices.find(voice => voice.lang.toLowerCase().startsWith('vi'));
    if (preferred) speechVoice.value = preferred.voiceURI;
    updateSpeechStatus();
}
function updateSpeechStatus() {
    document.getElementById('speech-toggle').textContent = speechElsewhere ? 'Đọc tại tab này' : speechWanted ? 'Tắt đọc cảm ơn' : 'Bật đọc cảm ơn';
    const voice = availableVoices.find(item => item.voiceURI === speechVoice.value);
    document.getElementById('speech-status').textContent = !synth ? 'Trình duyệt chưa hỗ trợ giọng đọc.'
        : !speechWanted ? 'Đang tắt theo lựa chọn của bạn.'
        : speechElsewhere ? 'Tự động đang bật · Giọng đọc đang phát từ tab quản trị khác.'
        : speechBlocked ? 'Trình duyệt đang chặn âm thanh. Bấm một lần vào trang để tự đọc tiếp.'
        : speechProblem ? `Chưa phát được giọng đọc (${speechProblem}). Chọn giọng khác hoặc bấm Nghe thử.`
        : speechActive ? 'Tự động đang bật · Sẵn sàng đọc khi có quà tặng.' : 'Tự động đang bật · Đang chờ kết nối máy chủ.';
    document.getElementById('speech-voice-hint').textContent = voice?.lang.toLowerCase().startsWith('vi')
        ? 'Giọng tiếng Việt đã sẵn sàng.' : 'Chọn giọng tiếng Việt nếu có; bấm Nghe thử để kiểm tra phát âm.';
}
function speakGift(text, done) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'vi-VN';
    utterance.voice = availableVoices.find(voice => voice.voiceURI === speechVoice.value) || null;
    utterance.rate = Number(speechRate.value); utterance.volume = Number(speechVolume.value);
    utterance.onstart = () => { speechBlocked = false; speechProblem = ''; updateSpeechStatus(); };
    utterance.onend = () => done();
    utterance.onerror = event => {
        if (event.error === 'not-allowed') speechBlocked = true;
        else if (!['canceled', 'interrupted'].includes(event.error)) speechProblem = event.error;
        updateSpeechStatus(); done(event.error);
    };
    synth.speak(utterance);
}
const giftSpeech = new GiftSpeechQueue({ speak: speakGift, cancel: () => synth?.cancel(),
    blocked: () => { speechBlocked = true; updateSpeechStatus(); } });
function claimAutomaticSpeech() {
    if (synth && speechWanted) send({ type: 'speech_claim', enabled: true, takeover: false });
}
speechRate.value = localStorage.getItem('barclub-speech-rate') || '1';
speechVolume.value = localStorage.getItem('barclub-speech-volume') || '0.9';
for (const input of [speechVoice, speechRate, speechVolume]) input.addEventListener('change', () => {
    localStorage.setItem(`barclub-${input.id}`, input.value); updateSpeechStatus();
});
document.getElementById('speech-toggle').addEventListener('click', () => {
    if (!synth) return;
    speechWanted = speechElsewhere || !speechWanted;
    localStorage.setItem('barclub-speech-enabled', String(speechWanted));
    speechElsewhere = false; speechBlocked = false; speechProblem = '';
    if (speechWanted) giftSpeech.resume(); else giftSpeech.stop();
    send({ type: 'speech_claim', enabled: speechWanted });
    updateSpeechStatus();
});
document.getElementById('speech-test').addEventListener('click', () => { if (synth) speakGift('Cảm ơn Minh đã tặng ba hoa hồng nhé!', () => {}); });
function resumeSpeechFromGesture(event) {
    if (!event.isTrusted || !speechWanted || event.target.closest?.('#speech-toggle, #speech-test')) return;
    if (speechBlocked) { speechBlocked = false; speechProblem = ''; giftSpeech.resume(); updateSpeechStatus(); }
}
document.addEventListener('pointerdown', resumeSpeechFromGesture);
document.addEventListener('keydown', resumeSpeechFromGesture);
window.addEventListener('storage', event => {
    if (event.key !== 'barclub-speech-enabled') return;
    speechWanted = event.newValue !== 'false';
    speechElsewhere = false; speechBlocked = false; speechProblem = '';
    if (speechWanted) claimAutomaticSpeech();
    else { giftSpeech.stop(); send({ type: 'speech_claim', enabled: false }); }
    updateSpeechStatus();
});
window.addEventListener('beforeunload', () => giftSpeech.stop());
if (synth) synth.addEventListener('voiceschanged', populateVoices);
populateVoices();
if (socket?.readyState === WebSocket.OPEN) claimAutomaticSpeech();
