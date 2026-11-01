'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { normalizeText } = require('./master/rules');

const THEMES = ['neon', 'disco', 'lava'];
const number = (value, fallback, min, max) => Number.isFinite(Number(value))
    ? Math.min(max, Math.max(min, Math.round(Number(value)))) : fallback;
const realUser = id => Boolean(id) && !/^(npc-|demo-|master-test$)/.test(id);
const localDay = time => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(time);
const loyaltyTitle = days => days >= 30 ? 'Huyền thoại sàn' : days >= 7 ? 'Dân chơi lâu năm' : days >= 3 ? 'Khách quen' : '';

class ViewerStore {
    constructor(file = null) {
        this.file = file;
        this.viewers = new Map();
        this.timer = null;
        if (file && fs.existsSync(file)) {
            const data = JSON.parse(fs.readFileSync(file, 'utf8'));
            for (const viewer of data.viewers || [])
                if (realUser(viewer.userId)) this.viewers.set(viewer.userId, viewer);
        }
    }

    visit(userId, nickname, now) {
        if (!realUser(userId)) return { loyaltyDays: 0, loyaltyTitle: '' };
        const date = localDay(now);
        const previous = this.viewers.get(userId);
        const viewer = previous || { userId, visits: 0, lastDate: '', nickname: '' };
        if (date > viewer.lastDate) {
            viewer.visits++;
            viewer.lastDate = date;
        }
        viewer.nickname = String(nickname || viewer.nickname).slice(0, 80);
        viewer.lastSeen = now;
        this.viewers.set(userId, viewer);
        if (this.file && !this.timer) {
            this.timer = setTimeout(() => {
                this.timer = null;
                try { this.flush(); } catch (error) { console.error('Could not save returning viewers:', error.message); }
            }, 1000);
            this.timer.unref();
        }
        return { loyaltyDays: viewer.visits, loyaltyTitle: loyaltyTitle(viewer.visits) };
    }

    flush() {
        if (!this.file) return;
        clearTimeout(this.timer);
        this.timer = null;
        fs.mkdirSync(path.dirname(this.file), { recursive: true });
        fs.writeFileSync(`${this.file}.tmp`, JSON.stringify({ version: 1, viewers: [...this.viewers.values()] }));
        fs.renameSync(`${this.file}.tmp`, this.file);
    }
}

class EngagementEngine {
    constructor({ store = new ViewerStore(), config = {}, now = Date.now, random = Math.random } = {}) {
        this.store = store;
        this.now = now;
        this.random = random;
        this.config = {
            battleSeconds: number(config.battleSeconds, 180, 30, 600),
            voteSeconds: number(config.voteSeconds, 30, 10, 120),
            danceSeconds: number(config.danceSeconds, 10, 5, 60),
            danceTarget: number(config.danceTarget, 10, 1, 400),
            energyGoal: number(config.energyGoal, 2000, 100, 100000)
        };
        this.floorTheme = THEMES.includes(config.floorTheme) ? config.floorTheme : 'neon';
        const minGapSeconds = number(config.autoMinGapSeconds, 30, 15, 600);
        this.auto = { enabled: config.autoEnabled === true, minGapSeconds,
            maxGapSeconds: number(config.autoMaxGapSeconds, 60, minGapSeconds, 900), nextAt: 0 };
        this.members = new Map();
        this.reset();
    }

    reset() {
        this.activity = '';
        this.battle = { status: 'idle', red: 0, blue: 0, redMembers: 0, blueMembers: 0, endsAt: 0, winner: '' };
        this.vote = { status: 'idle', neon: 0, disco: 0, lava: 0, endsAt: 0, winner: '' };
        this.dance = { status: 'idle', startsAt: 0, endsAt: 0, count: 0, target: this.config.danceTarget, success: false };
        this.energy = { value: 0, goal: this.config.energyGoal, partyUntil: 0, celebrations: 0 };
        this.teams = new Map(); this.battleLikes = new Map(); this.ballots = new Map(); this.dancers = new Set();
        for (const member of this.members.values()) member.team = '';
        this.lastResult = '';
        this.resultUntil = 0;
        this.autoQueue = [];
        this.lastAutoActivity = '';
        this.auto.nextAt = this.auto.enabled ? this.now() + 15000 : 0;
        this.revision = (this.revision || 0) + 1;
    }

    command(action, options = {}) {
        const now = this.now();
        this.tick(now, false);
        if (action === 'floor_set') {
            if (!THEMES.includes(options.theme)) throw new Error('Mẫu sàn không hợp lệ.');
            this.floorTheme = options.theme;
        } else if (action === 'energy_goal') {
            this.config.energyGoal = number(options.goal, 2000, 100, 100000);
            this.energy.goal = this.config.energyGoal;
            this.energy.value = Math.min(this.energy.value, this.energy.goal - 1);
        } else if (action === 'auto_config') {
            if (typeof options.enabled === 'boolean') this.auto.enabled = options.enabled;
            this.auto.minGapSeconds = number(options.minGapSeconds, this.auto.minGapSeconds, 15, 600);
            this.auto.maxGapSeconds = number(options.maxGapSeconds, this.auto.maxGapSeconds, this.auto.minGapSeconds, 900);
            this.auto.nextAt = this.auto.enabled && !this.activity ? Math.max(this.resultUntil, now + 15000) : 0;
        } else if (action === 'activity_stop') {
            this.finish(now);
        } else {
            this.begin(action, options, now);
        }
        this.revision++;
        return this.snapshot(now);
    }

    begin(action, options, now) {
        if (!['battle_start', 'vote_start', 'dance_start'].includes(action)) throw new Error('Hoạt động không hợp lệ.');
        if (this.activity) throw new Error('Hãy kết thúc hoạt động hiện tại trước.');
        this.auto.nextAt = 0;
        this.lastResult = ''; this.resultUntil = 0;
        for (const item of [this.battle, this.vote, this.dance]) if (item.status === 'results') item.status = 'idle';
        if (action === 'battle_start') {
            this.teams.clear(); this.battleLikes.clear();
            for (const member of this.members.values()) member.team = '';
            this.activity = 'battle';
            this.battle = { status: 'running', red: 0, blue: 0, redMembers: 0, blueMembers: 0,
                endsAt: now + number(options.seconds, this.config.battleSeconds, 30, 600) * 1000, winner: '' };
        } else if (action === 'vote_start') {
            this.ballots.clear(); this.activity = 'vote';
            this.vote = { status: 'running', neon: 0, disco: 0, lava: 0,
                endsAt: now + number(options.seconds, this.config.voteSeconds, 10, 120) * 1000, winner: '' };
        } else if (action === 'dance_start') {
            this.dancers.clear(); this.activity = 'dance';
            this.dance = { status: 'countdown', startsAt: now + 3000,
                endsAt: now + 3000 + number(options.seconds, this.config.danceSeconds, 5, 60) * 1000,
                count: 0, target: number(options.target, this.config.danceTarget, 1, 400), success: false };
        }
    }

    nextAutomaticActivity() {
        if (!this.autoQueue.length) {
            this.autoQueue = ['battle_start', 'vote_start', 'dance_start'];
            for (let index = this.autoQueue.length - 1; index > 0; index--) {
                const selected = Math.floor(this.random() * (index + 1));
                [this.autoQueue[index], this.autoQueue[selected]] = [this.autoQueue[selected], this.autoQueue[index]];
            }
            if (this.autoQueue[0] === this.lastAutoActivity)
                [this.autoQueue[0], this.autoQueue[1]] = [this.autoQueue[1], this.autoQueue[0]];
        }
        this.lastAutoActivity = this.autoQueue.shift();
        return this.lastAutoActivity;
    }

    settings() {
        return { floorTheme: this.floorTheme, energyGoal: this.energy.goal, autoEnabled: this.auto.enabled,
            autoMinGapSeconds: this.auto.minGapSeconds, autoMaxGapSeconds: this.auto.maxGapSeconds };
    }

    process(event) {
        const now = this.now();
        this.tick(now);
        if (!event.userId) return;
        const id = event.userId;
        const loyalty = this.store.visit(id, event.nickname, now);
        const member = { userId: id, nickname: event.nickname, ...loyalty, team: this.teams.get(id) || '' };
        this.members.set(id, member);
        if (this.members.size > 1000) this.members.delete(this.members.keys().next().value);
        Object.assign(event, loyalty, { team: member.team });
        const chat = normalizeText(event.comment || '').replace(/đ/g, 'd');
        if (this.activity === 'battle') {
            const team = ['do', 'red'].includes(chat) ? 'red' : ['xanh', 'blue'].includes(chat) ? 'blue' : '';
            if (event.type === 'chat' && team && !this.teams.has(id)) {
                this.teams.set(id, team); member.team = event.team = team;
                this.battle[`${team}Members`]++;
                this.battle[team] += 1;
                event.engagementJoined = true;
            }
            const assigned = this.teams.get(id);
            if (event.type === 'like' && assigned) {
                const before = this.battleLikes.get(id) || 0;
                const after = Math.min(300, before + Math.max(0, Number(event.likeCount) || 0));
                this.battleLikes.set(id, after);
                this.battle[assigned] += Math.floor(after / 20) - Math.floor(before / 20);
            }
        } else if (this.activity === 'vote' && event.type === 'chat' && /^[123]$/.test(chat) && !this.ballots.has(id)) {
            const theme = THEMES[Number(chat) - 1];
            this.ballots.set(id, theme); this.vote[theme]++;
            event.engagementJoined = true;
        } else if (this.activity === 'dance' && event.type === 'chat' &&
            ['nhay', 'dance'].includes(chat) && now >= this.dance.startsAt && !this.dancers.has(id)) {
            this.dancers.add(id); this.dance.count = this.dancers.size;
            event.engagementJoined = true;
            if (this.dance.count >= this.dance.target) this.finish(now);
        }
        if (event.type === 'like') {
            // This free community goal is separate from diamonds and the gift leaderboard.
            this.energy.value += Math.max(0, Number(event.likeCount) || 0);
            if (this.energy.value >= this.energy.goal) {
                this.energy.celebrations += Math.floor(this.energy.value / this.energy.goal);
                this.energy.value %= this.energy.goal;
                this.energy.partyUntil = now + 10000;
            }
        }
        this.revision++;
    }

    finish(now = this.now()) {
        if (!this.activity) return;
        if (this.activity === 'battle') {
            this.battle.status = 'results';
            this.battle.winner = this.battle.red === this.battle.blue ? 'draw' : this.battle.red > this.battle.blue ? 'red' : 'blue';
            this.lastResult = this.battle.winner === 'draw' ? 'Hai đội hòa nhau!' : `Đội ${this.battle.winner === 'red' ? 'ĐỎ' : 'XANH'} chiến thắng!`;
        } else if (this.activity === 'vote') {
            this.vote.status = 'results';
            const highest = Math.max(...THEMES.map(theme => this.vote[theme]));
            const winners = THEMES.filter(theme => this.vote[theme] === highest);
            if (highest > 0) this.floorTheme = winners.includes(this.floorTheme) ? this.floorTheme : winners[0];
            this.vote.winner = this.floorTheme;
            this.lastResult = highest > 0 ? `Sàn được chọn: ${this.floorTheme.toUpperCase()}` : 'Chưa có phiếu — giữ sàn hiện tại';
        } else if (this.activity === 'dance') {
            this.dance.status = 'results';
            this.dance.success = this.dance.count >= this.dance.target;
            this.lastResult = this.dance.success ? 'Đủ đội hình! Cả phòng cùng nhảy!' : `Có ${this.dance.count}/${this.dance.target} người cùng nhảy — thử lại nhé!`;
            if (this.dance.success) this.energy.partyUntil = now + 10000;
        }
        this.activity = '';
        this.resultUntil = now + 12000;
        if (this.auto.enabled) {
            const seconds = this.auto.minGapSeconds + Math.floor(this.random() * (this.auto.maxGapSeconds - this.auto.minGapSeconds + 1));
            this.auto.nextAt = now + seconds * 1000;
        }
        this.revision++;
    }

    tick(now = this.now(), runAuto = true) {
        if (this.activity === 'dance' && this.dance.status === 'countdown' && now >= this.dance.startsAt) {
            this.dance.status = 'running'; this.revision++;
        }
        if (this.activity && now >= this[this.activity].endsAt) this.finish(now);
        if (this.resultUntil && now >= this.resultUntil) {
            this.lastResult = ''; this.resultUntil = 0;
            for (const item of [this.battle, this.vote, this.dance]) if (item.status === 'results') item.status = 'idle';
            this.revision++;
        }
        if (runAuto && this.auto.enabled && !this.activity && this.auto.nextAt && now >= this.auto.nextAt && now >= this.resultUntil) {
            const action = this.nextAutomaticActivity();
            const target = Math.min(this.config.danceTarget, Math.max(2, this.members.size));
            this.begin(action, { target }, now);
            this.revision++;
        }
    }

    snapshot(now = this.now()) {
        return { serverTime: now, revision: this.revision, activity: this.activity, floorTheme: this.floorTheme,
            battle: { ...this.battle }, vote: { ...this.vote }, dance: { ...this.dance }, energy: { ...this.energy },
            auto: { ...this.auto },
            lastResult: this.lastResult, resultUntil: this.resultUntil, members: [...this.members.values()] };
    }
}

module.exports = { EngagementEngine, ViewerStore, THEMES, loyaltyTitle, localDay };
