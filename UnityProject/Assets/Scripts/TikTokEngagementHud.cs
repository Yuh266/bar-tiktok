using System;
using UnityEngine;

namespace TikTokLiveGame
{
    [Serializable] public class EngagementState
    {
        public long serverTime, resultUntil;
        public string activity, floorTheme, lastResult;
        public BattleState battle;
        public VoteState vote;
        public DanceState dance;
        public EnergyState energy;
        public EngagementMember[] members;
    }
    [Serializable] public class BattleState { public string status, winner; public string[] winnerUserIds; public int red, blue, redMembers, blueMembers; public long endsAt; }
    [Serializable] public class VoteState { public string status, winner; public int neon, disco, lava; public long endsAt; }
    [Serializable] public class DanceState { public string status; public int count, target; public long startsAt, endsAt; public bool success; }
    [Serializable] public class EnergyState { public int value, goal, celebrations; public long partyUntil; }
    [Serializable] public class EngagementMember { public string userId, nickname, team, loyaltyTitle; public int loyaltyDays; }

    public sealed partial class TikTokGameController
    {
        private EngagementState engagement;
        private float engagementReceivedAt;
        private long celebratedBattle;
        private long celebratedDance;
        private int celebratedEnergy = -1;
        private GUIStyle communityText, communityHeading, communityScore;

        private void ApplyEngagement(EngagementState state)
        {
            if (state == null) return;
            engagement = state;
            engagementReceivedAt = Time.unscaledTime;
            NeonDanceFloor.ApplyTheme(state.floorTheme);
            playerManager.ApplyCommunityMembers(state.members);
            if (state.energy != null && state.energy.partyUntil > state.serverTime && state.energy.celebrations != celebratedEnergy)
            {
                celebratedEnergy = state.energy.celebrations;
                NeonDanceFloor.Party((state.energy.partyUntil - state.serverTime) / 1000f);
                playerManager.DanceAll(10f);
                giftEffects.PartyBurst();
            }
            if (state.resultUntil <= state.serverTime) return;
            if (state.battle != null && state.battle.status == "results" && state.battle.endsAt != celebratedBattle)
            {
                celebratedBattle = state.battle.endsAt;
                if (state.battle.winner != "draw")
                {
                    playerManager.CelebrateWinners(state.battle.winnerUserIds);
                    giftEffects.TeamVictory(state.battle.winner, state.battle.winnerUserIds?.Length ?? 0);
                    NeonDanceFloor.Party(12f);
                }
            }
            if (state.dance != null && state.dance.success && state.dance.status == "results" && state.dance.endsAt != celebratedDance)
            {
                celebratedDance = state.dance.endsAt;
                playerManager.DanceAll(10f);
                NeonDanceFloor.Party(10f);
            }
        }

        private int CommunitySeconds(long end)
        {
            return Mathf.Max(0, Mathf.CeilToInt((end - engagement.serverTime) / 1000f - (Time.unscaledTime - engagementReceivedAt)));
        }

        private void DrawEngagementHud(float width)
        {
            if (engagement?.energy == null) return;
            communityText ??= new GUIStyle(viewerSmall) { fontSize = 12, wordWrap = true, clipping = TextClipping.Clip };
            communityHeading ??= new GUIStyle(viewerHeading) { fontSize = 11 };
            communityScore ??= new GUIStyle(viewerBody) { fontSize = 19 };
            float x = (width - 540f) * 0.5f + 10f;
            EnergyState energy = engagement.energy;
            DrawAssetPanel(new Rect(x, 74, 190, 60), brandPanel, new Color(0.2f, 0.85f, 1f));
            GUI.Label(new Rect(x + 10, 78, 175, 18), "NĂNG LƯỢNG CẢ PHÒNG", communityHeading);
            string progress = CommunitySeconds(energy.partyUntil) > 0 ? "TIỆC NEON ĐANG DIỄN RA!" : $"Còn {Mathf.Max(0, energy.goal - energy.value):N0} tim mở tiệc";
            GUI.Label(new Rect(x + 10, 98, 175, 18), progress, communityText);
            Color previous = GUI.color;
            GUI.color = new Color(0.04f, 0.12f, 0.2f); GUI.DrawTexture(new Rect(x + 10, 121, 170, 5), Texture2D.whiteTexture);
            GUI.color = new Color(0.12f, 0.85f, 1f); GUI.DrawTexture(new Rect(x + 10, 121, 170 * Mathf.Clamp01(energy.value / (float)Mathf.Max(1, energy.goal)), 5), Texture2D.whiteTexture);
            GUI.color = previous;
            if (string.IsNullOrEmpty(engagement.activity) && CommunitySeconds(engagement.resultUntil) == 0) return;
            float y = 142f;
            DrawAssetPanel(new Rect(x, y, 190, 124), brandPanel, new Color(0.65f, 0.35f, 1f));
            viewerOverlayBottom = Mathf.Max(viewerOverlayBottom, y + 124f);
            if (engagement.activity == "battle")
            {
                BattleState battle = engagement.battle;
                GUI.Label(new Rect(x + 10, y + 6, 174, 19), $"ĐỎ vs XANH · {CommunitySeconds(battle.endsAt)}s", communityHeading);
                GUI.color = new Color(1f, 0.35f, 0.4f); GUI.Label(new Rect(x + 10, y + 30, 83, 25), $"Đỏ {battle.red}", communityScore);
                GUI.color = new Color(0.25f, 0.75f, 1f); GUI.Label(new Rect(x + 97, y + 30, 86, 25), $"Xanh {battle.blue}", communityScore);
                GUI.color = previous;
                GUI.Label(new Rect(x + 10, y + 59, 171, 56), "Chat đỏ / xanh để chọn đội\n20 tim = 1 điểm\nTối đa 15 điểm tim/người", communityText);
            }
            else if (engagement.activity == "vote")
            {
                VoteState vote = engagement.vote;
                GUI.Label(new Rect(x + 10, y + 6, 174, 19), $"BÌNH CHỌN SÀN · {CommunitySeconds(vote.endsAt)}s", communityHeading);
                GUI.Label(new Rect(x + 10, y + 28, 171, 90), $"Chat 1 · Neon: {vote.neon} phiếu\nChat 2 · Disco: {vote.disco} phiếu\nChat 3 · Dung nham: {vote.lava} phiếu\nMỗi người một phiếu", communityText);
            }
            else if (engagement.activity == "dance")
            {
                DanceState dance = engagement.dance;
                int countdown = CommunitySeconds(dance.startsAt);
                GUI.Label(new Rect(x + 10, y + 6, 174, 19), "CẢ PHÒNG CÙNG NHẢY", communityHeading);
                GUI.Label(new Rect(x + 10, y + 30, 171, 29), countdown > 0 ? $"Chuẩn bị {countdown}…" : $"{dance.count}/{dance.target} người · {CommunitySeconds(dance.endsAt)}s", communityScore);
                GUI.Label(new Rect(x + 10, y + 65, 171, 48), countdown > 0 ? "Chờ hiệu lệnh để bắt đầu!" : "Chat nhảy hoặc dance\nĐủ đội hình mở tiệc ánh sáng!", communityText);
            }
            else
            {
                GUI.Label(new Rect(x + 10, y + 6, 174, 19), "KẾT QUẢ VỪA RỒI", communityHeading);
                GUI.Label(new Rect(x + 10, y + 32, 171, 80), engagement.lastResult, communityText);
            }
        }
    }
}
