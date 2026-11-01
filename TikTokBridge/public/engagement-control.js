/* global send, GiftSpeechQueue */
'use strict';
const liveActivities = {
    state: null,
    receivedAt: 0,
    onOpen() { if (speechActive) send({ type: 'speech_claim', enabled: true }); },
    onMessage(data) {
        if (data.type === 'error') document.getElementById('engagement-message').textContent = data.message;
        if (data.type === 'engagement_state') {
            this.state = data.engagement; this.receivedAt = Date.now(); this.render();
        }
        if (data.type === 'engagement_ack') document.getElementById('engagement-message').textContent = data.message;
        if (data.type === 'gift_thanks' && speechActive) giftSpeech.enqueue(data);
        if (data.type === 'speech_status') {
            speechActive = Boolean(data.active);
            if (!speechActive) giftSpeech.stop();
            updateSpeechStatus();
        }
    },
    render() {
        const state = this.state;
        if (!state) return;
        const names = { battle: 'Đấu đội Đỏ – Xanh', vote: 'Bình chọn sàn', dance: 'Cả phòng cùng nhảy' };
        const active = state[state.activity];
        const remaining = active ? Math.max(0, Math.ceil((active.endsAt - state.serverTime - (Date.now() - this.receivedAt)) / 1000)) : 0;
        document.getElementById('activity-status').textContent = state.activity ? `${names[state.activity]} · ${remaining}s` : state.lastResult || 'Sẵn sàng mở hoạt động';
        document.getElementById('battle-score').textContent = `Đỏ ${state.battle.red} (${state.battle.redMembers} người) — Xanh ${state.battle.blue} (${state.battle.blueMembers} người)`;
        document.getElementById('vote-score').textContent = `1 Neon: ${state.vote.neon} · 2 Disco: ${state.vote.disco} · 3 Dung nham: ${state.vote.lava}`;
        document.getElementById('dance-score').textContent = `${state.dance.count}/${state.dance.target} người đã chat “nhảy”`;
        document.getElementById('energy-value').textContent = `${state.energy.value.toLocaleString('vi-VN')} / ${state.energy.goal.toLocaleString('vi-VN')} tim`;
        document.getElementById('energy-progress').value = state.energy.value;
        document.getElementById('energy-progress').max = state.energy.goal;
        document.getElementById('floor-current').textContent = { neon: 'Neon lục giác', disco: 'Disco ô vuông', lava: 'Dung nham' }[state.floorTheme];
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
for (const button of document.querySelectorAll('[data-floor-theme]')) button.addEventListener('click', () =>
    send({ type: 'engagement_command', action: 'floor_set', theme: button.dataset.floorTheme }));
document.getElementById('activity-stop').addEventListener('click', () => send({ type: 'engagement_command', action: 'activity_stop' }));
document.getElementById('energy-save').addEventListener('click', () => send({ type: 'engagement_command', action: 'energy_goal', goal: Number(document.getElementById('energy-goal').value) }));

let speechActive = false;
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
    document.getElementById('speech-toggle').textContent = speechActive ? 'Tắt đọc cảm ơn' : 'Bật đọc cảm ơn';
    const voice = availableVoices.find(item => item.voiceURI === speechVoice.value);
    document.getElementById('speech-status').textContent = !synth ? 'Trình duyệt chưa hỗ trợ giọng đọc.'
        : speechActive ? 'Đang đọc quà trên tab này.' : 'Đang tắt. Bấm bật để cho phép trình duyệt phát giọng đọc.';
    document.getElementById('speech-voice-hint').textContent = voice?.lang.toLowerCase().startsWith('vi')
        ? 'Giọng tiếng Việt đã sẵn sàng.' : 'Chọn giọng tiếng Việt nếu có; bấm Nghe thử để kiểm tra phát âm.';
}
function speakGift(text, done) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'vi-VN';
    utterance.voice = availableVoices.find(voice => voice.voiceURI === speechVoice.value) || null;
    utterance.rate = Number(speechRate.value); utterance.volume = Number(speechVolume.value);
    utterance.onend = utterance.onerror = done;
    synth.speak(utterance);
}
const giftSpeech = new GiftSpeechQueue({ speak: speakGift, cancel: () => synth?.cancel() });
speechRate.value = localStorage.getItem('barclub-speech-rate') || '1';
speechVolume.value = localStorage.getItem('barclub-speech-volume') || '0.9';
for (const input of [speechVoice, speechRate, speechVolume]) input.addEventListener('change', () => {
    localStorage.setItem(`barclub-${input.id}`, input.value); updateSpeechStatus();
});
document.getElementById('speech-toggle').addEventListener('click', () => {
    if (!synth) return;
    if (!speechActive) {
        // A user gesture unlocks speech playback in Chromium.
        speakGift('Đã bật đọc cảm ơn quà tặng.', () => {});
    }
    send({ type: 'speech_claim', enabled: !speechActive });
});
document.getElementById('speech-test').addEventListener('click', () => { if (synth) speakGift('Cảm ơn Minh đã tặng ba hoa hồng nhé!', () => {}); });
window.addEventListener('beforeunload', () => giftSpeech.stop());
if (synth) synth.addEventListener('voiceschanged', populateVoices);
populateVoices();
